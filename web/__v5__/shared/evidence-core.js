/**
 * 证据引擎 · Evidence Core
 * 前端与后端共用同一份规则：风险核验、JD 拆解、证据对照、简历自检、回答诊断。
 * 浏览器挂到 globalThis.EvidenceCore，Node 下通过 module.exports 引入。
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.EvidenceCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const LEVELS = {
    L1: { key: "L1", label: "L1 原文可核", note: "JD 或材料原句直接写明，可直接引用" },
    L2: { key: "L2", label: "L2 本人确认", note: "来自本人确认的经历，尚未挂到原件" },
    L3: { key: "L3", label: "L3 推断", note: "由关键词推断，需本人补充证据" },
  };

  const RISK_RULES = [
    { id: "deposit", level: "L1", label: "入职押金/保证金", words: ["押金", "保证金", "风险金", "入职费", "服装费", "工装费"], ask: "这笔费用是入职前必须交的吗？能否写进合同，并注明什么条件下退还？" },
    { id: "training", level: "L1", label: "培训费/招转培", words: ["培训费", "培训贷", "招转培", "先培训后上岗", "包就业", "推荐就业"], ask: "培训是否由公司出资？如果必须自费，能否提供培训合同与退费条款？" },
    { id: "loan", level: "L1", label: "贷款/分期", words: ["贷款", "分期", "助学贷", "金融方案"], ask: "这笔贷款是谁的名义？放款方是谁，年化利率多少，能否不办？" },
    { id: "agency", level: "L1", label: "中介费/内推费", words: ["中介费", "推荐费", "内推费", "信息费", "服务费"], ask: "服务费对应哪些具体交付？未入职是否全额退？" },
    { id: "idcard", level: "L1", label: "扣押证件", words: ["扣押身份证", "押身份证", "证件原件", "上交毕业证", "暂扣证件"], ask: "入职需要上交证件原件吗？能否只提供复印件并注明用途？" },
    { id: "unpaid", level: "L1", label: "无薪试岗", words: ["无薪试岗", "试岗不付", "试用期不发工资", "实习无薪", "免费试用期"], ask: "试岗期是否有工资、是否签协议？试岗期的社保如何处理？" },
    { id: "bond", level: "L1", label: "违约金/竞业", words: ["违约金", "竞业限制", "竞业协议", "服务期"], ask: "违约金的计算依据是什么？竞业限制的补偿标准与期限写明了吗？" },
    { id: "social", level: "L2", label: "社保与合同", words: ["不缴社保", "不缴纳社保", "不交社保", "社保自理", "转正后缴", "转正补缴", "劳务合同", "外包合同", "派遣"], ask: "劳动合同的签约主体是谁？社保从入职当月开始缴吗？" },
    { id: "salary", level: "L2", label: "薪资结构", words: ["底薪", "提成", "绩效占比", "综合薪资", "到手"], ask: "固定部分与浮动部分各占多少？绩效的考核口径和发放周期是什么？" },
    { id: "hours", level: "L2", label: "工时与加班", words: ["大小周", "单休", "996", "弹性工作", "随时待命", "值班"], ask: "每周实际工作几天？加班是否有调休或加班费？" },
    { id: "reimburse", level: "L2", label: "垫付与报销", words: ["垫付", "自费出差", "报销周期", "垫资"], ask: "出差和业务费用需要个人先垫付吗？报销周期多久？" },
    { id: "transfer", level: "L2", label: "调岗与派驻", words: ["服从调岗", "无条件服从", "派驻", "外派", "长期出差"], ask: "岗位与工作地点会在什么情况下调整？调整是否需要本人书面同意？" },
    { id: "hype", level: "L3", label: "营销话术", words: ["急招", "月入过万", "无需经验", "包吃住", "当天入职", "名额有限"], ask: "这个岗位目前招多少人、上一位在职者做了多久？" },
  ];

  const DOMAINS = [
    ["用户调研", "用户研究", "用户访谈", "访谈用户", "问卷"],
    ["用户反馈", "试用反馈", "反馈归纳", "整理反馈"],
    ["产品试用", "试点", "组织试用", "灰度"],
    ["原型设计", "交互原型", "原型", "线框图"],
    ["业务数据", "数据分析", "业务分析", "指标"],
    ["需求分析", "需求梳理", "需求文档", "用户需求", "PRD"],
    ["客户签约", "推进签约", "签订合同", "商务谈判"],
    ["评测设计", "离线评测", "评测方案", "标注"],
    ["用户增长", "增长实验", "拉新", "转化"],
    ["性能优化", "性能评估", "压测"],
    ["行业研究", "行业分析", "研报", "竞品"],
    ["风险评估", "风险识别", "合规"],
    ["编程开发", "软件开发", "开发模块", "接口"],
    ["社群运营", "社群活动", "内容运营"],
    ["项目管理", "排期", "跨部门", "协调"],
    ["汇报", "答辩", "路演", "演示"],
    ["店铺运营", "电商运营", "店铺日常", "活动报名", "大促", "双十一"],
    ["选品", "上架", "商品上架", "库存"],
    ["投放", "广告投放", "信息流", "投流", "ROI"],
    ["达人", "KOL", "KOC", "内容排期", "达人资源"],
    ["素材", "内容素材", "图文", "短视频"],
    ["品牌方", "客户对接", "对接品牌方", "商务", "结算"],
    ["复盘", "数据复盘", "效果复盘", "月度复盘"],
    ["客服", "售后", "客诉"],
  ];

  const cleaner = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

  function sentences(text) {
    return String(text || "")
      .split(/[\n。；;！!？?]/)
      .map(cleaner)
      .filter((s) => s.length > 1);
  }

  function hasMetric(text) {
    return /(\d+(\.\d+)?\s*(%|％|个|份|人|次|天|周|月|年|万|k|K|倍|条|场|页))|(\d+(\.\d+)?)/.test(
      String(text || ""),
    );
  }

  /** 风险扫描：命中的每一处都保留原句，便于回溯 */
  function scanRisk(text) {
    const list = sentences(text);
    const hits = [];
    for (const rule of RISK_RULES) {
      const found = list.find((s) => rule.words.some((w) => s.includes(w)));
      if (!found) continue;
      // 一句话里常混着多条条款，这里收窄到命中的那半句，避免引用过长
      const clause =
        found
          .split(/[，,、]/)
          .map((s) => s.trim())
          .find((s) => rule.words.some((w) => s.includes(w))) || found;
      hits.push({
        id: rule.id,
        level: rule.level,
        label: rule.label,
        quote: clause,
        ask: rule.ask,
      });
    }
    const counts = { L1: 0, L2: 0, L3: 0 };
    hits.forEach((h) => (counts[h.level] += 1));
    return {
      hits,
      counts,
      total: hits.length,
      verdict:
        counts.L1 > 0
          ? "存在高确定风险信号，建议先核实再投递"
          : counts.L2 > 0
            ? "存在需要核实的条款，建议面试时逐条问清"
            : counts.L3 > 0
              ? "命中营销话术，注意辨别岗位真实性"
              : "未命中已知风险词，仍建议核实合同主体与社保",
    };
  }

  /** JD 拆解：按行切分，保留原句作为出处 */
  function parseJD(text) {
    const lines = String(text || "")
      .split(/\r?\n/)
      .map((s) => s.replace(/^\s*(?:[-•·]|\d+[.、)])\s*/, "").trim())
      .filter(Boolean);
    const isBonus = (s) => /加分|优先|更佳|者优先|有…?经验优先/.test(s);
    const isDuty = (s) => /负责|参与|协助|推进|维护|支持|完成/.test(s);
    /* 小标题（岗位职责：/任职要求：）和风险条款（试用期不缴社保）不是「要求」，不混进对照表 */
    const isHeader = (s) =>
      /^[^，。；]{2,10}[：:]$/.test(s) ||
      /^(岗位职责|工作职责|职位描述|岗位描述|任职要求|岗位要求|任职资格|其他说明|其他|福利待遇|福利|薪资待遇|工作地点|工作内容)/.test(s);
    const isRisk = (s) => (scanRisk(s).hits || []).length > 0;
    const requirements = lines.filter(
      (s) => !isBonus(s) && !isHeader(s) && !isRisk(s) && s.length <= 90 && s.length > 3,
    );
    return {
      requirements: requirements.map((s) => ({ text: s, source: s })),
      bonus: lines.filter(isBonus),
      duties: lines.filter(isDuty),
      raw: lines,
    };
  }

  function quoteOf(fact) {
    return [fact.action, fact.result, fact.role, fact.description, fact.text]
      .filter((s) => typeof s === "string" && s.trim())
      .join("；");
  }

  /** 一条要求 → 一条证据，带等级 */
  function matchRequirement(requirement, experiences) {
    const pool = (experiences || []).filter(
      (f) => f && !["待核实", "待确认", "待核对"].includes(f.status) && f.confirmed !== false,
    );
    const parts = DOMAINS.filter((set) => set.some((w) => requirement.includes(w))).flat();
    let best = null;
    for (const fact of pool) {
      const quote = quoteOf(fact);
      if (!quote) continue;
      let kind = null;
      if (quote.includes(requirement)) kind = "direct";
      else if (parts.some((p) => quote.includes(p))) kind = "partial";
      if (!kind) continue;
      const hasFile = !!fact.sourceId;
      const entry = {
        requirement,
        kind,
        quote,
        title: fact.title || "个人经历",
        source: typeof fact.source === "object" ? fact.source?.name : fact.source || "本人录入",
        evidenceId: fact.id || "",
        level: kind === "direct" && hasFile ? "L1" : kind === "direct" ? "L2" : "L3",
      };
      if (kind === "direct" && hasFile) return entry;
      best = best || entry;
    }
    return (
      best || {
        requirement,
        kind: "unknown",
        quote: "尚未找到对应的已确认经历。",
        title: "",
        source: "",
        evidenceId: "",
        level: "L3",
      }
    );
  }

  function matchAll(requirements, experiences) {
    const rows = (requirements || []).map((r) =>
      matchRequirement(typeof r === "string" ? r : r.text, experiences),
    );
    const counts = { direct: 0, partial: 0, unknown: 0 };
    const levels = { L1: 0, L2: 0, L3: 0 };
    rows.forEach((r) => {
      counts[r.kind] = (counts[r.kind] || 0) + 1;
      levels[r.level] += 1;
    });
    const total = rows.length || 1;
    return {
      rows,
      counts,
      levels,
      coverage: (counts.direct + 0.5 * counts.partial) / total,
      gaps: rows.filter((r) => r.kind !== "direct"),
    };
  }

  /** 简历自检：段落是否可回溯、是否缺量化、JD 是否覆盖 */
  function auditResume(blocks, requirements, experiences) {
    const list = blocks || [];
    const bodyBlocks = list.filter((b) => b.type === "body" || b.type === "heading");
    const noSource = bodyBlocks.filter((b) => !b.source && cleaner(b.text));
    const noMetric = bodyBlocks.filter((b) => !hasMetric(b.text) && cleaner(b.text).length > 8);
    const requirementRows = (requirements || []).map((r) => {
      const text = typeof r === "string" ? r : r.text;
      const covered = bodyBlocks.some((b) => {
        const t = cleaner(b.text);
        const parts = DOMAINS.filter((set) => set.some((w) => text.includes(w))).flat();
        const clauses = text
          .split(/[，,、；;：:（）()]/)
          .map((s) => s.trim())
          .filter((s) => s.length >= 4);
        return t.includes(text) || clauses.some((c) => t.includes(c.slice(0, 12))) || parts.some((p) => t.includes(p));
      });
      return { text, covered };
    });
    const covered = requirementRows.filter((r) => r.covered).length;
    const total = requirementRows.length || 1;
    return {
      blocks: list.length,
      noSource,
      noMetric,
      requirementRows,
      uncovered: requirementRows.filter((r) => !r.covered),
      coverage: covered / total,
      ready: !noSource.length && !noMetric.length && covered === (requirementRows.length || 0),
    };
  }

  const STAR_HINTS = {
    S: ["当时", "背景", "项目", "团队", "阶段", "期间", "实习", "课程", "社团", "担任", "所在", "一次"],
    T: ["目标", "负责", "需要", "要求", "要解决", "任务", "指标"],
    A: ["我", "梳理", "搭建", "推动", "分析", "设计", "跟进", "协调", "组织", "落地", "优化"],
    R: ["结果", "最终", "提升", "降低", "交付", "上线", "拿到", "完成", "%", "倍", "压到", "缩短", "节省", "增长", "翻倍"],
  };

  /** 回答诊断：STAR 四要素 + 量化 + 追问预测 */
  function diagnoseAnswer(question, answer) {
    const text = cleaner(answer);
    const star = {};
    for (const [key, hints] of Object.entries(STAR_HINTS)) star[key] = hints.some((h) => text.includes(h));
    const metric = hasMetric(text);
    const length = text.length;
    const fixes = [];
    if (!star.S) fixes.push("补一句背景：这件事发生在什么项目或团队里，规模多大。");
    if (!star.T) fixes.push("补一句目标：你当时要解决的具体问题或达成什么指标。");
    if (!star.A) fixes.push("把「我们」改成「我」：写清楚你个人动手做了哪三步。");
    if (!star.R) fixes.push("补结果：交付了什么、指标变化多少、谁在使用。");
    if (!metric) fixes.push("给一个数字：人数、时长、条数、百分比，任选其一。");
    if (length < 80) fixes.push("回答偏短，面试官容易追问细节，建议补到 120–200 字。");
    if (length > 400) fixes.push("回答偏长，先给结论再展开，控制在 60 秒内说完。");

    const noun =
      text.match(/(用户|需求|原型|数据|访谈|项目|活动|渠道|流程|方案|指标|客户)/)?.[0] || "这件事";
    const followUps = [
      `你提到${noun}，具体是怎么推进的？中间卡在哪一步？`,
      "如果重来一次，你会改哪一处？为什么？",
      "这个结果里有多少是你个人贡献的，怎么衡量？",
      "当时有没有其他方案？为什么选了这个？",
      "失败了怎么办？你准备了什么退路？",
    ];
    const starScore = Object.values(star).filter(Boolean).length;
    return {
      star,
      metric,
      starScore,
      followUps: followUps.slice(0, 3),
      fixes,
      score: Math.round((starScore / 4) * 60 + (metric ? 20 : 0) + (length >= 80 && length <= 400 ? 20 : 0)),
      question,
      answer,
      at: Date.now(),
    };
  }

  /** 经历库体检 */
  function libraryAudit(materials, experiences) {
    const mats = materials || [];
    const exps = experiences || [];
    const verified = mats.filter((m) => m.status === "已核对").length;
    const sourced = exps.filter((e) => e.sourceId).length;
    const metric = exps.filter((e) => hasMetric(quoteOf(e))).length;
    return {
      materials: mats.length,
      verifiedRate: mats.length ? verified / mats.length : 0,
      experiences: exps.length,
      sourcedRate: exps.length ? sourced / exps.length : 0,
      metricRate: exps.length ? metric / exps.length : 0,
      pending: mats.filter((m) => m.status !== "已核对"),
      sourceless: exps.filter((e) => !e.sourceId),
      vague: exps.filter((e) => !hasMetric(quoteOf(e))),
    };
  }

  /* ==================== v3：证据台账 / 匹配雷达 / 面试复盘 ==================== */

  /** 来源等级：A 原文、B 二手材料、C 通用经验、D 无来源 */
  const SOURCE_TIERS = {
    A: { label: "原文", hint: "可在 JD 或原件里逐字指到" },
    B: { label: "二手", hint: "来自公司陈述、公开资料，需再核对" },
    C: { label: "通用", hint: "经验性问题，不代表这家公司" },
    D: { label: "无来源", hint: "没有任何出处，只能当假设" },
  };

  /** 面经题库：每条带出处与核实等级，用来做「可信面经」而不是随机刷题 */
  const QUESTION_BANK = [
    { q: "介绍一下你最有成就感的一段经历", tier: "C", source: "通用面试题库", dim: "自我陈述" },
    { q: "说一次你和别人意见不一致的经历", tier: "C", source: "通用面试题库", dim: "协作" },
    { q: "讲一次失败，你学到了什么", tier: "C", source: "通用面试题库", dim: "反思" },
    { q: "你为什么选择我们公司", tier: "B", source: "公开面经合集（需自行核对是否同岗位）", dim: "动机" },
    { q: "这个岗位的日常你会怎么安排", tier: "B", source: "公开面经合集（互联网运营方向）", dim: "岗位理解" },
    { q: "你还有什么想问我们的", tier: "C", source: "通用面试题库", dim: "反问" },
  ];

  /** 一页式风险卡片要用的三句话：按等级挑最该问的 */
  function topAsks(rows) {
    const order = ["L1", "L2", "L3"];
    const picked = [];
    for (const lv of order) {
      const hit = rows.find((r) => r.type === "risk" && r.level === lv);
      if (hit) picked.push({ level: lv, title: hit.title, ask: hit.ask, quote: hit.quote });
    }
    return picked;
  }

  /**
   * 功能 1 的底座：把 JD、公司材料、简历缺口汇成一本证据台账。
   * 每行都必须带 quote 与 source，覆盖率就是「能指回出处」的比例。
   */
  function buildLedger(input) {
    const jd = String(input?.jdText || "");
    const company = String(input?.companyText || "");
    const rows = [];

    (scanRisk(jd).hits || []).forEach((h, i) => {
      rows.push({
        id: "r" + i,
        type: "risk",
        level: h.level,
        title: h.label,
        quote: h.quote,
        source: "JD 原文",
        sourceTier: "A",
        ask: h.ask,
        covered: true,
      });
    });

    sentences(company)
      .filter((s) => /[\d]|承诺|保证|包|预计|计划|规模|人数|亿元|万|上市|融资/.test(s))
      .forEach((s, i) => {
        rows.push({
          id: "c" + i,
          type: "claim",
          level: "L3",
          title: "公司陈述",
          quote: s.trim(),
          source: "公司材料 · 第 " + (i + 1) + " 句",
          sourceTier: "B",
          ask: "这条有没有书面出处？能否给一份可核对的材料？",
          covered: true,
        });
      });

    (input?.gaps || []).forEach((g, i) => {
      rows.push({
        id: "g" + i,
        type: "gap",
        level: g.level || "L3",
        title: "证据缺口",
        quote: g.text || "",
        source: g.source || "经历库",
        sourceTier: g.sourceTier || "D",
        ask: "这一段有没有具体例子或数字可以补？",
        covered: !!g.covered,
      });
    });

    const byLevel = { L1: 0, L2: 0, L3: 0 };
    rows.forEach((r) => {
      if (r.type === "risk") byLevel[r.level] = (byLevel[r.level] || 0) + 1;
    });
    const tiers = { A: 0, B: 0, C: 0, D: 0 };
    rows.forEach((r) => {
      tiers[r.sourceTier] = (tiers[r.sourceTier] || 0) + 1;
    });
    return {
      rows,
      total: rows.length,
      coveredCount: rows.filter((r) => r.covered).length,
      coverage: rows.length ? rows.filter((r) => r.covered).length / rows.length : 0,
      byLevel,
      tiers,
      asks: topAsks(rows),
    };
  }

  /**
   * 功能 2 的底座：五个维度，每维都带一句依据，避免「雷达图好看但没理由」。
   */
  function radarDims(input) {
    const blocks = input?.blocks || [];
    const reqs = (input?.requirements || []).map((r) => (typeof r === "string" ? r : r.text));
    const mats = input?.materials || [];
    const audit = auditResume(blocks, reqs);
    const body = blocks.filter((b) => (b.type === "body" || b.type === "heading") && cleaner(b.text));
    const withSrc = body.filter((b) => b.source || b.sourceId || b.materialId).length;
    const withNum = body.filter((b) => hasMetric(b.text)).length;
    const verified = mats.filter((m) => m.status === "已核对").length;
    const longOnes = body.filter((b) => cleaner(b.text).length > 60).length;
    const dims = [
      {
        dim: "JD 覆盖",
        score: audit.coverage,
        basis: audit.requirementRows.filter((r) => r.covered).length + " / " + (reqs.length || 0) + " 条要求已写进简历",
      },
      {
        dim: "证据厚度",
        score: body.length ? withSrc / body.length : 0,
        basis: withSrc + " / " + body.length + " 段能指回原件",
      },
      {
        dim: "量化程度",
        score: body.length ? withNum / body.length : 0,
        basis: withNum + " / " + body.length + " 段带数字",
      },
      {
        dim: "材料可信",
        score: mats.length ? verified / mats.length : 0,
        basis: "材料已核对 " + verified + " / " + mats.length + " 份",
      },
      {
        dim: "表达收敛",
        score: body.length ? 1 - longOnes / body.length : 0,
        basis: longOnes ? longOnes + " / " + body.length + " 段超过 60 字，口述容易散" : "全部 " + body.length + " 段都在一句话内，口述不易散",
      },
    ];
    const overall = dims.reduce((s, d) => s + d.score, 0) / dims.length;
    return { dims, overall, audit };
  }

  /** 咨询题目的核实等级：JD 里出现的算 A，面经库里的按库里等级，其余 C */
  function gradeQuestion(question, requirements) {
    const q = String(question || "");
    if ((requirements || []).some((r) => q.includes(typeof r === "string" ? r : r.text)))
      return { tier: "A", source: "该岗位 JD 原文要求", note: "题面直接来自岗位要求" };
    const bank = QUESTION_BANK.find((b) => b.q === q || q.includes(b.q.slice(0, 6)));
    if (bank) return { tier: bank.tier, source: bank.source, note: "来自面经库，需自行核对是否同岗位" };
    return { tier: "C", source: "通用面试题库", note: "经验性问题，不代表这家公司" };
  }

  /** STAR 改写：把用户原话按四格重排，缺的格子给可填的提示，不替他编事实 */
  function rewriteStar(answer) {
    const list = sentences(answer);
    /* 按句序定位：背景在最前，结果通常在最后，四格不重复用同一句 */
    const has = (s, key) => STAR_HINTS[key].some((k) => s.includes(k));
    const used = {};
    const take = (key, from) => {
      for (let i = Math.max(0, from); i < list.length; i++) {
        if (!used[i] && has(list[i], key)) {
          used[i] = 1;
          return i;
        }
      }
      return -1;
    };
    const sIdx = take("S", 0);
    const tIdx = take("T", sIdx >= 0 ? sIdx + 1 : 0);
    const aIdx = take("A", Math.max(sIdx, tIdx) + 1);
    let rIdx = -1;
    for (let i = list.length - 1; i >= 0; i--) {
      if (!used[i] && has(list[i], "R")) {
        rIdx = i;
        used[i] = 1;
        break;
      }
    }
    const pick = (i) => (i >= 0 ? list[i] : "");
    const s = pick(sIdx);
    const t = pick(tIdx);
    const a = pick(aIdx);
    const r = pick(rIdx);
    const parts = [
      { key: "情境", text: s || "【待补】当时在什么项目/团队、什么阶段" },
      { key: "任务", text: t || "【待补】你要解决的具体问题与衡量标准" },
      { key: "行动", text: a || "【待补】你本人做了什么，分几步" },
      { key: "结果", text: r || "【待补】结果与可核对的数字（人数、时长、比例）" },
    ];
    const missing = parts.filter((p) => p.text.startsWith("【待补】")).map((p) => p.key);
    const text = parts.map((p) => p.key + "：" + p.text).join("\n");
    return { parts, missing, text };
  }

  /**
   * 功能 3：逐题复盘。返回诊断、改写、追问、核实等级，
   * 并把「改写后的预估分」明确标成预估，不冒充实测。
   */
  function reviewAnswer(input) {
    const question = String(input?.question || "");
    const answer = String(input?.answer || "");
    const base = diagnoseAnswer(question, answer);
    const star = rewriteStar(answer);
    const grade = gradeQuestion(question, input?.requirements || []);
    const missingCount = star.missing.length;
    /* 预估只增不减：基数不低于当前分，缺格与缺数字才加分，封顶 100 */
    const estimate = Math.min(
      100,
      Math.max(base.score, base.score + missingCount * 8 + (base.metric ? 0 : 6)),
    );
    return {
      question,
      answer,
      grade,
      score: base.score,
      star: base.star,
      metric: base.metric,
      fixes: base.fixes,
      followUps: base.followUps,
      rewrite: star,
      estimate,
      gaps: missingCount,
    };
  }

  /** 核实等级分布，给「可信面经」一个可看的形状 */
  function credibilityMix(records) {
    const counts = { A: 0, B: 0, C: 0, D: 0 };
    (records || []).forEach((r) => {
      const tier = r?.grade?.tier || "D";
      counts[tier] = (counts[tier] || 0) + 1;
    });
    const total = (records || []).length || 1;
    return Object.keys(counts).map((k) => ({
      tier: k,
      label: SOURCE_TIERS[k].label,
      count: counts[k],
      share: counts[k] / total,
    }));
  }

  return {
    LEVELS,
    RISK_RULES,
    DOMAINS,
    scanRisk,
    parseJD,
    matchRequirement,
    matchAll,
    auditResume,
    diagnoseAnswer,
    libraryAudit,
    hasMetric,
    sentences,
    SOURCE_TIERS,
    QUESTION_BANK,
    buildLedger,
    radarDims,
    gradeQuestion,
    rewriteStar,
    reviewAnswer,
    credibilityMix,
  };
});
