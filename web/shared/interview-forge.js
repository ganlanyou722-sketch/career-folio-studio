/**
 * 面试工坊 · Interview Forge（版本 7）
 * 与 interview 页面共用同一份规则：题库生成、三分钟故事线编译、教练状态机与打分。
 * 纯函数、无依赖、确定性输出；浏览器挂到 globalThis.InterviewForge，Node 下 module.exports。
 *
 * 设计约束（对应 PRD 4.2）：
 * 1. 题目由「事实 × 岗位要求」推出，同一输入两次生成完全一致，便于跨轮比较。
 * 2. 故事线只重排事实字段，不生成用户没说过的事实；缺字段一律写【待补：…】。
 * 3. 打分必须附原文引用，引用不是逐字稿子串就丢弃，该维度不给分。
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.InterviewForge = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const VERSION = "7.0";
  const CHARS_PER_SEC = 4.5; // 中文口述约 4–4.5 字/秒，用作预算折算
  const ANSWER_BUDGET_SEC = 180;
  const MAX_FOLLOW_UPS = 2;
  const SESSION_BUDGET_SEC = 45 * 60;
  const MAX_ROUNDS = 24;

  const CATEGORIES = [
    { key: "fact", label: "事实核验", quota: 2, intent: "这件事到底是不是你做的" },
    { key: "depth", label: "深度追问", quota: 3, intent: "你是执行还是思考" },
    { key: "collab", label: "协作冲突", quota: 2, intent: "能不能共事" },
    { key: "result", label: "结果量化", quota: 2, intent: "结果是不是真的" },
    { key: "transfer", label: "迁移假设", quota: 1, intent: "能不能复用" },
  ];

  const BARS = {
    L1: {
      key: "L1",
      label: "L1 泛泛而谈",
      from: 0,
      to: 52,
      describe: "只说做过什么方向，没有具体动作、口径或结果。",
      next: "先把「我做了什么」写成三步动作。",
    },
    L2: {
      key: "L2",
      label: "L2 有事实无量化",
      from: 52,
      to: 68,
      describe: "动作说得清，但结果没有数字或没有基线。",
      next: "补一个数字，并说明之前是多少。",
    },
    L3: {
      key: "L3",
      label: "L3 事实加量化",
      from: 68,
      to: 82,
      describe: "有具体动作、有量化结果，归因基本清楚。",
      next: "补一次取舍：当时还考虑过什么方案。",
    },
    L4: {
      key: "L4",
      label: "L4 再加取舍与复盘",
      from: 82,
      to: 101,
      describe: "动作、量化、取舍、复盘齐全，能指回具体证据。",
      next: "练迁移：换个体量或约束还成不成立。",
    },
  };

  const STORY_SEGMENTS = [
    { key: "hook", label: "钩子", start: 0, end: 15, need: "result", hint: "一句话说结果与量级" },
    { key: "context", label: "背景与目标", start: 15, end: 45, need: "scene", hint: "约束是什么，难度在哪" },
    { key: "action", label: "动作与取舍", start: 45, end: 90, need: "action", hint: "2–3 个决策点，强调我" },
    { key: "result", label: "结果与归因", start: 90, end: 150, need: "result", hint: "基线→结果，团队与个人分开" },
    { key: "reflect", label: "反思与迁移", start: 150, end: 180, need: "reflection", hint: "学到什么，下次怎么改" },
  ];

  const FILLERS = ["呃", "嗯", "那个", "然后", "就是", "其实", "怎么说", "对吧", "的话"];
  const BONUS_RE = /加分|优先|更佳|优先考虑|有.{0,6}经验者优先/;
  const MUST_RE = /负责|要求|熟悉|精通|掌握|具备|至少|必须|能独立|独立完成|了解/;
  const STAR_HINTS = {
    S: ["当时", "背景", "项目", "团队", "阶段", "期间", "实习", "课程", "社团", "所在", "一次", "负责"],
    T: ["目标", "要解决", "需要", "指标", "任务", "要求", "为了"],
    A: ["我", "梳理", "搭建", "推动", "分析", "设计", "跟进", "协调", "组织", "落地", "优化", "改", "做"],
    R: ["结果", "最终", "提升", "降低", "交付", "上线", "完成", "缩短", "增长", "节省", "拿到", "从", "到"],
  };

  /* ---------------- 基础工具 ---------------- */

  const clean = (s) => String(s == null ? "" : s).replace(/\s+/g, " ").trim();

  function sentences(text) {
    return String(text || "")
      .split(/[\n。；;！!？?]/)
      .map(clean)
      .filter((s) => s.length > 1);
  }

  function hasMetric(text) {
    return /(\d+(\.\d+)?\s*(%|％|个|份|人|次|天|周|月|年|万|亿|k|K|倍|条|场|页|小时|分钟|元))|(\d+(\.\d+)?)/.test(
      String(text || ""),
    );
  }

  function countNumbers(text) {
    return (String(text || "").match(/\d+(\.\d+)?/g) || []).length;
  }

  /** 关键词：中文按标点切段后取 2–6 字词块，再补二元组，用于轻量语义重叠判断 */
  function terms(text) {
    const source = clean(text);
    const chunks = source.split(/[\s，,、。；;：:（）()【】「」“”"\/|]+/).filter((s) => s.length >= 2);
    const out = new Set();
    chunks.forEach((c) => {
      if (c.length <= 6) out.add(c);
      else {
        for (let i = 0; i + 2 <= c.length; i++) out.add(c.slice(i, i + 2));
      }
    });
    return [...out];
  }

  function overlap(a, b) {
    const bt = terms(b);
    const at = terms(a);
    let hit = 0;
    at.forEach((t) => {
      if (bt.some((x) => x === t || x.includes(t) || t.includes(x))) hit += 1;
    });
    return hit;
  }

  /** 引用必须是逐字稿的真实子串，否则视为编造 */
  function verifyQuote(quote, source) {
    const q = clean(quote);
    const s = String(source || "");
    if (!q || !s) return false;
    return s.replace(/\s+/g, " ").includes(q);
  }

  function barsLevel(score) {
    const s = Number(score) || 0;
    if (s >= BARS.L4.from) return BARS.L4;
    if (s >= BARS.L3.from) return BARS.L3;
    if (s >= BARS.L2.from) return BARS.L2;
    return BARS.L1;
  }

  /* ---------------- 事实与要求归一化 ---------------- */

  function normRequirements(list) {
    return (list || [])
      .map((r) => (typeof r === "string" ? r : (r && (r.text || r.quote)) || ""))
      .map(clean)
      .filter((t) => t.length >= 3)
      .map((text, i) => ({
        id: "req" + i,
        text,
        source: "JD 原文",
        must: !BONUS_RE.test(text) && MUST_RE.test(text),
      }));
  }

  function normFacts(list) {
    return (list || [])
      .filter((f) => f && clean(f.title || f.action || f.text))
      .map((f, i) => ({
        id: String(f.id != null ? f.id : "f" + i),
        title: clean(f.title || "个人经历"),
        scene: clean(f.scene || f.context || f.role || f.situation || ""),
        action: clean(f.action || f.text || ""),
        result: clean(f.result || ""),
        reflection: clean(f.reflection || f.reflect || ""),
        attribution: clean(f.attribution || ""),
        hasSource: !!(f.sourceId || f.source || f.experienceId),
        sample: clean(f.sample || f.voice || ""),
      }));
  }

  function relevanceOf(fact, requirements) {
    const body = [fact.title, fact.scene, fact.action, fact.result].join("；");
    let score = 0;
    requirements.forEach((r) => {
      if (body.includes(r.text)) score += 6;
      else {
        const hit = overlap(body, r.text);
        if (hit >= 3) score += 4;
        else if (hit >= 2) score += 2;
        else if (hit >= 1) score += 1;
      }
    });
    if (hasMetric([fact.action, fact.result].join(" "))) score += 2;
    if (fact.hasSource) score += 1;
    return score;
  }

  function supports(fact, requirement) {
    const body = [fact.title, fact.scene, fact.action, fact.result].join("；");
    if (body.includes(requirement.text)) return true;
    return overlap(body, requirement.text) >= 2;
  }

  /* ---------------- 题库 ---------------- */

  /** 每类题型的追问树与红旗答案，按缺口类型挂载，供教练选择追问 */
  const PROBE_TREE = {
    fact: [
      { level: 1, gap: "ownership", question: "这段里哪些是你独立完成的？哪些是别人做的？" },
      { level: 2, gap: "ownership", question: "如果只保留你个人的贡献，你能说清自己交付了哪一件东西吗？" },
    ],
    depth: [
      { level: 1, gap: "tradeoff", question: "当时还考虑过别的方案吗？为什么没选？" },
      { level: 2, gap: "tradeoff", question: "如果时间少一半，你会先砍掉哪一步？" },
    ],
    collab: [
      { level: 1, gap: "conflict", question: "对方当时为什么不同意？你用什么说服了他？" },
      { level: 2, gap: "conflict", question: "如果他还是不同意，你会怎么推进？" },
    ],
    result: [
      { level: 1, gap: "metric", question: "这个数字是怎么算出来的？之前是多少？" },
      { level: 2, gap: "metric", question: "这里面有多少能算成你个人的贡献，怎么衡量？" },
    ],
    transfer: [
      { level: 1, gap: "transfer", question: "换到我们公司这个场景，你会改哪一步？" },
      { level: 2, gap: "transfer", question: "如果团队只有两个人，这套做法还成立吗？" },
    ],
  };

  const RED_FLAGS = {
    fact: ["「都是我们做的」——归属不清，面试官会默认你不是主力。", "只讲团队成果，不讲自己交付了什么。"],
    depth: ["只说「领导让我这么做」——看不出判断，只看到执行。", "把方案讲成结果，跳过取舍过程。"],
    collab: ["把冲突讲成对方的问题——会被判断为不好共事。", "说「没有分歧」——通常意味着没参与决策。"],
    result: ["数字没有基线——「提升了 30%」但不说从多少到多少。", "把团队结果直接算成个人结果。"],
    transfer: ["直接说「照搬就行」——看不出边界感。", "答成空泛的方法论，落不到具体动作。"],
  };

  const TOKENS = {
    fact: ["我", "独立", "负责", "亲手", "自己"],
    depth: ["因为", "对比", "备选", "评估", "取舍", "成本"],
    collab: ["分歧", "不同意", "沟通", "说服", "协调", "让步", "推动"],
    result: ["%", "倍", "从", "到", "提升", "降低", "基线", "口径"],
    transfer: ["如果", "假设", "换成", "调整", "迁移", "规模"],
  };

  function skeletonFor(category, fact, requirement) {
    const t = fact.title;
    const r = requirement ? requirement.text : "";
    const map = {
      fact: {
        s30: "我在「" + t + "」里负责 XX 这一步，交付了 XX。",
        s60: "在「" + t + "」里，我负责的是 XX 这一段，具体做了两件事：一是 XX，二是 XX；" + (r ? "和岗位要求的「" + short(r) + "」直接相关。" : ""),
        s120: "背景是 XX；我的任务是 XX；我自己的动作有三步：XX、XX、XX；交付物是 XX。团队里其他人负责的是 XX，这部分不算我的贡献。",
      },
      depth: {
        s30: "当时我选 A，因为 XX。",
        s60: "当时有两个方案：A 和 B。选 A 的原因是 XX（约束是 XX）；代价是 XX，所以我补了一步 XX。",
        s120: "先说我看到的约束：时间 XX、人手 XX、数据 XX。方案 A 的优点是 XX，风险是 XX；方案 B 反过来。我判断 XX 更关键，所以选了 A，并用 XX 兜住它的风险。如果重来，我会先 XX。",
      },
      collab: {
        s30: "有一次我和 XX 在 XX 上不一致，最后按 XX 定的。",
        s60: "分歧点是 XX：他认为 XX，我认为 XX。我做的是把两种方案的影响列出来，用 XX 的数据对齐，最后达成 XX。",
        s120: "分歧的背景是 XX；双方立场分别是 XX 和 XX；我做的三件事是 XX、XX、XX；结果是 XX，之后我们的协作方式改成了 XX。",
      },
      result: {
        s30: "这件事的结果是 XX，从 XX 变成 XX。",
        s60: "结果是 XX：基线是 XX，之后是 XX，口径是 XX。其中 XX 能算我的贡献，XX 是团队一起的。",
        s120: "结果分三层：直接产出是 XX；指标变化是从 XX 到 XX，按 XX 口径算；间接影响是 XX。归因上，我负责的是 XX，所以这部分算我的；XX 属于团队。验证方式是 XX。",
      },
      transfer: {
        s30: "换到这个岗位，我会先改 XX。",
        s60: "这套做法在这个岗位能用的部分是 XX，要改的是 XX，因为 XX 不一样；我会先做 XX 验证。",
        s120: "拆开看：方法和约束哪部分可迁移——XX 可以，XX 不行；原因是这个岗位的 XX 不同；所以我会保留 XX，替换 XX，先用一个小范围验证 XX，再决定要不要全量。",
      },
    };
    return map[category];
  }

  const short = (s) => (clean(s).length > 24 ? clean(s).slice(0, 24) + "…" : clean(s));

  function buildQuestion(category, index, fact, requirement, extra) {
    const cat = CATEGORIES.find((c) => c.key === category);
    const t = fact ? fact.title : "目标岗位";
    const req = requirement ? requirement.text : "";
    const id = category + "#" + index + (fact ? ":" + fact.id : "");
    const base = {
      id,
      category,
      categoryLabel: cat.label,
      intent: cat.intent,
      budgetSec: ANSWER_BUDGET_SEC,
      maxFollowUps: MAX_FOLLOW_UPS,
      probes: PROBE_TREE[category] || [],
      redFlags: RED_FLAGS[category] || [],
      evidenceTokens: TOKENS[category] || [],
      bars: {
        L1: BARS.L1.describe,
        L2: BARS.L2.describe,
        L3: BARS.L3.describe,
        L4: BARS.L4.describe,
      },
      jdLink: requirement
        ? { requirement: req, must: requirement.must, source: requirement.source }
        : { requirement: "", must: false, source: "未提供岗位要求" },
      factLink: fact
        ? { factId: fact.id, title: fact.title, field: "action", anchor: clean(fact.action).slice(0, 60) }
        : null,
      answerSkeleton: skeletonFor(category, fact || { title: t }, requirement),
      unsupported: !!(extra && extra.unsupported),
    };
    const q = clean(req) || t;
    const texts = {
      fact: "在「" + t + "」里，和「" + short(q) + "」相关的那部分，具体是你做的哪几步？",
      depth: (req ? "关于「" + short(q) + "」，" : "") + "在「" + t + "」里你当时为什么选这个做法？还考虑过什么？",
      collab: "在「" + t + "」推进过程中，你和谁意见不一致？最后怎么定的？",
      result: "「" + t + "」的结果怎么验证？有多少是你个人的贡献？",
      transfer: "把「" + t + "」的做法换到我们这边的场景，你会改哪一步？",
    };
    base.question = extra && extra.question ? extra.question : texts[category];
    base.whyAsked = extra && extra.why
      ? extra.why
      : req
        ? "题面来自岗位原句「" + short(req) + "」，面试官会用它验证这段经历是否对得上岗位。"
        : "岗位描述里没有可直接对应的原句，面试官会用这类问题判断经历与职责的关联。";
    return base;
  }

  /**
   * 生成题库：五类配额共 10 题；must-have 缺口另出「缺口题」（标 unsupported，计入覆盖但不计入基准 10 题）。
   */
  function buildQuestionPack(input) {
    const role = clean(input && input.role) || "目标岗位";
    const company = clean(input && input.company) || "目标公司";
    const requirements = normRequirements(input && input.requirements);
    const facts = normFacts(input && input.facts);
    const ranked = facts
      .map((f) => Object.assign({}, f, { relevance: relevanceOf(f, requirements) }))
      .sort((a, b) => b.relevance - a.relevance || String(a.id).localeCompare(String(b.id)));

    const reqRows = requirements.map((r) => {
      const backed = ranked.filter((f) => supports(f, r));
      return Object.assign({}, r, { factIds: backed.map((f) => f.id), supported: backed.length > 0 });
    });

    const questions = [];
    const usedFact = {};
    const nextFact = () => ranked.find((f) => !usedFact[f.id]) || ranked[0] || null;
    const bestReqFor = (fact) => {
      if (!fact) return requirements[0] || null;
      let best = null;
      let bestHit = -1;
      requirements.forEach((r) => {
        const hit = overlap([fact.title, fact.action, fact.result].join("；"), r.text);
        if (hit > bestHit) {
          bestHit = hit;
          best = r;
        }
      });
      return best;
    };

    CATEGORIES.forEach((cat) => {
      for (let i = 0; i < cat.quota; i++) {
        const fact = ranked.length ? nextFact() : null;
        if (fact) usedFact[fact.id] = true;
        questions.push(buildQuestion(cat.key, i, fact, fact ? bestReqFor(fact) : requirements[0] || null));
      }
    });

    /* 缺口题：must-have 没有任何事实支撑，单独出题并标高危，让用户至少先补口径 */
    const gapReqs = reqRows.filter((r) => r.must && !r.supported).slice(0, 2);
    gapReqs.forEach((r, i) => {
      questions.push(
        buildQuestion("fact", CATEGORIES[0].quota + i, ranked[0] || null, r, {
          unsupported: true,
          question: "岗位要求「" + short(r.text) + "」，你目前还没有能对上号的事实。你打算用哪段经历回答？",
          why: "这条是必备要求，但经历库里找不到对应事实，面试时几乎一定会被问；先想好口径，或者补一条事实。",
        }),
      );
    });

    const coverageRows = reqRows.map((r) => ({
      requirement: r.text,
      must: r.must,
      supported: r.supported,
      factIds: r.factIds,
      questions: questions.filter((q) => q.jdLink.requirement === r.text).length,
    }));

    const mustRows = coverageRows.filter((r) => r.must);
    const missing = [];
    if (!ranked.length) missing.push({ type: "need_fact", text: "经历库还是空的：题库只能出岗位题，事实核验与故事线无法成立。" });
    if (!requirements.length) missing.push({ type: "need_jd", text: "还没有录岗位原文：题目会退化成通用题，岗位关联度按 0 计。" });
    ranked.forEach((f) => {
      if (!hasMetric([f.action, f.result].join(" ")))
        missing.push({ type: "need_metric", text: "「" + f.title + "」没有数字，结果段会被追问，先补一个基线。" });
    });

    return {
      version: VERSION,
      role,
      company,
      requirements,
      facts: ranked,
      questions,
      coverage: {
        rows: coverageRows,
        mustTotal: mustRows.length,
        mustCovered: mustRows.filter((r) => r.questions > 0).length,
        rate: mustRows.length ? mustRows.filter((r) => r.questions > 0).length / mustRows.length : 1,
        unsupported: gapReqs,
      },
      gaps: missing,
      meta: {
        baseCount: questions.filter((q) => !q.unsupported).length,
        gapCount: questions.filter((q) => q.unsupported).length,
        total: questions.length,
        rule: "五类配额 10 题；must-have 缺口另出缺口题，标 unsupported",
      },
    };
  }

  /* ---------------- 三分钟故事线 ---------------- */

  function storyText(key, fact, role) {
    const missing = [];
    const need = (v, msg) => {
      if (clean(v)) return clean(v);
      missing.push(msg);
      return "【待补：" + msg + "】";
    };
    if (key === "hook") {
      const result = fact.result || "";
      if (!result) return { text: "【待补：这个项目最后交付了什么、量级多大】", missing: [fact.title + " 没有结果字段"], evidence: null };
      return { text: fact.title + "：" + short(result) + "。", missing: [], evidence: { field: "result", quote: clean(result).slice(0, 40) } };
    }
    if (key === "context") {
      const scene = need(fact.scene, "当时在什么项目/团队、什么阶段、约束是什么");
      return { text: "当时的情况是：" + scene + "。", missing: missing.slice(), evidence: fact.scene ? { field: "scene", quote: clean(fact.scene).slice(0, 40) } : null };
    }
    if (key === "action") {
      if (!clean(fact.action)) return { text: "【待补：你本人做了哪几步，哪一步是取舍】", missing: [fact.title + " 没有动作字段"], evidence: null };
      const parts = sentences(fact.action).slice(0, 3);
      return { text: "我做了三件事：" + parts.join("；") + "。", missing: [], evidence: { field: "action", quote: clean(parts[0]).slice(0, 40) } };
    }
    if (key === "result") {
      const r = need(fact.result, "结果是什么、基线是多少、有多少算你的贡献");
      const attr = fact.attribution ? "归因上，" + clean(fact.attribution) + "。" : "【待补：哪些结果算你个人贡献，怎么衡量】";
      const m = fact.attribution ? [] : ["缺少个人归因"];
      return { text: "结果是：" + r + "。" + attr, missing: m, evidence: fact.result ? { field: "result", quote: clean(fact.result).slice(0, 40) } : null };
    }
    if (key === "reflect") {
      const text = fact.reflection
        ? "复盘：" + clean(fact.reflection) + "。换到" + role + "的场景，我会先改这一步。"
        : "【待补：如果重做，你会改哪一步】换到" + role + "的场景，我会先改这一步。";
      return { text, missing: fact.reflection ? [] : ["缺少复盘字段"], evidence: fact.reflection ? { field: "reflection", quote: clean(fact.reflection).slice(0, 40) } : null };
    }
    return { text: "", missing: [], evidence: null };
  }

  function jdLinkFor(segmentText, requirements) {
    let best = null;
    requirements.forEach((r) => {
      const hit = overlap(segmentText, r.text);
      const direct = segmentText.includes(r.text) || hit >= 3;
      const strength = direct ? "direct" : hit >= 1 ? "partial" : "none";
      if (strength !== "none" && (!best || hit > best.hit)) best = { requirement: r.text, strength, hit };
    });
    return best ? { requirement: best.requirement, strength: best.strength } : { requirement: requirements[0] ? requirements[0].text : "", strength: "none" };
  }

  /**
   * 编译 golden case：五段 + 字符预算 + 证据锚点 + 岗位关联。
   * 缺字段不编，写【待补：…】；超预算给裁剪提示。
   */
  function compileGoldenCase(input) {
    const fact = normFacts([input && input.fact])[0];
    const role = clean(input && input.role) || "目标岗位";
    const requirements = normRequirements(input && input.requirements);
    if (!fact) return { ok: false, reason: "缺少事实：故事线必须挂在一条具体经历上" };
    const durationSec = Number(input && input.durationSec) || 180;

    const segments = STORY_SEGMENTS.map((s) => {
      const budgetChars = Math.round(((s.end - s.start) / 180) * durationSec * CHARS_PER_SEC);
      const built = storyText(s.key, fact, role);
      const chars = built.text.length;
      const over = Math.max(0, chars - budgetChars);
      return {
        key: s.key,
        label: s.label,
        startSec: s.start,
        endSec: s.end,
        budgetChars,
        text: built.text,
        chars,
        over,
        overBudget: over > 0,
        evidence: built.evidence,
        evidenceOk: built.evidence ? factHas(fact, built.evidence) : false,
        missing: built.missing,
        jdLink: jdLinkFor(built.text, requirements),
        trimHint: over > 0 ? "超 " + over + " 字：先删形容词，再压背景，最后砍并列项" : "",
      };
    });

    const totalChars = segments.reduce((s, x) => s + x.chars, 0);
    const missingSlots = segments.flatMap((s) => s.missing.map((m) => ({ segment: s.key, text: m })));
    const elevatorText = "我叫 XX，" + (fact.result ? "在「" + fact.title + "」里，" + short(fact.result) + "。" : "【待补：一句话结果】") +
      (fact.action ? "我负责的是" + short(sentences(fact.action)[0] || "") + "。" : "") +
      "这套做法和" + role + "的" + (requirements[0] ? "「" + short(requirements[0].text) + "」" : "核心职责") + "对得上。";
    const metricsInStory = countNumbers(segments.map((s) => s.text).join(" "));
    const checks = {
      withinBudget: segments.every((s) => !s.overBudget),
      overSegments: segments.filter((s) => s.overBudget).map((s) => s.key),
      metrics: metricsInStory,
      missingSlots,
      unverifiable: segments.filter((s) => s.evidence && !s.evidenceOk).map((s) => s.key),
      speakSec: Math.round(totalChars / CHARS_PER_SEC),
      reproducible: segments.every((s) => !s.overBudget) && missingSlots.length === 0 && metricsInStory >= 2,
      rule: "180 秒内讲完、每 30 秒一个信息点、至少 2 个数字、0 句无法指回事实",
    };

    return {
      ok: true,
      version: VERSION,
      factId: fact.id,
      title: fact.title,
      role,
      durationSec,
      segments,
      totalChars,
      elevator: { budgetChars: Math.round(30 * CHARS_PER_SEC), text: elevatorText, chars: elevatorText.length, overBudget: elevatorText.length > Math.round(30 * CHARS_PER_SEC) },
      jdLinks: segments.map((s) => ({ segment: s.key, requirement: s.jdLink.requirement, strength: s.jdLink.strength })),
      checks,
      status: checks.reproducible ? "ready" : "needs_work",
      tasks: missingSlots.map((m) => ({ type: "fill_slot", segment: m.segment, text: "补齐「" + m.text + "」" })),
    };
  }

  function factHas(fact, evidence) {
    const field = evidence.field;
    const source = field === "result" ? fact.result : field === "scene" ? fact.scene : field === "reflection" ? fact.reflection : fact.action;
    return verifyQuote(evidence.quote, source);
  }

  /* ---------------- 客观指标 ---------------- */

  function objectiveMetrics(answer, elapsedSec, budgetSec) {
    const text = clean(answer);
    const chars = text.length;
    const sec = Math.max(1, Number(elapsedSec) || Math.round(chars / CHARS_PER_SEC) || 1);
    const fillerCount = FILLERS.reduce((n, f) => n + (text.split(f).length - 1), 0);
    const star = {};
    Object.keys(STAR_HINTS).forEach((k) => {
      star[k] = STAR_HINTS[k].some((h) => text.includes(h));
    });
    const numbers = countNumbers(text);
    const rate = chars / sec;
    return {
      chars,
      elapsedSec: sec,
      charsPerSec: Math.round(rate * 10) / 10,
      fillerCount,
      fillerRate: chars ? fillerCount / chars : 0,
      numbers,
      metricDensity: chars ? (numbers * 100) / chars : 0,
      star,
      starScore: Object.values(star).filter(Boolean).length,
      overTime: sec > (Number(budgetSec) || ANSWER_BUDGET_SEC),
      tooSlow: rate < 3.2,
      tooFast: rate > 5.2,
      tooShort: chars < 80,
      tooLong: chars > (Number(budgetSec) || ANSWER_BUDGET_SEC) * CHARS_PER_SEC,
    };
  }

  /* ---------------- 打分 ---------------- */

  const WEIGHTS = { factuality: 22, structure: 20, metric: 20, relevance: 18, delivery: 20 };
  const DIM_LABEL = {
    factuality: "事实准确",
    structure: "结构完整",
    metric: "量化密度",
    relevance: "岗位关联",
    delivery: "表达收敛",
  };

  function pickQuote(answer, tokens) {
    const list = sentences(answer);
    for (const s of list) if (tokens.some((t) => s.includes(t))) return s;
    return "";
  }

  function scoreAnswer(input) {
    const question = input && input.question ? input.question : {};
    const answer = clean(input && input.answer);
    const budget = Number(input && input.budgetSec) || question.budgetSec || ANSWER_BUDGET_SEC;
    const objective = objectiveMetrics(answer, input && input.elapsedSec, budget);
    const tokens = question.evidenceTokens || [];

    const ownershipIssue = (answer.match(/我们/g) || []).length >= 3 && (answer.match(/我/g) || []).length <= 1;
    const tokenHit = tokens.filter((t) => answer.includes(t)).length;
    const coverage = tokens.length ? Math.min(1, tokenHit / Math.max(2, Math.ceil(tokens.length / 2))) : 0;

    const dims = {};
    const evidence = [];
    const add = (key, value, tokensForQuote, note) => {
      const quote = pickQuote(answer, tokensForQuote);
      const ok = quote ? verifyQuote(quote, answer) : false;
      const finalScore = ok ? Math.max(0, Math.min(1, value)) : 0;
      dims[key] = finalScore;
      evidence.push({ dim: key, label: DIM_LABEL[key], quote: ok ? quote : "", verified: ok, note: note || (ok ? "" : "没有可引用的原话，该维度不计分") });
    };

    add("factuality", coverage, tokens.length ? tokens : ["我"], ownershipIssue ? "「我们」出现过多，归属不清" : "");
    add("structure", objective.starScore / 4, STAR_HINTS.A, "");
    add("metric", objective.numbers >= 2 ? 1 : objective.numbers === 1 ? 0.6 : 0, ["%", "倍", "从", "到", "提升", "降低"], objective.numbers ? "" : "没有任何数字");
    const reqTokens = terms(question.jdLink && question.jdLink.requirement ? question.jdLink.requirement : "");
    const reqHit = reqTokens.filter((t) => answer.includes(t)).length;
    add("relevance", reqHit >= 2 ? 1 : reqHit === 1 ? 0.6 : 0, reqTokens.length ? reqTokens : ["岗位"], "没有回扣岗位要求");
    const deliveryPenalty =
      (objective.fillerRate > 0.03 ? 0.4 : 0) +
      (objective.overTime ? 0.3 : 0) +
      (objective.tooSlow || objective.tooFast ? 0.2 : 0) +
      (objective.tooShort ? 0.2 : 0) +
      (objective.tooLong ? 0.2 : 0);
    add("delivery", 1 - Math.min(1, deliveryPenalty), ["我"], "");

    const score = Math.round(
      Object.keys(WEIGHTS).reduce((s, k) => s + dims[k] * WEIGHTS[k], 0) / 100 * 100,
    );
    const bars = barsLevel(score);

    const gaps = [];
    if (coverage < 0.5) gaps.push({ type: "evidence", priority: 1, text: "这道题要求的必答信息点没出现" });
    if (ownershipIssue) gaps.push({ type: "ownership", priority: 2, text: "「我们」出现 ≥3 次，听不出你的独立动作" });
    if (!objective.numbers) gaps.push({ type: "metric", priority: 3, text: "结果句没有数字" });
    else if (objective.numbers === 1) gaps.push({ type: "metric", priority: 3, text: "只有一个数字，缺基线或口径" });
    if (!objective.star.T) gaps.push({ type: "tradeoff", priority: 4, text: "没有说清当时要解决什么、为什么这么选" });
    gaps.sort((a, b) => a.priority - b.priority);

    const fixes = [];
    if (objective.numbers === 0) fixes.push("结果段补一个数字，并写清从多少到多少（基线比数字本身更重要）。");
    else if (objective.numbers === 1) fixes.push("再加一个数字：时间、人数、条数任选一个，让结果有对照。");
    if (ownershipIssue) fixes.push("把「我们」换成「我」：写出你单独交付的那一件东西。");
    if (!objective.star.T) fixes.push("开头先说目标：当时要解决什么问题、衡量标准是什么。");
    if (objective.fillerRate > 0.03) fixes.push("删掉填充词（呃/然后/就是），平均每秒能多说出 1–2 个字的信息。");
    if (objective.tooLong) fixes.push("砍到 180 秒以内：先删背景里的并列项，保留一次取舍。");
    if (reqHit === 0) fixes.push("结尾回扣岗位要求原句，让面试官不用自己连线。");

    return {
      questionId: question.id || "",
      score,
      bars: bars.key,
      barsLabel: bars.label,
      barsNext: bars.next,
      dims,
      evidence,
      quoteVerified: evidence.filter((e) => e.verified).length,
      confidence: evidence.filter((e) => e.verified).length >= 2 ? "high" : "low",
      objective,
      gaps,
      fixes: fixes.slice(0, 3),
      at: Date.now(),
    };
  }

  /* ---------------- 教练状态机 ---------------- */

  function pickProbe(question, gaps) {
    const probes = (question && question.probes) || [];
    for (const g of gaps) {
      const hit = probes.find((p) => p.gap === g.type);
      if (hit) return { gap: g.type, gapText: g.text, question: hit.question, level: hit.level };
    }
    const fallback = probes[0];
    return fallback
      ? { gap: fallback.gap, gapText: gaps[0] ? gaps[0].text : "信息点没答全", question: fallback.question, level: fallback.level }
      : null;
  }

  function createCoachSession(input) {
    const pack = (input && input.pack) || buildQuestionPack(input || {});
    const options = (input && input.options) || {};
    const opts = {
      maxFollowUps: Number(options.maxFollowUps) || MAX_FOLLOW_UPS,
      answerBudgetSec: Number(options.answerBudgetSec) || ANSWER_BUDGET_SEC,
      sessionBudgetSec: Number(options.sessionBudgetSec) || SESSION_BUDGET_SEC,
      maxRounds: Number(options.maxRounds) || MAX_ROUNDS,
      probeThreshold: typeof options.probeThreshold === "number" ? options.probeThreshold : 0.6,
    };
    const questions = pack.questions || [];
    let qi = 0;
    let followUps = 0;
    let rounds = 0;
    let elapsedSec = 0;
    let done = false;
    const transcript = [];
    const records = [];

    function current() {
      if (done || qi >= questions.length) return null;
      return {
        index: qi,
        total: questions.length,
        question: questions[qi],
        followUpsLeft: opts.maxFollowUps - followUps,
        rounds,
        elapsedSec,
        budgetSec: opts.sessionBudgetSec,
      };
    }

    function shouldProbe(result) {
      if (followUps >= opts.maxFollowUps) return false;
      if (!result.gaps.length) return false;
      const top = result.gaps[0];
      if (top.type === "evidence") return result.dims.factuality < opts.probeThreshold;
      if (top.type === "ownership") return true;
      if (top.type === "metric") return result.dims.metric < 1;
      if (top.type === "tradeoff") return result.dims.structure < 1;
      return false;
    }

    function buildScorecard() {
      const best = {};
      records.forEach((r) => {
        if (!best[r.questionId] || r.score > best[r.questionId].score) best[r.questionId] = r;
      });
      const rows = Object.values(best).sort((a, b) => b.score - a.score);
      const overall = rows.length ? Math.round(rows.reduce((s, r) => s + r.score, 0) / rows.length) : 0;
      const dims = {};
      Object.keys(WEIGHTS).forEach((k) => {
        dims[k] = rows.length ? Math.round((rows.reduce((s, r) => s + r.dims[k], 0) / rows.length) * 100) / 100 : 0;
      });
      const mix = { L1: 0, L2: 0, L3: 0, L4: 0 };
      rows.forEach((r) => (mix[r.bars] += 1));
      const fixCount = {};
      rows.forEach((r) => r.fixes.forEach((f) => (fixCount[f] = (fixCount[f] || 0) + 1)));
      const topFixes = Object.entries(fixCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([text, times]) => ({ text, times }));
      return {
        overall,
        bars: barsLevel(overall).key,
        barsLabel: barsLevel(overall).label,
        dims,
        dimsLabel: DIM_LABEL,
        barsMix: mix,
        answered: rows.length,
        total: questions.length,
        probeCount: records.filter((r) => r.fromProbe).length,
        avgSec: rows.length ? Math.round(records.reduce((s, r) => s + r.objective.elapsedSec, 0) / records.length) : 0,
        questions: rows,
        topFixes,
        transcriptRounds: transcript.length,
        sessionSec: elapsedSec,
      };
    }

    function submit(text, meta) {
      if (done) return { kind: "done", scorecard: buildScorecard() };
      const cur = current();
      if (!cur) return { kind: "done", scorecard: buildScorecard() };
      const question = cur.question;
      const answer = clean(text);
      if (!answer) return { kind: "reject", reason: "还没有作答内容" };
      const result = scoreAnswer({ question, answer, elapsedSec: meta && meta.elapsedSec, budgetSec: opts.answerBudgetSec });
      rounds += 1;
      elapsedSec += Number(meta && meta.elapsedSec) || result.objective.elapsedSec || 0;
      transcript.push({
        round: rounds,
        questionId: question.id,
        probe: followUps > 0,
        answer,
        score: result.score,
        gaps: result.gaps.map((g) => g.type),
      });
      records.push(Object.assign({ fromProbe: followUps > 0 }, result));

      if (rounds >= opts.maxRounds || elapsedSec >= opts.sessionBudgetSec) {
        done = true;
        return { kind: "finish", reason: rounds >= opts.maxRounds ? "轮次预算用完" : "时长预算用完", scorecard: buildScorecard(), last: result };
      }
      if (shouldProbe(result)) {
        followUps += 1;
        const probe = pickProbe(question, result.gaps);
        return { kind: "probe", probe, last: result, progress: { index: qi, total: questions.length, followUpsLeft: opts.maxFollowUps - followUps } };
      }
      followUps = 0;
      qi += 1;
      if (qi >= questions.length) {
        done = true;
        return { kind: "finish", reason: "题库走完", scorecard: buildScorecard(), last: result };
      }
      return { kind: "advance", next: current(), last: result, progress: { index: qi, total: questions.length } };
    }

    function finish() {
      done = true;
      return { kind: "finish", scorecard: buildScorecard() };
    }

    return {
      opts,
      pack,
      current,
      submit,
      finish,
      transcript: () => transcript.slice(),
      records: () => records.slice(),
      isDone: () => done,
    };
  }

  /* ---------------- 闭环：把评分改进写回口述稿 ---------------- */

  function improveScript(input) {
    const golden = input && input.goldenCase;
    const scorecard = input && input.scorecard;
    if (!golden || !golden.segments) return { ok: false, reason: "缺少故事线" };
    const before = golden.segments.map((s) => s.text).join("");
    const changes = [];
    let fillerRemoved = 0;
    const segments = golden.segments.map((s) => {
      let text = s.text;
      FILLERS.forEach((f) => {
        const n = text.split(f).length - 1;
        if (n > 0) {
          fillerRemoved += n;
          text = text.split(f).join("");
        }
      });
      const longSentences = sentences(text).filter((x) => x.length > 60);
      if (longSentences.length) {
        changes.push({ type: "split_long_sentence", segment: s.key, detail: longSentences.length + " 句超过 60 字，建议在逗号处断开" });
      }
      if (s.overBudget) changes.push({ type: "trim", segment: s.key, detail: s.trimHint });
      return Object.assign({}, s, { text });
    });
    if (fillerRemoved) changes.push({ type: "remove_filler", detail: "删除填充词 " + fillerRemoved + " 处" });
    const topFixes = (scorecard && scorecard.topFixes) || [];
    const todo = topFixes.map((f) => "【下一版要补】" + f.text);
    if (golden.checks && golden.checks.missingSlots.length) {
      golden.checks.missingSlots.forEach((m) => todo.push("【待补】" + m.segment + "：" + m.text));
    }
    const after = segments.map((s) => s.text).join("");
    return {
      ok: true,
      script: segments.map((s) => s.text).join("\n"),
      segments,
      beforeChars: before.length,
      afterChars: after.length,
      numbersBefore: countNumbers(before),
      numbersAfter: countNumbers(after),
      changes,
      todo,
      note: "只做删减与重排，不新增任何数字或事实；缺的格子留给下一轮补齐。",
    };
  }

  return {
    VERSION,
    CHARS_PER_SEC,
    ANSWER_BUDGET_SEC,
    MAX_FOLLOW_UPS,
    SESSION_BUDGET_SEC,
    MAX_ROUNDS,
    CATEGORIES,
    BARS,
    STORY_SEGMENTS,
    WEIGHTS,
    DIM_LABEL,
    FILLERS,
    buildQuestionPack,
    compileGoldenCase,
    objectiveMetrics,
    scoreAnswer,
    createCoachSession,
    improveScript,
    barsLevel,
    verifyQuote,
    hasMetric,
    sentences,
    terms,
    normRequirements,
    normFacts,
  };
});
