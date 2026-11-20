/**
 * v2 界面层
 * 1) 版本切换：V2（当前，证据版）↔ V1（冻结快照，原界面）
 * 2) 四个模块的证据能力：经历体检、岗位核验、投递自检、回答诊断
 * 只读取既有数据（materials / experiences / jds / target / resumeDraft），不改动 v1 的任何逻辑。
 */
(() => {
  "use strict";
  const A = () => window.App;
  const get = (k, d) => A().get(k, d);
  const esc = (s) => A().esc(s);
  const icon = (n, s) => A().icon(n, s);

  const PAGES = {
    library: "经历体检",
    match: "岗位核验",
    resume: "投递自检",
    interview: "回答诊断",
  };
  const LEVEL_TONE = { L1: "hot", L2: "warn", L3: "calm" };

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
        /* 降级到本地计算 */
      }
    }
    const E = window.EvidenceCore;
    if (name === "risk/scan") return E.scanRisk(payload.text);
    if (name === "jd/parse") return E.parseJD(payload.text);
    if (name === "match") return E.matchAll(payload.requirements || [], payload.experiences || []);
    if (name === "resume/audit")
      return E.auditResume(payload.blocks || [], payload.requirements || []);
    if (name === "interview/diagnose") return E.diagnoseAnswer(payload.question, payload.answer);
    if (name === "library/audit") return E.libraryAudit(payload.materials, payload.experiences);
    return null;
  }

  /* ---------- 版本切换 ---------- */

  function switchMarkup() {
    return (
      '<a class="v2-switch" data-v2-switch href="__v1__/index.html#home" title="切换版本：V2 证据版 / V1 原版">' +
      '<b>V2</b><span>证据版</span><i>⇄ V1</i></a>'
    );
  }

  /** 切换按钮是普通链接，跟着当前页走，不依赖脚本也能点 */
  function syncSwitch() {
    const a = document.querySelector("[data-v2-switch]");
    if (a) a.setAttribute("href", "__v1__/index.html" + (location.hash || "#home"));
  }

  function mountSwitch() {
    const bar = document.querySelector("#top .top-actions");
    if (!bar) return;
    if (!bar.querySelector("[data-v2-switch]")) bar.insertAdjacentHTML("beforeend", switchMarkup());
    syncSwitch();
  }

  function goV1() {
    const page = (location.hash || "#home").slice(1);
    location.href = "__v1__/index.html#" + page;
  }

  /* ---------- 通用小组件 ---------- */

  const pct = (v) => Math.round(Math.max(0, Math.min(1, v || 0)) * 100) + "%";
  function bar(value, tone = "") {
    return (
      '<div class="v2-bar ' +
      tone +
      '"><i style="width:' +
      pct(value) +
      '"></i></div>'
    );
  }
  function levelChip(level) {
    const l = window.EvidenceCore.LEVELS[level] || {};
    return (
      '<span class="v2-lv ' + (LEVEL_TONE[level] || "") + '" title="' +
      esc(l.note || "") + '">' + esc(level) + "</span>"
    );
  }
  function card(title, body, foot) {
    return (
      '<section class="v2-card"><header><h3>' +
      title +
      '</header><div class="v2-card-body">' +
      body +
      "</div>" +
      (foot ? '<footer class="v2-card-foot">' + foot + "</footer>" : "") +
      "</section>"
    );
  }
  function kpi(label, value, hint) {
    return (
      '<div class="v2-kpi"><small>' +
      esc(label) +
      "</small><strong>" +
      esc(value) +
      "</strong>" +
      (hint ? "<em>" + esc(hint) + "</em>" : "") +
      "</div>"
    );
  }
  function copy(text, okMsg) {
    const done = () => A().toast(okMsg || "已复制");
    if (navigator.clipboard?.writeText)
      navigator.clipboard.writeText(text).then(done, () => A().toast("复制失败，请手动选择"));
    else {
      const t = document.createElement("textarea");
      t.value = text;
      document.body.append(t);
      t.select();
      document.execCommand("copy");
      t.remove();
      done();
    }
  }

  /* ---------- 1. 经历体检 ---------- */

  function libraryPanel() {
    const E = window.EvidenceCore;
    const data = E.libraryAudit(get("materials", []), get("experiences", []));
    if (!data.materials && !data.experiences)
      return card(
        "经历体检",
        '<p class="v2-muted">还没有材料。先添加一份真实材料，后面三个模块才有可回溯的证据。</p>',
        '<button class="v2-btn" data-go="library">去添加材料</button>',
      );
    const kpis =
      kpi("材料已核对", pct(data.verifiedRate), data.materials + " 份") +
      kpi("经历挂原件", pct(data.sourcedRate), data.experiences + " 条") +
      kpi("可量化", pct(data.metricRate), "带数字的结果");
    const chips =
      '<div class="v2-chips">' +
      '<span class="v2-chip">待核对材料 <b>' + data.pending.length + "</b></span>" +
      '<span class="v2-chip">无来源经历 <b>' + data.sourceless.length + "</b></span>" +
      '<span class="v2-chip">缺量化 <b>' + data.vague.length + "</b></span>" +
      "</div>";
    const todo = [];
    if (data.pending[0])
      todo.push(
        '<button class="v2-row" data-v2-open-material="' + esc(data.pending[0].id) + '">' +
          icon("file", 16) +
          "<span><b>核对原文</b><small>" + esc(data.pending[0].name) + "</small></span>" +
          icon("chevron", 14) +
          "</button>",
      );
    if (data.sourceless[0])
      todo.push(
        '<button class="v2-row" data-v2-open-exp="' + esc(data.sourceless[0].id) + '">' +
          icon("book", 16) +
          "<span><b>补一条来源</b><small>" + esc(data.sourceless[0].title) + " 尚未挂原件</small></span>" +
          icon("chevron", 14) +
          "</button>",
      );
    if (data.vague[0])
      todo.push(
        '<div class="v2-row static">' + icon("sparkles", 16) +
          "<span><b>补一个数字</b><small>" + esc(data.vague[0].title) + " 没有可验证的量化结果</small></span></div>",
      );
    return card(
      "经历体检 <em>证据可回溯率</em>",
      '<div class="v2-kpis">' + kpis + "</div>" +
        bar(data.verifiedRate, "ok") +
        chips +
        (todo.join("") || '<p class="v2-muted">材料都挂上了来源，可以进入岗位核验。</p>'),
      '<span class="v2-meta">' + icon("info", 13) + " 只有挂到原件的表述才算 L1</span>",
    );
  }

  /* ---------- 2. 岗位核验 ---------- */

    function matchPanel() {
    const target = get("target", null);
    if (!target || !target.role)
      return card(
        "岗位核验",
        '<p class="v2-muted">先在岗位匹配台选定一个目标岗位，我会逐条核验 JD 里的风险条款，并给出可以当面问出口的话术。</p>',
        '<button class="v2-btn" data-go="match">去选目标岗位</button>',
      );
    const scan = window.EvidenceCore.scanRisk(target.text || "");
    const heads =
      '<div class="v2-head"><div><b>' + esc(target.company || "公司待确认") + " · " + esc(target.role) + "</b>" +
      '<small>' + esc(scan.verdict) + "</small></div>" +
      '<span class="v2-lvset">' +
      ["L1", "L2", "L3"].map((l) => levelChip(l) + "<b>" + scan.counts[l] + "</b>").join("") +
      "</span></div>";
    const hits = scan.hits
      .slice(0, 4)
      .map(
        (h) =>
          '<article class="v2-hit">' +
          '<div class="v2-hit-top">' + levelChip(h.level) + "<b>" + esc(h.label) + "</b>" +
          '<button class="v2-mini" data-v2-copy="' + esc(h.ask) + '">复制问法</button></div>' +
          '<p class="v2-quote">“' + esc(h.quote) + '”</p>' +
          '<small class="v2-ask">当面问：' + esc(h.ask) + "</small></article>",
      )
      .join("");
    const gaps = window.EvidenceCore.matchAll(
      target.requirements || [],
      get("experiences", []),
    );
    const gapList = gaps.gaps
      .slice(0, 3)
      .map(
        (g) =>
          '<li>' + levelChip(g.level) + "<span>" + esc(g.requirement || "未命中的要求") +
          "</span><small>" + (g.kind === "unknown" ? "无证据" : "只有间接证据") + "</small></li>",
      )
      .join("");
    return card(
      "岗位核验 <em>风险条款与证据缺口</em>",
      heads +
        (hits || '<p class="v2-muted">JD 里没有命中已知风险词。仍建议确认合同主体、社保起缴时间。</p>') +
        (gapList
          ? '<h4 class="v2-sub">优先补的缺口</h4><ul class="v2-gaps">' + gapList + "</ul>"
          : ""),
      '<button class="v2-btn" data-go="match">打开完整对照</button>' +
        '<button class="v2-btn ghost" data-go="resume">拿去改简历</button>',
    );
  }

  /* ---------- 3. 投递自检 ---------- */

  function resumePanel() {
    const draft = get("resumeDraft", null);
    const target = get("target", null);
    if (!draft)
      return card(
        "投递自检",
        '<p class="v2-muted">还没有简历底稿。先在简历优化台创建或导入一份，我会检查每段是否有出处、有数字、覆盖了 JD。</p>',
        '<button class="v2-btn" data-go="resume">去创建底稿</button>',
      );
    const audit = window.EvidenceCore.auditResume(
      draft.blocks || [],
      target?.requirements || [],
    );
    const kpis =
      kpi("JD 覆盖", pct(audit.coverage), audit.requirementRows.length + " 条要求") +
      kpi("无出处段落", audit.noSource.length, "建议挂原件") +
      kpi("缺数字段落", audit.noMetric.length, "补量化");
    const rows = audit.uncovered
      .slice(0, 3)
      .map((u) => '<li><span>' + esc(u.text) + "</span><small>JD 有、简历没写</small></li>")
      .join("");
    const noSrc = audit.noSource
      .slice(0, 2)
      .map((b) => '<li><span>' + esc((b.text || "").slice(0, 42)) + "…</span><small>没有出处</small></li>")
      .join("");
    const noNum = audit.noMetric
      .slice(0, 2)
      .map((b) => '<li><span>' + esc((b.text || "").slice(0, 42)) + "…</span><small>缺数字</small></li>")
      .join("");
    return card(
      "投递自检 <em>定稿前过一遍</em>",
      '<div class="v2-kpis">' + kpis + "</div>" +
        (rows ? '<h4 class="v2-sub">JD 未覆盖</h4><ul class="v2-gaps">' + rows + "</ul>" : "") +
        (noSrc ? '<h4 class="v2-sub">缺出处</h4><ul class="v2-gaps">' + noSrc + "</ul>" : "") +
        (noNum ? '<h4 class="v2-sub">缺数字</h4><ul class="v2-gaps">' + noNum + "</ul>" : "") +
        (audit.ready
          ? '<p class="v2-pass">' + icon("check", 15) + " 可以投了：要求全覆盖、段落有出处、结果有数字。</p>"
          : ""),
      '<button class="v2-btn ghost" data-v2-audit="copy">复制自检报告</button>' +
        '<button class="v2-btn" data-go="resume">回编辑器</button>',
    );
  }

  /* ---------- 4. 回答诊断 ---------- */

  function diagnoses() {
    return get("v2Diagnoses", []);
  }

  function interviewPanel() {
    const target = get("target", null);
    const reqs = (target?.requirements || []).slice(0, 8);
    const options = (
      reqs.length
        ? reqs.map((r) => '<option value="' + esc(r) + '">' + esc(r) + "</option>")
        : ["介绍一下你最有成就感的一段经历", "说一次你和别人意见不一致的经历", "讲一次失败，你学到了什么"].map(
            (q) => '<option value="' + esc(q) + '">' + esc(q) + "</option>",
          )
    ).join("");
    const last = diagnoses()[0];
    const result = last ? diagnosisResult(last, false) : "";
    return card(
      "回答诊断 <em>逐题拆 STAR 与追问</em>",
      '<div class="v2-diag"><label>题目<select data-v2-q>' + options + "</select></label>" +
        '<label>你的回答<textarea data-v2-a rows="4" placeholder="把口述内容打出来，越具体越能发现问题"></textarea></label>' +
        '<button class="v2-btn primary" data-v2-run>诊断这条回答</button></div>' +
        '<div data-v2-result>' + result + "</div>",
      '<span class="v2-meta">' + icon("info", 13) + " 诊断结果只留在这台设备，不上传</span>",
    );
  }

  function diagnosisResult(d, fresh) {
    const st = d.star || {};
    const cell = (k, label) =>
      '<div class="v2-star ' + (st[k] ? "on" : "off") + '"><b>' + k + "</b><span>" + label + "</span></div>";
    return (
      '<div class="v2-diag-out ' + (fresh ? "fresh" : "") + '">' +
      '<div class="v2-stars">' +
      cell("S", "情境") + cell("T", "任务") + cell("A", "行动") + cell("R", "结果") +
      "</div>" +
      '<div class="v2-score"><b>' + d.score + "</b><span>得分 / 100 · 量化 " +
      (d.metric ? "有" : "缺") + "</span></div>" +
      (d.fixes?.length
        ? '<ul class="v2-fixes">' + d.fixes.map((f) => "<li>" + esc(f) + "</li>").join("") + "</ul>"
        : '<p class="v2-pass">结构完整，可以拿去练口述了。</p>') +
      '<h4 class="v2-sub">可能被追问</h4><ol class="v2-follow">' +
      (d.followUps || []).map((f) => "<li>" + esc(f) + "</li>").join("") +
      "</ol>" +
      '<button class="v2-btn ghost" data-v2-copy="' +
      esc((d.fixes || []).join("；") || "结构完整") +
      '">复制改进清单</button>' +
      "</div>"
    );
  }

  async function runDiagnosis(host) {
    const q = host.querySelector("[data-v2-q]")?.value || "";
    const a = host.querySelector("[data-v2-a]")?.value.trim() || "";
    if (a.length < 20) return A().toast("回答太短，至少写两句话再诊断");
    const out = host.querySelector("[data-v2-result]");
    if (!out) return;
    out.innerHTML = '<p class="v2-pass">正在拆解这条回答…</p>';
    try {
      const d = await call("interview/diagnose", { question: q, answer: a });
      if (!d || typeof d.score !== "number") throw new Error("bad result");
      A().set("v2Diagnoses", [d, ...diagnoses().slice(0, 9)]);
      out.innerHTML = diagnosisResult(d, true);
    } catch (err) {
      out.innerHTML = '<p class="v2-pass">这条没跑通，稍后重试一次。</p>';
    }
  }

  /* ---------- 装配 ---------- */

  function stripEl() {
    let el = document.querySelector("#v2-strip");
    if (!el) {
      el = document.createElement("div");
      el.id = "v2-strip";
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
      page === "library" ? libraryPanel() :
      page === "match" ? matchPanel() :
      page === "resume" ? resumePanel() :
      interviewPanel();
    el.innerHTML = '<div class="v2-wrap">' + body + "</div>";
    bind(el, page);
  }

  function bind(el, page) {
    el.querySelectorAll("[data-go]").forEach((b) => {
      b.onclick = () => A().go(b.dataset.go);
    });
  }

  /** 面板内的按钮统一走事件委托，重渲染后依然有效 */
  function dispatch(e) {
    const t = e.target.closest(
      "[data-v2-run],[data-v2-copy],[data-v2-open-material],[data-v2-open-exp],[data-v2-audit]",
    );
    if (!t || !document.querySelector("#v2-strip")?.contains(t)) return;
    if (t.hasAttribute("data-v2-run")) return runDiagnosis(stripEl());
    if (t.hasAttribute("data-v2-copy"))
      return copy(t.dataset.v2Copy, "已复制，可直接粘到笔记里");
    if (t.hasAttribute("data-v2-open-material"))
      return window.showMaterial(t.dataset.v2OpenMaterial);
    if (t.hasAttribute("data-v2-open-exp")) return window.editExperience(t.dataset.v2OpenExp);
    if (t.hasAttribute("data-v2-audit")) return copyAuditReport();
  }

  function copyAuditReport() {
    const draft = get("resumeDraft", null) || {};
    const target = get("target", null) || {};
    const audit = window.EvidenceCore.auditResume(draft.blocks || [], target.requirements || []);
    copy(
      "投递自检 · " + (draft.title || "简历") + "\n" +
        "JD 覆盖 " + Math.round(audit.coverage * 100) + "%（" + audit.requirementRows.length + " 条要求）\n" +
        "无出处段落 " + audit.noSource.length + " 段；缺数字 " + audit.noMetric.length + " 段\n" +
        "未覆盖：" + (audit.uncovered.map((u) => u.text).slice(0, 5).join(" / ") || "无"),
      "自检报告已复制",
    );
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
    document.addEventListener("click", dispatch);
    window.addEventListener("hashchange", syncSwitch);
    document.addEventListener("keydown", (e) => {
      if (e.altKey && e.key === "1") goV1();
    });
  }

  window.V2 = { boot, call, draw, online: () => online };
})();
