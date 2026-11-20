/**
 * v3 界面层：三条证据链
 * 1) 岗位反向尽调：证据台账 + 分级信号 + 当面话术 + 一页式风险卡
 * 2) 简历–JD 证据对照：对照表 + 匹配雷达（每维带依据）+ 缺口优先级
 * 3) 面试复盘证据链：逐题诊断 + STAR 改写 + 追问预测 + 核实等级分布
 * 版本切换：V1（原版）/ V2（证据版）/ V3（证据链）
 */
(() => {
  "use strict";
  const A = () => window.App;
  const get = (k, d) => A().get(k, d);
  const set = (k, v) => A().set(k, v);
  const esc = (s) => A().esc(s);
  const icon = (n, s) => A().icon(n, s);

  const PAGES = { home: "链路总览", library: "经历体检", match: "岗位尽调", resume: "简历对照", interview: "面试复盘" };
  const LEVEL_TONE = { L1: "hot", L2: "warn", L3: "calm" };
  const TIER_TONE = { A: "ok", B: "warn", C: "calm", D: "hot" };

  let online = false;

  async function probe() {
    try {
      const r = await fetch("/api/health", { cache: "no-store" });
      const d = await r.json();
      online = !!(d && d.ok);
    } catch {
      online = false;
    }
  }

  async function call(name, payload) {
    if (online) {
      try {
        const r = await fetch("/api/" + name, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        const d = await r.json();
        if (d?.ok) return d.data;
      } catch {
        /* 回落到本地计算 */
      }
    }
    const E = window.EvidenceCore;
    if (name === "ledger") return E.buildLedger(payload);
    if (name === "radar") return E.radarDims(payload);
    if (name === "resume/audit") return E.auditResume(payload.blocks || [], payload.requirements || []);
    if (name === "interview/review") return E.reviewAnswer(payload);
    if (name === "library/audit") return E.libraryAudit(payload.materials, payload.experiences);
    if (name === "risk/scan") return E.scanRisk(payload.text);
    return null;
  }

  function copy(text, tip) {
    const fire = () => A().toast(tip || "已复制");
    if (navigator.clipboard?.writeText)
      navigator.clipboard.writeText(text).then(fire, () => fallbackCopy(text, fire));
    else fallbackCopy(text, fire);
  }
  function fallbackCopy(text, done) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;opacity:0";
    document.body.append(ta);
    ta.select();
    try {
      document.execCommand("copy");
      done();
    } catch {
      A().toast("复制失败，请手动选中");
    }
    ta.remove();
  }

  /* ---------- 小组件 ---------- */

  function card(title, body, foot) {
    return (
      '<section class="v3-card">' +
      '<header class="v3-head"><b>' + title + "</b>" + (foot || "") + "</header>" +
      '<div class="v3-body">' + body + "</div></section>"
    );
  }
  function chip(text, tone) {
    return '<span class="v3-chip ' + (tone || "") + '">' + esc(text) + "</span>";
  }
  function levelChip(lv) {
    return '<span class="v3-lv ' + (LEVEL_TONE[lv] || "calm") + '">' + lv + "</span>";
  }
  function tierChip(tier) {
    const t = window.EvidenceCore.SOURCE_TIERS[tier] || { label: tier };
    return '<span class="v3-tier ' + (TIER_TONE[tier] || "calm") + '">' + esc(t.label) + "</span>";
  }
  function kpi(label, value, note) {
    return (
      '<div class="v3-kpi"><small>' + label + '</small><b>' + value + "</b>" +
      (note ? "<span>" + note + "</span>" : "") + "</div>"
    );
  }
  function pct(v) {
    return Math.round((v || 0) * 100) + "%";
  }

  /* ---------- 1. 岗位反向尽调 ---------- */

  function companyText() {
    return get("v3CompanyText", "");
  }

  function matchPanel() {
    const target = get("target", null);
    if (!target) {
      return card(
        "岗位尽调 <em>证据台账 · 风险分级 · 当面话术</em>",
        '<p class="v3-empty">先在岗位匹配台选定一个目标岗位，我会把 JD 和公司材料拆成一本可核对的台账。</p>' +
          '<button class="v3-btn" data-v3-go="match">去选目标岗位</button>',
      );
    }
    const jd = target.text || "";
    const reqs = target.requirements || [];
    const exprs = get("experiences", []);
    const m = window.EvidenceCore.matchAll(reqs, exprs);
    const gaps = m.rows.map((r) => ({
      text: r.requirement,
      level: r.level,
      covered: r.kind === "direct",
      source:
        r.kind === "direct" ? "经历库 · 已挂原件的直接证据" : r.kind === "partial" ? "经历库 · 只有间接证据" : "经历库 · 无对应经历",
      sourceTier: r.kind === "direct" ? "A" : r.kind === "partial" ? "C" : "D",
    }));
    const ledger = window.EvidenceCore.buildLedger({
      jdText: jd,
      companyText: companyText(),
      gaps: gaps.slice(0, 6),
    });

    const rows = ledger.rows
      .map(
        (r) =>
          '<tr class="lvl-' + r.level.toLowerCase() + '">' +
          "<td>" + levelChip(r.level) + "<small>" + (r.type === "risk" ? "风险条款" : r.type === "claim" ? "公司陈述" : "证据缺口") + "</small></td>" +
          "<td><b>" + esc(r.title) + "</b><p class=\"v3-q\">" + esc(r.quote).slice(0, 80) + "</p></td>" +
          "<td>" + tierChip(r.sourceTier) + "<small>" + esc(r.source) + "</small></td>" +
          '<td><span class="v3-ask">' + esc(r.ask) + "</span></td>" +
          '<td><button class="v3-mini" data-v3-copy="' + esc(r.ask) + '">复制问法</button></td>' +
          "</tr>",
      )
      .join("");

    const tiers = ["A", "B", "C", "D"]
      .map((t) => chip(window.EvidenceCore.SOURCE_TIERS[t].label + " " + (ledger.tiers[t] || 0), t === "D" ? "hot" : t === "B" ? "warn" : "ok"))
      .join("");

    return card(
      "岗位尽调 <em>证据台账 · 风险分级 · 当面话术</em>",
      '<div class="v3-kpis">' +
        kpi("证据覆盖率", pct(ledger.coverage), ledger.coveredCount + " / " + ledger.total + " 条结论能指回出处") +
        kpi("风险命中", ledger.byLevel.L1 + ledger.byLevel.L2 + ledger.byLevel.L3, "L1 " + ledger.byLevel.L1 + " · L2 " + ledger.byLevel.L2 + " · L3 " + ledger.byLevel.L3) +
        kpi("标注误伤率", "待测", "需在真实标注样本上跑") +
        kpi("报告采纳率", "待测", "上线后按下载/复制统计") +
        "</div>" +
        '<div class="v3-tiers"><span>来源构成</span>' + tiers + "</div>" +
        '<div class="v3-ledger"><table><thead><tr><th>等级</th><th>条款 / 结论</th><th>来源</th><th>当面怎么问</th><th></th></tr></thead><tbody>' +
        rows + "</tbody></table></div>" +
        '<div class="v3-actions">' +
        '<button class="v3-btn primary" data-v3-card>生成一页式风险卡片</button>' +
        '<button class="v3-btn" data-v3-goto="resume">拿去做简历对照</button>' +
        "</div>" +
        '<div class="v3-company"><label>公司材料（招聘页、公告、新闻，一行一句）' +
        '<textarea data-v3-company rows="3" placeholder="粘贴公司自述的规模、融资、团队人数等信息，用来生成可核对的陈述行">' +
        esc(companyText()) + "</textarea></label>" +
        '<button class="v3-btn small" data-v3-savecompany>保存材料</button></div>',
      '<span class="v3-meta">' + esc(target.company + " · " + target.role) + " · 每条结论都可回溯到原句</span>",
    );
  }

  function riskCardText() {
    const target = get("target", null) || {};
    const jd = target.text || "";
    const ledger = window.EvidenceCore.buildLedger({ jdText: jd, companyText: companyText(), gaps: [] });
    const lines = [];
    lines.push("【岗位风险卡片】" + (target.company || "") + " · " + (target.role || ""));
    lines.push("证据覆盖率 " + pct(ledger.coverage) + "（" + ledger.coveredCount + "/" + ledger.total + "）｜L1 " + ledger.byLevel.L1 + " · L2 " + ledger.byLevel.L2 + " · L3 " + ledger.byLevel.L3);
    lines.push("");
    ledger.asks.forEach((a, i) => {
      lines.push((i + 1) + ". [" + a.level + "] " + a.title);
      lines.push("   原句：" + a.quote);
      lines.push("   当面问：" + a.ask);
    });
    if (!ledger.asks.length) lines.push("暂无 L1/L2/L3 命中，仍建议核对合同主体与社保缴纳方式。");
    lines.push("");
    lines.push("结论口径：以上均有 JD 原句可回溯；未标注来源的条目未列入。");
    return lines.join("\n");
  }

  /* ---------- 2. 简历–JD 对照 ---------- */

  function resumePanel() {
    const draft = get("resumeDraft", null);
    const target = get("target", null);
    if (!draft) {
      return card(
        "简历–JD 对照 <em>逐条要求对证据</em>",
        '<p class="v3-empty">还没有简历稿。去简历优化台新建一份，我会把每条 JD 要求和你已有的证据对齐。</p>' +
          '<button class="v3-btn" data-v3-go="resume">去写简历</button>',
      );
    }
    const blocks = draft.blocks || [];
    const reqs = (target?.requirements || []).slice(0, 8);
    const mats = get("materials", []);
    const radar = window.EvidenceCore.radarDims({ blocks, requirements: reqs, materials: mats });
    const audit = radar.audit;

    const rows = audit.requirementRows
      .map((r) => {
        const ev = blocks.find((b) => (b.text || "").includes(r.text.slice(0, 4)));
        return (
          "<tr>" +
          "<td>" + esc(r.text) + "</td>" +
          "<td>" + (ev ? '<span class="v3-src">' + esc((ev.source || "简历正文").slice(0, 24)) + "</span>" : '<span class="v3-none">无对应段落</span>') + "</td>" +
          "<td>" + (r.covered ? chip("已覆盖", "ok") : chip("缺口", "hot")) + "</td>" +
          "</tr>"
        );
      })
      .join("");

    const gaps = audit.uncovered
      .map((u, i) => '<li><b>' + (i + 1) + "</b><span>" + esc(u.text) + "</span><small>建议：从经历库找一条最接近的，补一句结果数字</small></li>")
      .join("");

    return card(
      "简历–JD 对照 <em>逐条要求对证据</em>",
      '<div class="v3-kpis">' +
        kpi("JD 覆盖度", pct(audit.coverage), audit.requirementRows.filter((r) => r.covered).length + " / " + audit.requirementRows.length + " 条") +
        kpi("证据缺口", audit.uncovered.length, "按优先级列在下方") +
        kpi("无出处段落", audit.noSource.length, "定稿前建议挂原件") +
        kpi("建议采纳率", "待测", "上线后按应用次数统计") +
        "</div>" +
        '<div class="v3-radar">' + radarSvg(radar.dims) + "</div>" +
        '<h4 class="v3-sub">JD–证据对照表</h4>' +
        '<div class="v3-ledger"><table><thead><tr><th>JD 要求</th><th>对应证据</th><th>判定</th></tr></thead><tbody>' + rows + "</tbody></table></div>" +
        '<h4 class="v3-sub">缺口清单（按优先级）</h4>' +
        (gaps ? '<ul class="v3-gaps">' + gaps + "</ul>" : '<p class="v3-pass">每条要求都有对应段落，可以定稿了。</p>') +
        '<div class="v3-actions"><button class="v3-btn primary" data-v3-rpt>复制对齐建议</button></div>',
      '<span class="v3-meta">雷达每一维都附依据，不做无理由打分</span>',
    );
  }

  function radarSvg(dims) {
    const size = 300, cx = 150, cy = 140, R = 96;
    const n = dims.length;
    const angle = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const pt = (i, r) => [cx + Math.cos(angle(i)) * r, cy + Math.sin(angle(i)) * r];
    const grid = [0.25, 0.5, 0.75, 1]
      .map((k) =>
        '<polygon points="' + dims.map((_, i) => pt(i, R * k).join(",")).join(" ") + '" fill="none" stroke="#e2e6db"/>',
      )
      .join("");
    const shape = dims
      .map((d, i) => pt(i, R * Math.max(0.12, Math.min(1, d.score))).join(","))
      .join(" ");
    const labels = dims
      .map((d, i) => {
        const [x, y] = pt(i, R + 26);
        return '<text x="' + x + '" y="' + y + '" text-anchor="middle" font-size="10.5" fill="#5d6b5f">' + esc(d.dim) + "</text>";
      })
      .join("");
    return (
      '<svg viewBox="0 0 300 300" class="v3-radar-svg" role="img" aria-label="简历匹配雷达">' +
      grid +
      '<polygon points="' + shape + '" fill="rgba(55,95,70,.18)" stroke="#375f46" stroke-width="1.4"/>' +
      dims.map((d, i) => {
        const [x, y] = pt(i, R * Math.max(0.12, Math.min(1, d.score)));
        return '<circle cx="' + x + '" cy="' + y + '" r="3" fill="#375f46"/>';
      }).join("") +
      labels +
      "</svg>" +
      '<ul class="v3-basis">' +
      dims.map((d) => "<li><b>" + esc(d.dim) + "</b><span>" + esc(d.basis) + "</span><i>" + pct(d.score) + "</i></li>").join("") +
      "</ul>"
    );
  }

  function alignReportText() {
    const draft = get("resumeDraft", null) || {};
    const target = get("target", null) || {};
    const reqs = target.requirements || [];
    const audit = window.EvidenceCore.auditResume(draft.blocks || [], reqs);
    const lines = ["【简历对齐建议】" + (draft.title || "简历") + " → " + (target.company || "") + " · " + (target.role || "")];
    lines.push("JD 覆盖 " + pct(audit.coverage) + "（" + audit.requirementRows.length + " 条要求）｜无出处 " + audit.noSource.length + " 段｜缺数字 " + audit.noMetric.length + " 段");
    if (audit.uncovered.length) {
      lines.push("");
      lines.push("未覆盖的要求（优先补）：");
      audit.uncovered.slice(0, 6).forEach((u, i) => lines.push("  " + (i + 1) + ". " + u.text));
    }
    if (audit.noSource.length) {
      lines.push("");
      lines.push("没有出处的段落（建议先挂原件再改）：");
      audit.noSource.slice(0, 4).forEach((b) => lines.push("  · " + (b.text || "").slice(0, 40)));
    }
    lines.push("");
    lines.push("改法：每条未覆盖的要求，从经历库挑最接近的一条，把「做了什么 + 结果数字」写成一句话；没有证据的要求不要硬编。");
    return lines.join("\n");
  }

  /* ---------- 3. 面试复盘 ---------- */

  function reviews() {
    return get("v3Reviews", []);
  }

  function interviewPanel() {
    const target = get("target", null);
    const reqs = (target?.requirements || []).slice(0, 8);
    const bank = window.EvidenceCore.QUESTION_BANK;
    const options = (reqs.length ? reqs : bank.map((b) => b.q))
      .map((r) => '<option value="' + esc(typeof r === "string" ? r : r.q) + '">' + esc(typeof r === "string" ? r : r.q) + "</option>")
      .join("");
    const list = reviews();
    const mix = window.EvidenceCore.credibilityMix(list);
    const latest = list[0];
    const latestCard = latest ? reviewCard(latest, true) : "";
    const mixBars = mix
      .map(
        (m) =>
          '<div class="v3-bar"><span>' + esc(m.label) + "</span><i style=\"width:" + Math.round(m.share * 100) + '%"></i><b>' + m.count + "</b></div>",
      )
      .join("");

    return card(
      "面试复盘证据链 <em>逐题诊断 · 改写 · 追问预测</em>",
      '<div class="v3-diag"><label>题目<select data-v3-q>' + options + "</select></label>" +
        '<label>你的回答<textarea data-v3-a rows="4" placeholder="把口述内容打出来，越具体越能发现缺口"></textarea></label>' +
        '<button class="v3-btn primary" data-v3-run>复盘这条回答</button></div>' +
        '<div data-v3-result>' + latestCard + "</div>" +
        '<h4 class="v3-sub">核实等级分布（' + list.length + " 次复盘）</h4>" +
        '<div class="v3-mix">' + mixBars + "</div>" +
        '<p class="v3-note">A 来自该岗位 JD 原文；B 来自面经合集，需要你自己核对是否同岗位；C 是通用题，不代表这家公司。等级不是装饰，是用来判断这条经验值不值得照着准备。</p>',
      '<span class="v3-meta">' + icon("info", 13) + " 复盘记录只留本机，不上传</span>",
    );
  }

  function reviewCard(r, fresh) {
    const st = r.star || {};
    const cells = ["S", "T", "A", "R"]
      .map((k) => '<div class="v3-star ' + (st[k] ? "on" : "off") + '"><b>' + k + "</b></div>")
      .join("");
    const parts = (r.rewrite?.parts || [])
      .map((p) => '<li><b>' + esc(p.key) + "</b><span>" + esc(p.text) + "</span></li>")
      .join("");
    const grade = r.grade || {};
    return (
      '<div class="v3-review ' + (fresh ? "fresh" : "") + '">' +
      '<div class="v3-review-top">' +
      '<div class="v3-score"><b>' + r.score + '</b><span>当前 / 100</span></div>' +
      '<div class="v3-compare"><div><i style="width:' + Math.max(6, r.score) + '%"></i></div><div class="after"><i style="width:' + Math.max(6, r.estimate) + '%"></i></div>' +
      '<small>改写后预估 ' + r.estimate + "（预估，不是实测）</small></div>" +
      '<div class="v3-grade">' + tierChip(grade.tier || "C") + "<small>" + esc(grade.source || "") + "</small></div>" +
      "</div>" +
      '<div class="v3-stars">' + cells + "</div>" +
      (r.fixes?.length ? '<ul class="v3-fixes">' + r.fixes.map((f) => "<li>" + esc(f) + "</li>").join("") + "</ul>" : '<p class="v3-pass">结构完整，可以直接练口述。</p>') +
      '<h4 class="v3-sub">按 STAR 改写（缺的格子留成待补，不替你编）</h4><ul class="v3-parts">' + parts + "</ul>" +
      '<h4 class="v3-sub">可能被追问</h4><ol class="v3-follow">' + (r.followUps || []).map((f) => "<li>" + esc(f) + "</li>").join("") + "</ol>" +
      '<div class="v3-actions"><button class="v3-mini" data-v3-copy="' + esc((r.rewrite?.text || "")) + '">复制改写稿</button></div>' +
      "</div>"
    );
  }

  async function runReview(host) {
    const q = host.querySelector("[data-v3-q]")?.value || "";
    const a = host.querySelector("[data-v3-a]")?.value.trim() || "";
    const out = host.querySelector("[data-v3-result]");
    if (!out) return;
    if (a.length < 20) {
      A().toast("回答太短，至少写两句话再复盘");
      return;
    }
    out.innerHTML = '<p class="v3-pass">正在拆这条回答…</p>';
    try {
      const target = get("target", null) || {};
      const r = await call("interview/review", { question: q, answer: a, requirements: target.requirements || [] });
      if (!r || typeof r.score !== "number") throw new Error("bad result");
      const list = [Object.assign({ at: Date.now() }, r), ...reviews().slice(0, 9)];
      set("v3Reviews", list);
      out.innerHTML = reviewCard(list[0], true);
      draw();
    } catch {
      out.innerHTML = '<p class="v3-pass">这条没跑通，稍后再试一次。</p>';
    }
  }

  /* ---------- 总览：卖点与链路 ---------- */

  function homePanel() {
    const steps = [
      { n: "01", t: "识坑核验", d: "JD 与公司材料进台账，L1/L2/L3 分级，每条都有原句可回溯" },
      { n: "02", t: "简历对齐岗位", d: "逐条要求对证据，缺口按优先级排，不硬编经历" },
      { n: "03", t: "面试逐题复盘", d: "STAR 改写、追问预测，面经标核实等级" },
      { n: "04", t: "Offer 前再核验", d: "把谈到的口径再拉回台账，确认和一开始说的一致" },
    ];
    return card(
      '证据链总览 <em>求职每一步，结论都有出处</em>',
      '<p class="v3-claim">不替你吹牛，只帮你核实和说清。</p>' +
        '<div class="v3-steps">' +
        steps.map((s) => '<article><b>' + s.n + "</b><strong>" + s.t + "</strong><p>" + s.d + "</p></article>").join("") +
        "</div>" +
        '<div class="v3-trust">' +
        "<span>可信：结论可溯源、分等级、人工可兜底</span><span>有用：直接产出投递与面谈材料</span><span>安全：不碰隐私、不绕登录、不承诺包过</span>" +
        "</div>",
    );
  }

  /* ---------- 装配 ---------- */

  function stripEl() {
    let el = document.querySelector("#v3-strip");
    if (!el) {
      el = document.createElement("div");
      el.id = "v3-strip";
      const layout = document.querySelector("#layout");
      layout.insertBefore(el, layout.querySelector("#main"));
    }
    return el;
  }

  function draw() {
    const page = (location.hash || "#home").slice(1) || "home";
    const el = stripEl();
    if (!PAGES[page]) {
      el.innerHTML = "";
      el.hidden = true;
      return;
    }
    el.hidden = false;
    const body =
      page === "match" ? matchPanel() :
      page === "resume" ? resumePanel() :
      page === "interview" ? interviewPanel() :
      page === "home" ? homePanel() :
      libraryPanel();
    el.innerHTML = '<div class="v3-wrap">' + body + "</div>";
  }

  function libraryPanel() {
    const mats = get("materials", []);
    const exps = get("experiences", []);
    const a = window.EvidenceCore.libraryAudit(mats, exps);
    return card(
      "经历体检 <em>证据可回溯率</em>",
      '<div class="v3-kpis">' +
        kpi("材料已核对", pct(a.verifiedRate), a.materials + " 份") +
        kpi("经历挂原件", pct(a.sourcedRate), a.experiences + " 条") +
        kpi("可量化", pct(a.metricRate), "带数字的结果") +
        "</div>" +
        '<ul class="v3-gaps">' +
        (a.pending.length ? '<li><b>待核对</b><span>' + a.pending.slice(0, 3).map((m) => esc(m.name || "材料")).join(" / ") + "</span></li>" : "") +
        (a.sourceless.length ? '<li><b>无来源</b><span>' + a.sourceless.slice(0, 3).map((e) => esc((e.title || "").slice(0, 20))).join(" / ") + "</span></li>" : "") +
        (a.vague.length ? '<li><b>缺量化</b><span>' + a.vague.slice(0, 3).map((e) => esc((e.title || "").slice(0, 20))).join(" / ") + "</span></li>" : "") +
        "</ul>" +
        '<p class="v3-note">只有挂到原件的表述才算证据。缺口不会自动补齐，得你补材料。</p>',
    );
  }

  /* ---------- 版本切换 ---------- */

  const VERSIONS = [
    { id: "v1", label: "V1", href: "__v1__/index.html", title: "原始版" },
    { id: "v2", label: "V2", href: "__v2__/index.html", title: "证据版" },
    { id: "v3", label: "V3", href: "", title: "证据链" },
  ];

  function mountSwitch() {
    const bar = document.querySelector("#top .top-actions");
    if (!bar) return;
    if (!bar.querySelector("[data-v3-switch]"))
      bar.insertAdjacentHTML("beforeend", '<div class="v3-switch" data-v3-switch></div>');
    const box = bar.querySelector("[data-v3-switch]");
    const page = (location.hash || "#home").slice(1);
    box.innerHTML = VERSIONS.map(
      (v) =>
        '<a href="' + (v.href || "index.html") + "#" + page + '" title="' + v.title + '"' +
        (v.id === "v3" ? ' class="on"' : "") + ">" + v.label + "</a>",
    ).join("");
  }

  function bindActions() {
    document.addEventListener("click", (e) => {
      const t = e.target.closest("[data-v3-copy],[data-v3-go],[data-v3-goto],[data-v3-card],[data-v3-rpt],[data-v3-savecompany],[data-v3-run]");
      if (!t) return;
      if (t.hasAttribute("data-v3-copy")) return copy(t.dataset.v3Copy, "已复制");
      if (t.hasAttribute("data-v3-go")) return A().go(t.dataset.v3Go);
      if (t.hasAttribute("data-v3-goto")) return A().go(t.dataset.v3Goto);
      if (t.hasAttribute("data-v3-card")) return copy(riskCardText(), "风险卡片已复制");
      if (t.hasAttribute("data-v3-rpt")) return copy(alignReportText(), "对齐建议已复制");
      if (t.hasAttribute("data-v3-savecompany")) {
        const box = document.querySelector("[data-v3-company]");
        set("v3CompanyText", box ? box.value.trim() : "");
        A().toast("公司材料已保存");
        return draw();
      }
      if (t.hasAttribute("data-v3-run")) return runReview(stripEl());
    });
  }

  function boot() {
    probe();
    const render = A().render;
    A().render = function () {
      render.apply(this, arguments);
      mountSwitch();
      draw();
    };
    mountSwitch();
    draw();
    window.addEventListener("hashchange", () => {
      mountSwitch();
      draw();
    });
    bindActions();
  }

  window.V3 = { boot, draw, call, online: () => online };
})();
