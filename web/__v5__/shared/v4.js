/**
 * v4 界面层：三张卡片一屏解决三个痛点
 * 01 看不清对方 → 贴 JD 就出风险台账（L1/L2/L3 着色 + 原句 + 当面问法 + 一页式卡片）
 * 02 说不清自己 → 贴简历就出 JD 覆盖度、逐条对照、缺口优先级、五维雷达
 * 03 留不下证据 → 贴回答就出诊断、STAR 改写、追问预测，并可导出一份证据台账
 * 不依赖 v1 工作台的选岗位流程，也不需要登录或预填任何数据。
 */
(() => {
  "use strict";

  const CORE = () => window.EvidenceCore;
  const PREFIX = "folio.v1.";
  const get = (k, d) => {
    try {
      const raw = localStorage.getItem(PREFIX + k);
      return raw ? JSON.parse(raw) : d;
    } catch {
      return d;
    }
  };
  const set = (k, v) => {
    try {
      localStorage.setItem(PREFIX + k, JSON.stringify(v));
    } catch {
      /* 存储不可用时静默降级 */
    }
  };
  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pct = (v) => Math.round((v || 0) * 100) + "%";

  /* ---------------- 示例素材：复制粘贴即可看到结果 ---------------- */

  const SAMPLE_JD = [
    "岗位职责：",
    "1. 负责品牌方电商店铺日常运营，跟进平台活动报名与素材落地",
    "2. 协助完成月度数据复盘，向品牌方输出投放效果说明",
    "3. 对接达人资源，推进内容排期与结算",
    "任职要求：",
    "1. 本科及以上学历，1-3 年电商或内容运营经验",
    "2. 熟悉平台活动规则，能独立对接品牌方",
    "3. 有小红书或抖音投放经验者优先",
    "其他说明：",
    "试用期 3 个月，试用期不缴纳社保，转正后补缴",
    "入职需缴纳培训费 2000 元，工作满一年后退还",
    "实行大小周，周六需正常到岗",
  ].join("\n");

  const SAMPLE_COMPANY = [
    "公司成立于 2019 年，目前团队规模 120 人。",
    "已服务品牌超过 50 个，去年完成 A 轮融资 2000 万元。",
    "承诺入职满一年可参与项目分红。",
  ].join("\n");

  const SAMPLE_RESUME = [
    "负责某美妆品牌天猫店铺日常运营，跟进大促活动报名与素材上线，双十一单店成交额从 80 万做到 210 万。",
    "独立对接 3 个品牌方，每月输出一次投放复盘，累计整理素材 400 条。",
    "协调 12 位达人排期，把内容交付周期从 7 天压到 3 天。",
    "参与部门周会并整理会议纪要。",
  ].join("\n");

  const SAMPLE_QUESTION = "讲一次你推动跨部门协作、最后拿到结果的经历";
  const SAMPLE_ANSWER =
    "当时我们组接了一个美妆品牌的店铺运营，双十一前品牌方突然把主推品换了，大家都挺被动。我们开了几次会，把素材、活动报名和达人排期重新排了一遍，中间也跟设计、达人对了几次。最后效果还不错，领导也比较认可。";

  /* ---------------- 小组件 ---------------- */

  function toast(msg) {
    let box = document.getElementById("v4-toast");
    if (!box) {
      box = document.createElement("div");
      box.id = "v4-toast";
      document.body.append(box);
    }
    box.textContent = msg;
    box.classList.add("on");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => box.classList.remove("on"), 1800);
  }

  function copy(text, tip) {
    const done = () => toast(tip || "已复制");
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done, () => legacy(text, done));
    else legacy(text, done);
  }
  function legacy(text, done) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;opacity:0";
    document.body.append(ta);
    ta.select();
    try {
      document.execCommand("copy");
      done();
    } catch {
      toast("复制失败，请手动选中");
    }
    ta.remove();
  }

  const LV_TONE = { L1: "hot", L2: "warn", L3: "calm" };
  const TIER_LABEL = { A: "A 原文", B: "B 二手", C: "C 通用", D: "D 无来源" };
  const TIER_TONE = { A: "ok", B: "warn", C: "calm", D: "hot" };

  const lv = (level) => '<span class="v4-lv ' + (LV_TONE[level] || "calm") + '">' + level + "</span>";
  const tier = (t) => '<span class="v4-tier ' + (TIER_TONE[t] || "calm") + '">' + (TIER_LABEL[t] || t) + "</span>";
  const kpi = (label, value, note) =>
    '<div class="v4-kpi"><small>' + label + "</small><b>" + value + "</b>" + (note ? "<span>" + note + "</span>" : "") + "</div>";

  /* ---------------- 顶部与切换 ---------------- */

  const SWITCH = [
    { id: "v1", label: "V1", href: "__v1__/index.html", title: "原始版" },
    { id: "v2", label: "V2", href: "__v2__/index.html", title: "证据版" },
    { id: "v3", label: "V3", href: "__v3__/index.html", title: "证据链" },
    { id: "v4", label: "V4", href: "index.html", title: "三卡版" },
  ];

  const TABS = [
    { id: "check", n: "01", t: "看清对方", d: "贴 JD，出风险台账" },
    { id: "align", n: "02", t: "说清自己", d: "贴简历，出缺口清单" },
    { id: "proof", n: "03", t: "留下证据", d: "贴回答，出改写稿" },
  ];

  function head() {
    const sw = SWITCH.map(
      (v) =>
        '<a href="' + v.href + '" title="' + v.title + '"' + (v.id === "v4" ? ' class="on"' : "") + ">" + v.label + "</a>",
    ).join("");
    const tabs = TABS.map(
      (t) =>
        '<button class="v4-tab' + (state.tab === t.id ? " on" : "") + '" data-v4-tab="' + t.id + '">' +
        "<i>" + t.n + "</i><b>" + t.t + "</b><small>" + t.d + "</small></button>",
    ).join("");
    return (
      '<header class="v4-top">' +
      '<div class="v4-brand"><b>履历间</b><span>求职每一步，结论都有出处</span></div>' +
      '<div class="v4-switch" title="版本可随时切换">' + sw + "</div>" +
      "</header>" +
      '<nav class="v4-tabs">' + tabs + "</nav>"
    );
  }

  /* ---------------- 01 看清对方 ---------------- */

  function verdictOf(ledger) {
    const l1 = ledger.byLevel.L1 || 0;
    const l2 = ledger.byLevel.L2 || 0;
    if (l1 > 0)
      return {
        tone: "hot",
        title: "先问清这 " + (l1 + l2) + " 点再往下谈",
        note: "JD 原文出现 " + l1 + " 处明确不利条款，直接问书面口径，拿不到就不签字。",
      };
    if (l2 > 0)
      return { tone: "warn", title: "可以继续聊，但这 " + l2 + " 点要当场确认", note: "表述留了空间，问清边界和计算方式再决定。" };
    return { tone: "calm", title: "这份 JD 没看到明显条款", note: "仍需核对合同主体、社保缴纳方式和试用期约定，别只看招聘页。" };
  }

  function signalCard(r) {
    return (
      '<article class="v4-sig ' + (LV_TONE[r.level] || "calm") + '">' +
      '<div class="v4-sig-h">' + lv(r.level) + "<b>" + esc(r.title) + "</b>" + tier(r.sourceTier) + "</div>" +
      '<p class="v4-quote">“' + esc(r.quote) + '”</p>' +
      '<div class="v4-ask"><span>当面这样问</span><p>' + esc(r.ask) + "</p>" +
      '<button class="v4-mini" data-v4-copy="' + esc(r.ask) + '">复制这句</button></div>' +
      '<small class="v4-src">来源：' + esc(r.source) + " · 这一行可回溯到原句</small>" +
      "</article>"
    );
  }

  function checkResult(ledger, jdText) {
    const v = verdictOf(ledger);
    const rows = ledger.rows.slice().sort((a, b) => (a.level === b.level ? 0 : a.level < b.level ? -1 : 1));
    const signals = rows.map(signalCard).join("");
    const tiers = ["A", "B", "C", "D"].map((t) => tier(t) + "<i>" + (ledger.tiers[t] || 0) + "</i>").join("");
    return (
      '<section class="v4-result">' +
      '<div class="v4-verdict ' + v.tone + '"><b>' + esc(v.title) + "</b><p>" + esc(v.note) + "</p></div>" +
      '<div class="v4-kpis">' +
      kpi("证据覆盖率", pct(ledger.coverage), ledger.coveredCount + " / " + ledger.total + " 条能指回原句") +
      kpi("信号条数", ledger.total, "风险 L1 " + ledger.byLevel.L1 + " · L2 " + ledger.byLevel.L2 + " · L3 " + ledger.byLevel.L3 + "，公司陈述 " + ledger.rows.filter((r) => r.type === "claim").length + " 条") +
      kpi("标注误伤率", "待测", "需真实标注样本测算") +
      kpi("报告采纳率", "待测", "上线后按复制/下载统计") +
      "</div>" +
      '<div class="v4-tiers"><span>来源等级构成</span>' + tiers + "</div>" +
      '<h3 class="v4-h3">信号清单 <small>按 L1 → L3 排序，每条都带原句和问法</small></h3>' +
      '<div class="v4-sigs">' + signals + "</div>" +
      '<h3 class="v4-h3">一页式风险卡片 <small>可直接粘贴发给朋友或存进备忘录</small></h3>' +
      '<pre class="v4-card" id="v4-cardtext">' + esc(cardText(ledger, jdText)) + "</pre>" +
      '<div class="v4-row"><button class="v4-btn primary" data-v4-copy-card>复制这张卡片</button>' +
      '<button class="v4-btn" data-v4-tab="align">带着台账去对齐简历 →</button></div>' +
      '<p class="v4-note">这张卡片的每一条都来自上面的原句；找不到原句的推测没有写进来，也不会替你下结论。</p>' +
      "</section>"
    );
  }

  function cardText(ledger, jdText) {
    const lines0 = String(jdText || "").split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    const titleLine =
      lines0.find((s) => s.length > 6 && !/^(岗位职责|工作职责|职位描述|任职要求|岗位要求|其他说明|其他|福利)/.test(s) && !s.endsWith("：")) ||
      "目标岗位";
    const lines = ["【岗位风险卡片】" + titleLine.slice(0, 30), ""];
    lines.push("证据覆盖率 " + pct(ledger.coverage) + "（" + ledger.coveredCount + "/" + ledger.total + "）｜L1 " + ledger.byLevel.L1 + " · L2 " + ledger.byLevel.L2 + " · L3 " + ledger.byLevel.L3);
    lines.push("");
    ledger.asks.forEach((a, i) => {
      lines.push(i + 1 + ". [" + a.level + "] " + a.title);
      lines.push("   原句：" + a.quote);
      lines.push("   当面问：" + a.ask);
    });
    if (!ledger.asks.length) lines.push("暂无 L1/L2 命中，仍建议核对合同主体与社保缴纳方式。");
    lines.push("");
    lines.push("结论口径：以上每条都能回溯到 JD 或公司材料原文；未标注来源的推测不列入。");
    return lines.join("\n");
  }

  function runCheck() {
    const jd = (document.getElementById("v4-jd")?.value || "").trim();
    const co = (document.getElementById("v4-co")?.value || "").trim();
    const out = document.getElementById("v4-out");
    if (!out) return;
    if (jd.length < 40) {
      toast("JD 太短，至少贴三段再核验");
      return;
    }
    set("v4Jd", jd);
    set("v4Company", co);
    const ledger = CORE().buildLedger({ jdText: jd, companyText: co, gaps: [] });
    out.innerHTML = checkResult(ledger, jd);
    out.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function checkTab() {
    return (
      '<div class="v4-hero">' +
      '<p class="v4-claim">不替你吹牛，只帮你核实和说清。</p>' +
      '<p class="v4-sub">三个痛点，三张卡片，贴一段文字就看到结果。先看 01，30 秒能跑完。</p>' +
      "</div>" +
      '<section class="v4-card-panel">' +
      '<div class="v4-panel-h"><h2><i>01</i>看清对方<em>岗位反向尽调</em></h2><span class="v4-badge">零门槛 · 不用选岗位</span></div>' +
      '<label class="v4-field">JD 原文<small>「其他说明」「福利」这两段最关键</small>' +
      '<textarea id="v4-jd" rows="8" placeholder="把招聘页的职责、要求、其他说明整段粘进来">' + esc(get("v4Jd", "")) + "</textarea></label>" +
      '<label class="v4-field">公司材料（可选，一行一句）' +
      '<textarea id="v4-co" rows="3" placeholder="招聘页里写的规模、融资、团队人数，或新闻里的说法">' + esc(get("v4Company", "")) + "</textarea></label>" +
      '<div class="v4-row"><button class="v4-btn primary" data-v4-run-check>生成风险台账</button>' +
      '<button class="v4-btn ghost" data-v4-sample="check">用示例试一下</button>' +
      '<span class="v4-hint">示例里有 3 处典型条款，跑完能直接看到分级</span></div>' +
      "</section>" +
      '<div id="v4-out" class="v4-out"></div>'
    );
  }

  /* ---------------- 02 说清自己 ---------------- */

  function blocksOf(text) {
    return String(text || "")
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 4)
      .map((s) => ({ type: "body", text: s }));
  }

  /* 找一条要求最可能落在哪一段：先看整句，再看分句，再看领域词重合数 */
  function bestBlock(req, blocks) {
    const core = CORE();
    const words = (core.DOMAINS || []).filter((set) => set.some((w) => req.includes(w))).flat();
    const clauses = req.split(/[，,、；;：:（）()]/).map((s) => s.trim()).filter((s) => s.length >= 4);
    let best = null;
    let bestScore = 0;
    blocks.forEach((b) => {
      let score = 0;
      if (b.text.includes(req)) score += 5;
      clauses.forEach((c) => {
        if (b.text.includes(c.slice(0, 12))) score += 3;
      });
      words.forEach((w) => {
        if (b.text.includes(w)) score += 1;
      });
      if (score > bestScore) {
        bestScore = score;
        best = b;
      }
    });
    return bestScore > 0 ? best : null;
  }

  function gapHint(text) {
    if (/学历|本科|硕士|大专|博士|学位/.test(text)) return "门槛项写进教育背景即可，不用为它编一段经历。";
    if (/证书|资格|语言|四级|六级|雅思/.test(text)) return "这类资质单列一行，考过就写，没考过就不要占版面。";
    if (/年经验|年以上/.test(text)) return "年限不够就换角度：在相近项目里补一句「独立负责过同类工作」。";
    return "从最接近的一段经历里挑一条，补一句结果数字；没有证据就别硬写。";
  }

  function radarSvg(dims) {
    const size = 300, cx = 150, cy = 142, R = 96;
    const n = dims.length;
    const ang = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const pt = (i, r) => [cx + Math.cos(ang(i)) * r, cy + Math.sin(ang(i)) * r];
    const grid = [0.25, 0.5, 0.75, 1]
      .map((k) => '<polygon points="' + dims.map((_, i) => pt(i, R * k).join(",")).join(" ") + '" fill="none" stroke="#dfe5df"/>')
      .join("");
    const shape = dims.map((d, i) => pt(i, R * Math.max(0.15, Math.min(1, d.score))).join(",")).join(" ");
    const labels = dims
      .map((d, i) => {
        const [x, y] = pt(i, R + 24);
        return '<text x="' + x + '" y="' + y + '" text-anchor="middle" font-size="10.5" fill="#4f6357">' + esc(d.dim) + "</text>";
      })
      .join("");
    return (
      '<svg viewBox="0 0 300 290" class="v4-radar-svg" role="img" aria-label="简历匹配五维雷达">' +
      grid +
      '<polygon points="' + shape + '" fill="rgba(37,75,60,.16)" stroke="#254b3c" stroke-width="1.4"/>' +
      dims.map((d, i) => { const [x, y] = pt(i, R * Math.max(0.15, Math.min(1, d.score))); return '<circle cx="' + x + '" cy="' + y + '" r="3" fill="#254b3c"/>'; }).join("") +
      labels +
      "</svg>"
    );
  }

  function runAlign() {
    const jd = (document.getElementById("v4-jd2")?.value || get("v4Jd", "") || "").trim();
    const cv = (document.getElementById("v4-cv")?.value || "").trim();
    const out = document.getElementById("v4-out2");
    if (!out) return;
    if (cv.length < 30) {
      toast("简历内容太少，贴三行以上再对照");
      return;
    }
    const reqs = jd.length >= 20 ? CORE().parseJD(jd).requirements.slice(0, 10) : [];
    const blocks = blocksOf(cv);
    const radar = CORE().radarDims({ blocks, requirements: reqs, materials: [] });
    const audit = radar.audit;
    const dims = radar.dims.filter((d) => !/ 0 \/ 0 /.test(d.basis));
    set("v4Cv", cv);

    const rows = audit.requirementRows
      .map((r) => {
        const hit = bestBlock(r.text, blocks);
        return (
          "<tr><td>" + esc(r.text) + "</td>" +
          "<td>" + (hit ? '<span class="v4-src-txt">' + esc(hit.text.slice(0, 34)) + "…</span>" : '<span class="v4-none">无对应段落</span>') + "</td>" +
          "<td>" + (r.covered ? '<span class="v4-flag ok">已覆盖</span>' : '<span class="v4-flag hot">缺口</span>') + "</td></tr>"
        );
      })
      .join("");

    const gaps = audit.uncovered
      .map((u, i) => "<li><b>" + (i + 1) + "</b><span>" + esc(u.text) + "</span><small>" + esc(gapHint(u.text)) + "</small></li>")
      .join("");

    out.innerHTML =
      '<section class="v4-result">' +
      '<div class="v4-kpis">' +
      kpi("JD 覆盖度", pct(audit.coverage), audit.requirementRows.filter((r) => r.covered).length + " / " + audit.requirementRows.length + " 条") +
      kpi("证据缺口", audit.uncovered.length, "按优先级列在下面") +
      kpi("无出处段落", audit.noSource.length, "定稿前挂上原件") +
      kpi("建议采纳率", "待测", "上线后按复制应用统计") +
      "</div>" +
      (reqs.length ? "" : '<p class="v4-note">没有 JD 时只做自检：检查段落有没有出处、有没有数字。把 JD 也贴上，才能逐条对照。</p>') +
      (dims.length ? '<h3 class="v4-h3">匹配雷达 <small>每一维都附依据，不做无理由打分</small></h3>' +
        '<div class="v4-radar">' + radarSvg(dims) +
        '<ul class="v4-basis">' + dims.map((d) => "<li><b>" + esc(d.dim) + "</b><span>" + esc(d.basis) + "</span><i>" + pct(d.score) + "</i></li>").join("") + "</ul></div>" +
        '<p class="v4-note">粘贴进来的简历默认没有出处，所以「证据厚度」会是 0；材料挂进经历库之后这一项才会涨。雷达只用来找短板，不给总分。</p>' : "") +
      (reqs.length ? '<h3 class="v4-h3">JD–证据对照表</h3><table class="v4-table"><thead><tr><th>JD 要求</th><th>对应段落</th><th>判定</th></tr></thead><tbody>' + rows + "</tbody></table>" : "") +
      '<h3 class="v4-h3">缺口清单 <small>先补有证据但没数字的，最后补完全没证据的</small></h3>' +
      (gaps ? '<ul class="v4-gaps">' + gaps + "</ul>" : '<p class="v4-pass">每条要求都有对应段落，可以定稿了。</p>') +
      '<div class="v4-row"><button class="v4-btn primary" data-v4-copy-align>复制对齐建议</button>' +
      '<button class="v4-btn" data-v4-tab="proof">去练面试回答 →</button></div>' +
      "</section>";
    out.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function alignText() {
    const jd = get("v4Jd", "");
    const cv = get("v4Cv", "");
    const reqs = jd.length >= 20 ? CORE().parseJD(jd).requirements.slice(0, 10) : [];
    const audit = CORE().auditResume(blocksOf(cv), reqs);
    const lines = ["【简历对齐建议】", "JD 覆盖 " + pct(audit.coverage) + "（" + audit.requirementRows.length + " 条要求）｜无出处 " + audit.noSource.length + " 段｜缺数字 " + audit.noMetric.length + " 段"];
    if (audit.uncovered.length) {
      lines.push("", "未覆盖的要求（优先补）：");
      audit.uncovered.slice(0, 6).forEach((u, i) => lines.push("  " + (i + 1) + ". " + u.text));
    }
    if (audit.noSource.length) {
      lines.push("", "没有出处的段落（先挂原件再改）：");
      audit.noSource.slice(0, 4).forEach((b) => lines.push("  · " + b.text.slice(0, 40)));
    }
    lines.push("", "改法：每条未覆盖的要求，从最接近的经历里挑一条，写成「做了什么 + 结果数字」一句话。没有证据的要求不要硬编。");
    return lines.join("\n");
  }

  function alignTab() {
    const jd = get("v4Jd", "");
    return (
      '<section class="v4-card-panel">' +
      '<div class="v4-panel-h"><h2><i>02</i>说清自己<em>简历–JD 证据对照</em></h2><span class="v4-badge">贴三行就出缺口</span></div>' +
      (jd ? '<p class="v4-note ok">已带上 01 里输入的 JD（' + jd.length + " 字），不用重复粘贴。</p>" : '<p class="v4-note">还没贴 JD？先在 01 里跑一次，这里会自动沿用；不贴也能做「有没有出处、有没有数字」的自检。</p>') +
      '<label class="v4-field">JD 原文<small>可留空，留空则只做自检</small><textarea id="v4-jd2" rows="4" placeholder="粘贴招聘要求，用来逐条对照">' + esc(jd) + "</textarea></label>" +
      '<label class="v4-field">简历内容<small>一行一段，越具体越能对出证据</small>' +
      '<textarea id="v4-cv" rows="8" placeholder="一行写一段经历：做了什么 + 结果数字">' + esc(get("v4Cv", "")) + "</textarea></label>" +
      '<div class="v4-row"><button class="v4-btn primary" data-v4-run-align>开始逐条对照</button>' +
      '<button class="v4-btn ghost" data-v4-sample="align">用示例试一下</button>' +
      '<span class="v4-hint">示例是一份有结果数字、但没挂出处的简历</span></div>' +
      "</section>" +
      '<div id="v4-out2" class="v4-out"></div>'
    );
  }

  /* ---------------- 03 留下证据 ---------------- */

  function reviews() {
    return get("v4Reviews", []);
  }

  function reviewCard(r) {
    const st = r.star || {};
    const cells = ["S", "T", "A", "R"].map((k) => '<div class="v4-star ' + (st[k] ? "on" : "off") + '"><b>' + k + "</b></div>").join("");
    const parts = (r.rewrite?.parts || []).map((p) => "<li><b>" + esc(p.key) + "</b><span>" + esc(p.text) + "</span></li>").join("");
    const g = r.grade || {};
    return (
      '<article class="v4-review">' +
      '<div class="v4-review-top">' +
      '<div class="v4-score"><b>' + r.score + '</b><small>当前 / 100</small></div>' +
      '<div class="v4-cmp"><div><i style="width:' + Math.max(8, r.score) + '%"></i></div><div class="after"><i style="width:' + Math.max(8, r.estimate) + '%"></i></div>' +
      "<small>改写后预估 " + r.estimate + "（预估，不是实测）</small></div>" +
      '<div class="v4-grade">' + tier(g.tier || "C") + "<small>" + esc(g.source || "") + "</small></div>" +
      "</div>" +
      '<div class="v4-stars">' + cells + "</div>" +
      (r.fixes?.length ? '<ul class="v4-fixes">' + r.fixes.map((f) => "<li>" + esc(f) + "</li>").join("") + "</ul>" : '<p class="v4-pass">结构完整，背熟这版就可以练口述。</p>') +
      '<h3 class="v4-h3">按 STAR 改写 <small>缺的格子留成待补，不替你编</small></h3>' +
      '<ul class="v4-parts">' + parts + "</ul>" +
      '<h3 class="v4-h3">可能被追问</h3><ol class="v4-follow">' + (r.followUps || []).map((f) => "<li>" + esc(f) + "</li>").join("") + "</ol>" +
      '<div class="v4-row"><button class="v4-btn" data-v4-copy="' + esc(r.rewrite?.text || "") + '">复制改写稿</button></div>' +
      "</article>"
    );
  }

  function proofTab() {
    const list = reviews();
    const recent = list
      .slice(0, 4)
      .map(
        (r, i) =>
          '<li><b>' + esc((r.question || "未命名题目").slice(0, 26)) + "</b><span>" + r.score + " → 预估 " + r.estimate + "</span><small>" +
          new Date(r.at).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) + " · " + tier(r.grade?.tier || "C") + "</small></li>",
      )
      .join("");
    return (
      '<section class="v4-card-panel">' +
      '<div class="v4-panel-h"><h2><i>03</i>留下证据<em>面试复盘证据链</em></h2><span class="v4-badge">本机存储 · 不上传</span></div>' +
      '<label class="v4-field">题目<small>不填也能复盘，填了会判断这条题的核实等级</small>' +
      '<input id="v4-q" type="text" placeholder="例如：讲一次你推动跨部门协作的经历" value="' + esc(get("v4Q", "")) + '"/></label>' +
      '<label class="v4-field">你的回答<small>按平时说话的样子打出来，不用修饰</small>' +
      '<textarea id="v4-a" rows="8" placeholder="把口述内容打出来，越具体越能发现缺口">' + esc(get("v4A", "")) + "</textarea></label>" +
      '<div class="v4-row"><button class="v4-btn primary" data-v4-run-proof>复盘这条回答</button>' +
      '<button class="v4-btn ghost" data-v4-sample="proof">用示例试一下</button>' +
      '<span class="v4-hint">示例是一条「说了过程、没说清结果」的回答，复盘后会看到缺口</span></div>' +
      "</section>" +
      '<div id="v4-out3" class="v4-out">' + (list[0] ? reviewCard(list[0]) : "") + "</div>" +
      '<section class="v4-ledger-box">' +
      '<div class="v4-panel-h"><h2>证据台账<em>这条链路留下的东西</em></h2><span class="v4-badge">' + list.length + " 次复盘</span></div>" +
      (recent ? '<ul class="v4-recent">' + recent + "</ul>" : '<p class="v4-note">还没有记录。复盘一次，这里会留下题目、分数和建议。</p>') +
      '<div class="v4-row"><button class="v4-btn" data-v4-export>导出证据台账（txt）</button>' +
      '<button class="v4-btn ghost" data-v4-tab="check">回到 01 再核一次 →</button></div>' +
      '<p class="v4-note">台账只存在你自己的浏览器里，导出的文件可以自己存档或发给朋友帮忙看。</p>' +
      "</section>"
    );
  }

  function runProof() {
    const q = (document.getElementById("v4-q")?.value || "").trim();
    const a = (document.getElementById("v4-a")?.value || "").trim();
    const out = document.getElementById("v4-out3");
    if (!out) return;
    if (a.length < 20) {
      toast("回答太短，至少写两句话再复盘");
      return;
    }
    set("v4Q", q);
    set("v4A", a);
    const r = CORE().reviewAnswer({ question: q, answer: a, requirements: [] });
    const list = [Object.assign({ at: Date.now(), question: q || "未命名题目" }, r), ...reviews().slice(0, 9)];
    set("v4Reviews", list);
    out.innerHTML = reviewCard(list[0]);
    draw();
    setTimeout(() => document.getElementById("v4-out3")?.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
  }

  function exportLedger() {
    const list = reviews();
    const jd = get("v4Jd", "");
    const co = get("v4Company", "");
    const cv = get("v4Cv", "");
    const lines = ["【履历间 · 证据台账】", "导出时间：" + new Date().toLocaleString("zh-CN"), ""];
    if (jd) {
      const ledger = CORE().buildLedger({ jdText: jd, companyText: co, gaps: [] });
      lines.push("一、岗位核验（证据覆盖率 " + pct(ledger.coverage) + "，L1 " + ledger.byLevel.L1 + " · L2 " + ledger.byLevel.L2 + " · L3 " + ledger.byLevel.L3 + "）");
      ledger.rows.forEach((r, i) => lines.push("  " + (i + 1) + ". [" + r.level + "][" + r.sourceTier + "] " + r.title + "｜原句：" + r.quote.slice(0, 60)));
      lines.push("");
    }
    if (cv) {
      const reqs = jd.length >= 20 ? CORE().parseJD(jd).requirements.slice(0, 10) : [];
      const audit = CORE().auditResume(blocksOf(cv), reqs);
      lines.push("二、简历对照（覆盖 " + pct(audit.coverage) + "，缺口 " + audit.uncovered.length + " 条，无出处 " + audit.noSource.length + " 段）");
      audit.uncovered.slice(0, 5).forEach((u, i) => lines.push("  " + (i + 1) + ". " + u.text));
      lines.push("");
    }
    if (list.length) {
      lines.push("三、面试复盘（" + list.length + " 次）");
      list.forEach((r, i) => {
        lines.push("  " + (i + 1) + ". " + (r.question || "未命名题目") + "｜" + r.score + " 分 → 预估 " + r.estimate + "｜核实等级 " + (r.grade?.tier || "C"));
        (r.fixes || []).forEach((f) => lines.push("     · " + f));
      });
      lines.push("");
    }
    lines.push("口径：以上每条都保留原句；误伤率、采纳率为待测项，需在真实标注样本上测算。");
    copy(lines.join("\n"), "证据台账已复制，可粘进文档存档");
  }

  /* ---------------- 渲染与事件 ---------------- */

  const state = { tab: "check" };

  function draw() {
    let board = document.getElementById("v4-board");
    if (!board) {
      board = document.createElement("section");
      board.id = "v4-board";
      const layout = document.getElementById("layout");
      (layout || document.body).append(board);
    }
    board.innerHTML =
      head() +
      '<div class="v4-stage">' +
      (state.tab === "check" ? checkTab() : state.tab === "align" ? alignTab() : proofTab()) +
      "</div>" +
      '<footer class="v4-foot">口径说明：能当场算的指标（覆盖率、命中数、缺口数）直接算给你看；误伤率、采纳率、面试邀约变化必须在真实标注样本上测算，标为「待测」，不预填数字。改写后的分数一律标「预估」。</footer>';
    document.body.classList.add("v4-mode");
  }

  function bind() {
    document.addEventListener("click", (e) => {
      const t = e.target.closest("[data-v4-tab],[data-v4-run-check],[data-v4-run-align],[data-v4-run-proof],[data-v4-sample],[data-v4-copy],[data-v4-copy-card],[data-v4-copy-align],[data-v4-export]");
      if (!t) return;
      if (t.dataset.v4Tab) {
        state.tab = t.dataset.v4Tab;
        draw();
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (t.hasAttribute("data-v4-run-check")) return runCheck();
      if (t.hasAttribute("data-v4-run-align")) return runAlign();
      if (t.hasAttribute("data-v4-run-proof")) return runProof();
      if (t.dataset.v4Sample) {
        const kind = t.dataset.v4Sample;
        if (kind === "check") {
          document.getElementById("v4-jd").value = SAMPLE_JD;
          document.getElementById("v4-co").value = SAMPLE_COMPANY;
          runCheck();
        }
        if (kind === "align") {
          document.getElementById("v4-jd2").value = get("v4Jd", "") || SAMPLE_JD;
          document.getElementById("v4-cv").value = SAMPLE_RESUME;
          runAlign();
        }
        if (kind === "proof") {
          document.getElementById("v4-q").value = SAMPLE_QUESTION;
          document.getElementById("v4-a").value = SAMPLE_ANSWER;
          runProof();
        }
        return;
      }
      if (t.dataset.v4Copy) return copy(t.dataset.v4Copy, "已复制");
      if (t.hasAttribute("data-v4-copy-card")) {
        const pre = document.getElementById("v4-cardtext");
        return copy(pre ? pre.textContent : "", "风险卡片已复制");
      }
      if (t.hasAttribute("data-v4-copy-align")) return copy(alignText(), "对齐建议已复制");
      if (t.hasAttribute("data-v4-export")) return exportLedger();
    });
  }

  function boot() {
    bind();
    draw();
    window.addEventListener("hashchange", () => {
      const h = (location.hash || "").slice(1);
      if (h === "align" || h === "proof" || h === "check") {
        state.tab = h;
        draw();
      }
    });
    /* 一键示例：?demo=check|align|proof，分享出去对方点开就能看到结果 */
    const demo = new URLSearchParams(location.search).get("demo");
    if (demo === "align") {
      state.tab = "align";
      draw();
      const jd = document.getElementById("v4-jd2");
      const cv = document.getElementById("v4-cv");
      if (jd && cv) {
        jd.value = SAMPLE_JD;
        cv.value = SAMPLE_RESUME;
        runAlign();
      }
    } else if (demo === "proof") {
      state.tab = "proof";
      draw();
      const q = document.getElementById("v4-q");
      const a = document.getElementById("v4-a");
      if (q && a) {
        q.value = SAMPLE_QUESTION;
        a.value = SAMPLE_ANSWER;
        runProof();
      }
    } else if (demo === "check") {
      const jd = document.getElementById("v4-jd");
      const co = document.getElementById("v4-co");
      if (jd && co) {
        jd.value = SAMPLE_JD;
        co.value = SAMPLE_COMPANY;
        runCheck();
      }
    }
  }

  window.V4 = { boot, draw, runCheck, runAlign, runProof };
})();
