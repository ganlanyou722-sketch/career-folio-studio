/**
 * v5：在 v3 的页面布局上做增强，不另起一屏。
 * 保留：v1 工作台的侧栏 / 顶部 / 四个工作台页面 + v3 的顶部核验卡片条。
 * 增强：01 识坑核验零前置（不选岗位也能贴 JD 出结论）、02 简历对照可直接贴文本、
 *       03 复盘加示例与证据台账导出；三页各自的结论卡、示例按钮、一键互跳。
 * 版本：V1 / V2 / V3 / V4（三卡版）/ V5（本版）
 */
(() => {
  "use strict";
  const A = () => window.App;
  const CORE = () => window.EvidenceCore;
  const get = (k, d) => A().get(k, d);
  const set = (k, v) => A().set(k, v);
  const esc = (s) => A().esc(s);
  const icon = (n, s) => A().icon(n, s);

  const PAGES = { home: "链路总览", library: "经历体检", match: "岗位尽调", resume: "简历对照", interview: "面试复盘" };
  const LV_TONE = { L1: "hot", L2: "warn", L3: "calm" };
  const TIER_TONE = { A: "ok", B: "warn", C: "calm", D: "hot" };
  const TIER_LABEL = { A: "A 原文", B: "B 二手", C: "C 通用", D: "D 无来源" };

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
  const SAMPLE_COMPANY = ["公司成立于 2019 年，目前团队规模 120 人。", "已服务品牌超过 50 个，去年完成 A 轮融资 2000 万元。"].join("\n");
  const SAMPLE_CV = [
    "负责某美妆品牌天猫店铺日常运营，跟进大促活动报名与素材上线，双十一单店成交额从 80 万做到 210 万。",
    "独立对接 3 个品牌方，每月输出一次投放复盘，累计整理素材 400 条。",
    "协调 12 位达人排期，把内容交付周期从 7 天压到 3 天。",
    "参与部门周会并整理会议纪要。",
  ].join("\n");
  const SAMPLE_Q = "讲一次你推动跨部门协作、最后拿到结果的经历";
  const SAMPLE_A =
    "当时我们组接了一个美妆品牌的店铺运营，双十一前品牌方突然把主推品换了，大家都挺被动。我们开了几次会，把素材、活动报名和达人排期重新排了一遍，中间也跟设计、达人对了几次。最后效果还不错，领导也比较认可。";

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
        const r = await fetch("/api/" + name, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
        const d = await r.json();
        if (d?.ok) return d.data;
      } catch {
        /* 回落本地 */
      }
    }
    const E = CORE();
    if (name === "ledger") return E.buildLedger(payload);
    if (name === "radar") return E.radarDims(payload);
    if (name === "interview/review") return E.reviewAnswer(payload);
    if (name === "library/audit") return E.libraryAudit(payload.materials, payload.experiences);
    return null;
  }

  function copy(text, tip) {
    const fire = () => A().toast(tip || "已复制");
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(fire, () => legacy(text, fire));
    else legacy(text, fire);
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
      A().toast("复制失败，请手动选中");
    }
    ta.remove();
  }

  /* ---------- 小组件（沿用 v3 的卡片语言） ---------- */
  function card(title, body, foot) {
    return '<section class="v3-card">' + '<header class="v3-head"><b>' + title + "</b>" + (foot || "") + "</header>" + '<div class="v3-body">' + body + "</div></section>";
  }
  function chip(text, tone) {
    return '<span class="v3-chip ' + (tone || "") + '">' + esc(text) + "</span>";
  }
  function levelChip(lv) {
    return '<span class="v3-lv ' + (LV_TONE[lv] || "calm") + '">' + lv + "</span>";
  }
  function tierChip(t) {
    return '<span class="v3-tier ' + (TIER_TONE[t] || "calm") + '">' + (TIER_LABEL[t] || t) + "</span>";
  }
  function kpi(label, value, note) {
    return '<div class="v3-kpi"><small>' + label + "</small><b>" + value + "</b>" + (note ? "<span>" + note + "</span>" : "") + "</div>";
  }
  const pct = (v) => Math.round((v || 0) * 100) + "%";
  const btn = (attr, text, cls) => '<button class="' + (cls || "v3-btn") + '" ' + attr + ">" + text + "</button>";

  /* ---------- 01 看清对方：岗位反向尽调（零前置） ---------- */

  function jdSaved() {
    return get("v5Jd", "") || (get("target", null)?.text || "");
  }
  function companySaved() {
    return get("v5Company", "") || get("v3CompanyText", "");
  }

  function verdictOf(l) {
    const l1 = l.byLevel.L1 || 0;
    const l2 = l.byLevel.L2 || 0;
    const l3 = l.byLevel.L3 || 0;
    if (l1 > 0) {
      return {
        tone: "hot",
        title: l1 + " 处必须当面问清" + (l2 ? "，另有 " + l2 + " 处要确认" : ""),
        note: "L1 是 JD 原文明写的硬条款：要书面口径，拿不到就不签；L2 是留了空间的表述，问清计算方式再决定。",
      };
    }
    if (l2 > 0) return { tone: "warn", title: "可以继续聊，但这 " + l2 + " 点要当场确认", note: "L2 表述留了空间，问清边界和计算方式再决定。" };
    return { tone: "calm", title: "这份 JD 没看到明显条款" + (l3 ? "，但 " + l3 + " 条公司陈述没有出处" : ""), note: "仍要核对合同主体、社保缴纳方式与试用期约定，别只看招聘页。" };
  }

  function ledgerBlock(jdText, coText, gaps) {
    const l = CORE().buildLedger({ jdText, companyText: coText, gaps: gaps || [] });
    const v = verdictOf(l);
    const rows = l.rows
      .slice()
      .sort((a, b) => (a.level === b.level ? 0 : a.level < b.level ? -1 : 1))
      .map(
        (r) =>
          '<tr class="lvl-' + String(r.level).toLowerCase() + '">' +
          "<td>" + levelChip(r.level) + "<small>" + (r.type === "risk" ? "风险条款" : r.type === "claim" ? "公司陈述" : "证据缺口") + "</small></td>" +
          '<td><b>' + esc(r.title) + '</b><p class="v3-q">“' + esc(r.quote) + '”</p></td>' +
          "<td>" + tierChip(r.sourceTier) + "<small>" + esc(r.source) + "</small></td>" +
          "<td>" + esc(r.ask) + "</td>" +
          '<td><button class="v3-mini" data-v5-copy="' + esc(r.ask) + '">复制问法</button></td>' +
          "</tr>",
      )
      .join("");
    const tiers = ["A", "B", "C", "D"].map((t) => tierChip(t) + "<i>" + (l.tiers[t] || 0) + "</i>").join("");
    return (
      '<div class="v5-verdict ' + v.tone + '"><b>' + esc(v.title) + "</b><p>" + esc(v.note) + "</p></div>" +
      '<div class="v3-kpis">' +
      kpi("证据覆盖率", pct(l.coverage), l.coveredCount + " / " + l.total + " 条能指回原句") +
      kpi("信号条数", l.total, "L1 " + l.byLevel.L1 + " · L2 " + l.byLevel.L2 + " · L3 " + l.byLevel.L3) +
      kpi("标注误伤率", "待测", "需真实标注样本测算") +
      kpi("报告采纳率", "待测", "按复制/下载统计") +
      "</div>" +
      '<div class="v3-tiers"><span>来源构成</span>' + tiers + "</div>" +
      '<div class="v3-ledger"><table><thead><tr><th>等级</th><th>条款 / 结论</th><th>来源</th><th>当面怎么问</th><th></th></tr></thead><tbody>' +
      rows + "</tbody></table></div>"
    );
  }

  function matchPanel() {
    const target = get("target", null);
    const jd = jdSaved();
    const co = companySaved();
    const hasResult = !!jd.trim();
    const result = hasResult ? ledgerBlock(jd, co, []) : "";
    const cardText = hasResult ? riskCardText(jd, co) : "";
    return card(
      "01 看不准对方 <em>岗位反向尽调 · 证据台账 · 当面话术</em>",
      '<p class="v3-empty v5-lead">' +
        (target ? "当前目标：" + esc(target.company + " · " + target.role) + "，JD 已自动带入，可直接核验。" : "不用先选岗位：把 JD 粘进来就能出结论，公司材料选填。") +
        "</p>" +
        '<div class="v5-inputs"><label>JD 原文<textarea data-v5-jd rows="6" placeholder="「其他说明」「福利」这两段最关键">' + esc(jd) + "</textarea></label>" +
        '<label>公司材料（可选，一行一句）<textarea data-v5-co rows="6" placeholder="招聘页写的规模、融资、团队人数">' + esc(co) + "</textarea></label></div>" +
        '<div class="v3-actions">' +
        btn("data-v5-run=check", "生成风险台账", "v3-btn primary") +
        btn("data-v5-sample=check", "用示例试一下", "v3-btn") +
        (hasResult ? btn("data-v5-card", "复制一页式风险卡片", "v3-btn") : "") +
        (hasResult ? btn("data-v3-goto=resume", "带着台账去对齐简历", "v3-btn") : "") +
        "</div>" +
        (hasResult ? '<div class="v5-out">' + result + "</div>" + '<h4 class="v3-sub">一页式风险卡片</h4><pre class="v5-paper">' + esc(cardText) + "</pre>" : '<p class="v5-tip">还没核验。粘 JD 或者先点「用示例试一下」——示例里有培训费、社保、大小周三处典型条款。</p>'),
      '<span class="v3-meta">每条结论都能翻回原句；误伤率与采纳率标「待测」，不预填</span>',
    );
  }

  function riskCardText(jdText, coText) {
    const l = CORE().buildLedger({ jdText, companyText: coText, gaps: [] });
    const target = get("target", null);
    const role = target?.role || "";
    const lines = ["【岗位风险卡片 · " + (role || "待投岗位") + "】", ""];
    lines.push("证据覆盖率 " + pct(l.coverage) + "（" + l.coveredCount + "/" + l.total + "）｜L1 " + l.byLevel.L1 + " · L2 " + l.byLevel.L2 + " · L3 " + l.byLevel.L3);
    lines.push("");
    l.asks.forEach((a, i) => {
      lines.push(i + 1 + ". [" + a.level + "] " + a.title);
      lines.push("   原句：" + a.quote);
      lines.push("   当面问：" + a.ask);
    });
    if (!l.asks.length) lines.push("暂无 L1/L2 命中，仍建议核对合同主体与社保缴纳方式。");
    lines.push("");
    lines.push("结论口径：以上每条都能回溯到 JD 或公司材料原文；未标注来源的推测不列入。");
    return lines.join("\n");
  }

  function runCheck(host) {
    const jd = host.querySelector("[data-v5-jd]")?.value.trim() || "";
    const co = host.querySelector("[data-v5-co]")?.value.trim() || "";
    if (jd.length < 40) return A().toast("JD 太短，至少贴三段再核验");
    set("v5Jd", jd);
    set("v5Company", co);
    draw();
  }

  /* ---------- 02 说不清自己：简历–JD 证据对照（可直接贴文本） ---------- */

  function cvSaved() {
    const own = get("v5Cv", "");
    if (own.trim()) return own;
    const draft = get("resumeDraft", null);
    if (draft?.blocks?.length) return draft.blocks.map((b) => b.text).filter(Boolean).join("\n");
    return "";
  }
  function blocksOf(text) {
    return String(text || "")
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 4)
      .map((s) => ({ type: "body", text: s }));
  }
  function bestBlock(req, blocks) {
    const words = (CORE().DOMAINS || []).filter((set) => set.some((w) => req.includes(w))).flat();
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
    if (/证书|资格|语言|四级|六级|雅思/.test(text)) return "资质单列一行，考过就写，没考过不占版面。";
    if (/年经验|年以上/.test(text)) return "年限不够就换角度：在相近项目里补一句「独立负责过同类工作」。";
    return "从最接近的一段经历里挑一条，补一句结果数字；没有证据别硬写。";
  }
  function radarSvg(dims) {
    const cx = 150, cy = 142, R = 96;
    const n = dims.length;
    const ang = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const pt = (i, r) => [cx + Math.cos(ang(i)) * r, cy + Math.sin(ang(i)) * r];
    const grid = [0.25, 0.5, 0.75, 1].map((k) => '<polygon points="' + dims.map((_, i) => pt(i, R * k).join(",")).join(" ") + '" fill="none" stroke="#e2e6db"/>').join("");
    const shape = dims.map((d, i) => pt(i, R * Math.max(0.15, Math.min(1, d.score))).join(",")).join(" ");
    const labels = dims.map((d, i) => { const [x, y] = pt(i, R + 24); return '<text x="' + x + '" y="' + y + '" text-anchor="middle" font-size="10.5" fill="#5d6b5f">' + esc(d.dim) + "</text>"; }).join("");
    return '<svg viewBox="0 0 300 290" class="v3-radar-svg" role="img" aria-label="简历匹配雷达">' + grid +
      '<polygon points="' + shape + '" fill="rgba(55,95,70,.18)" stroke="#375f46" stroke-width="1.4"/>' +
      dims.map((d, i) => { const [x, y] = pt(i, R * Math.max(0.15, Math.min(1, d.score))); return '<circle cx="' + x + '" cy="' + y + '" r="3" fill="#375f46"/>'; }).join("") + labels + "</svg>";
  }

  function resumePanel() {
    const jd = jdSaved();
    const cv = cvSaved();
    const reqs = jd.length >= 20 ? CORE().parseJD(jd).requirements.slice(0, 10) : [];
    const has = cv.trim().length >= 30;
    let result = "";
    if (has) {
      const blocks = blocksOf(cv);
      const radar = CORE().radarDims({ blocks, requirements: reqs, materials: [] });
      const audit = radar.audit;
      const dims = radar.dims.filter((d) => !/ 0 \/ 0 /.test(d.basis));
      const rows = audit.requirementRows.map((r) => {
        const hit = bestBlock(r.text, blocks);
        return "<tr><td>" + esc(r.text) + "</td><td>" + (hit ? '<span class="v3-src-tag">' + esc(hit.text.slice(0, 32)) + "…</span>" : '<span class="v3-none">无对应段落</span>') + "</td><td>" + (r.covered ? chip("已覆盖", "ok") : chip("缺口", "hot")) + "</td></tr>";
      }).join("");
      const gaps = audit.uncovered.map((u, i) => "<li><b>" + (i + 1) + "</b><span>" + esc(u.text) + "</span><small>" + esc(gapHint(u.text)) + "</small></li>").join("");
      result =
        '<div class="v3-kpis">' +
        kpi("JD 覆盖度", pct(audit.coverage), audit.requirementRows.filter((r) => r.covered).length + " / " + audit.requirementRows.length + " 条") +
        kpi("证据缺口", audit.uncovered.length, "按性价比排序") +
        kpi("待补出处段落", audit.noSource.length, "逐行贴稿默认无出处，挂进经历库才会带上") +
        kpi("建议采纳率", "待测", "按复制应用统计") +
        "</div>" +
        (reqs.length ? "" : '<p class="v5-tip">没贴 JD，只做了「有没有出处、有没有数字」的自检；贴上 JD 才能逐条对照。</p>') +
        (dims.length ? '<div class="v3-radar">' + radarSvg(dims) + '<ul class="v3-basis">' + dims.map((d) => "<li><b>" + esc(d.dim) + "</b><span>" + esc(d.basis) + "</span><i>" + pct(d.score) + "</i></li>").join("") + "</ul></div>" + '<p class="v5-tip">粘贴的简历默认没有出处，所以「证据厚度」会是 0；材料挂进经历库后这一项才会涨。</p>' : "") +
        (reqs.length ? '<h4 class="v3-sub">JD–证据对照表</h4><div class="v3-ledger"><table><thead><tr><th>JD 要求</th><th>对应段落</th><th>判定</th></tr></thead><tbody>' + rows + "</tbody></table></div>" : "") +
        '<h4 class="v3-sub">缺口清单（按优先级）</h4>' + (gaps ? '<ul class="v3-gaps">' + gaps + "</ul>" : '<p class="v3-pass">每条要求都有对应段落，可以定稿了。</p>') +
        '<div class="v3-actions">' + btn("data-v5-rpt", "复制对齐建议", "v3-btn primary") + btn("data-v3-goto=interview", "去练面试回答", "v3-btn") + "</div>";
    }
    return card(
      "02 说不清自己 <em>简历–JD 证据对照 · 缺口优先级</em>",
      '<p class="v3-empty v5-lead">' + (reqs.length ? "JD 已从上一步带入（" + jd.length + " 字），贴简历就能逐条对。" : "可以只贴简历做自检；到 01 里粘一次 JD，这里会自动沿用。") + "</p>" +
        '<div class="v5-inputs"><label>简历内容（一行一段）<textarea data-v5-cv rows="6" placeholder="做了什么 + 结果数字">' + esc(cv) + "</textarea></label></div>" +
        '<div class="v3-actions">' + btn("data-v5-run=align", "开始逐条对照", "v3-btn primary") + btn("data-v5-sample=align", "用示例试一下", "v3-btn") + "</div>" +
        (has ? '<div class="v5-out">' + result + "</div>" : '<p class="v5-tip">还没对照。贴三行简历，或先点「用示例试一下」。</p>'),
      '<span class="v3-meta">雷达每一维都附依据，不做无理由打分</span>',
    );
  }

  function runAlign(host) {
    const cv = host.querySelector("[data-v5-cv]")?.value.trim() || "";
    if (cv.length < 30) return A().toast("简历内容太少，贴三行以上再对照");
    set("v5Cv", cv);
    draw();
  }

  function alignText() {
    const jd = jdSaved();
    const cv = cvSaved();
    const reqs = jd.length >= 20 ? CORE().parseJD(jd).requirements.slice(0, 10) : [];
    const audit = CORE().auditResume(blocksOf(cv), reqs);
    const lines = ["【简历对齐建议】", "JD 覆盖 " + pct(audit.coverage) + "（" + audit.requirementRows.length + " 条）｜无出处 " + audit.noSource.length + " 段｜缺数字 " + audit.noMetric.length + " 段"];
    if (audit.uncovered.length) {
      lines.push("", "未覆盖的要求（优先补）：");
      audit.uncovered.slice(0, 6).forEach((u, i) => lines.push("  " + (i + 1) + ". " + u.text));
    }
    if (audit.noSource.length) {
      lines.push("", "没有出处的段落（先挂原件再改）：");
      audit.noSource.slice(0, 4).forEach((b) => lines.push("  · " + b.text.slice(0, 40)));
    }
    lines.push("", "改法：每条未覆盖的要求，从最接近的经历里挑一条写成「做了什么 + 结果数字」；没有证据别硬编。");
    return lines.join("\n");
  }

  /* ---------- 03 留不下证据：面试复盘证据链 ---------- */

  function reviews() {
    return get("v5Reviews", []) || [];
  }
  function reviewCard(r) {
    const st = r.star || {};
    const missing = ["S", "T", "A", "R"].filter((k) => !st[k]);
    const head =
      missing.length === 0
        ? "结构齐了：这套就可以直接练口述，重点是把数字说准。"
        : "这版缺「" + missing.join("、") + "」：" + (r.fixes?.[0] ? r.fixes[0].replace(/^补/, "先补") : "补齐要素") ;
    const cells = ["S", "T", "A", "R"].map((k) => '<div class="v3-star ' + (st[k] ? "on" : "off") + '"><b>' + k + "</b></div>").join("");
    const parts = (r.rewrite?.parts || []).map((p) => "<li><b>" + esc(p.key) + "</b><span>" + esc(p.text) + "</span></li>").join("");
    const g = r.grade || {};
    return (
      '<div class="v5-review">' +
      '<div class="v5-verdict ' + (missing.length > 1 ? "warn" : "calm") + ' v5-verdict-in"><b>当前 ' + r.score + ' 分，改写后预估 ' + r.estimate + ' 分</b><p>' + esc(head) + "</p></div>" +
      '<div class="v5-review-top"><div class="v5-score"><b>' + r.score + '</b><small>当前 / 100</small></div>' +
      '<div class="v5-cmp"><div><i style="width:' + Math.max(8, r.score) + '%"></i></div><div class="after"><i style="width:' + Math.max(8, r.estimate) + '%"></i></div><small>改写后预估 ' + r.estimate + "（预估，不是实测）</small></div>" +
      '<div class="v5-grade">' + tierChip(g.tier || "C") + "<small>" + esc(g.source || "") + "</small></div></div>" +
      '<div class="v3-stars">' + cells + "</div>" +
      (r.fixes?.length ? '<ul class="v3-fixes">' + r.fixes.map((f) => "<li>" + esc(f) + "</li>").join("") + "</ul>" : '<p class="v3-pass">结构完整，背熟这版就可以练口述。</p>') +
      '<h4 class="v3-sub">按 STAR 改写（缺的格子留【待补】，不替你编）</h4><ul class="v3-parts">' + parts + "</ul>" +
      '<h4 class="v3-sub">可能被追问</h4><ol class="v3-follow">' + (r.followUps || []).map((f) => "<li>" + esc(f) + "</li>").join("") + "</ol>" +
      '<div class="v3-actions">' + btn("data-v5-copy=" + esc(r.rewrite?.text || ""), "复制改写稿", "v3-mini") + "</div></div>"
    );
  }

  function interviewPanel() {
    const reqs = (get("target", null)?.requirements || []).slice(0, 8);
    const bank = CORE().QUESTION_BANK;
    const list = reviews();
    const mix = CORE().credibilityMix(list);
    const latest = list[0];
    const options = (reqs.length ? reqs : bank.map((b) => b.q))
      .map((r) => '<option value="' + esc(typeof r === "string" ? r : r.q) + '">' + esc(typeof r === "string" ? r : r.q) + "</option>")
      .join("");
    const mixBars = mix.map((m) => '<div class="v3-bar"><span>' + esc(m.label) + '</span><i style="width:' + Math.round(m.share * 100) + '%"></i><b>' + m.count + "</b></div>").join("");
    return card(
      "03 留不下证据 <em>逐题诊断 · STAR 改写 · 追问预测</em>",
      '<div class="v3-diag"><label>题目<select data-v5-q>' + options + '</select></label><label>你的回答<textarea data-v5-a rows="5" placeholder="把口述内容打出来，越具体越能发现缺口">' + esc(get("v5A", "")) + '</textarea></label><div class="v3-actions">' + btn("data-v5-run=review", "复盘这条回答", "v3-btn primary") + btn("data-v5-sample=review", "用示例试一下", "v3-btn") + btn("data-v5-export", "导出证据台账", "v3-btn") + "</div></div>" +
        '<div class="v5-out">' + (latest ? reviewCard(latest) : '<p class="v5-tip">示例是一条「说了过程、没说清结果」的常见回答，复盘后能看到缺任务与结果。</p>') + "</div>" +
        '<h4 class="v3-sub">核实等级分布（' + list.length + ' 次复盘）</h4><div class="v3-mix">' + mixBars + "</div>" +
        '<p class="v3-note">A 来自该岗位 JD 原文；B 来自面经合集，需自行核对是否同岗位；C 是通用题，不代表这家公司。</p>',
      '<span class="v3-meta">' + icon("info", 13) + " 复盘记录只留本机，不上传</span>",
    );
  }

  function runReview(host) {
    const q = host.querySelector("[data-v5-q]")?.value || "";
    const a = host.querySelector("[data-v5-a]")?.value.trim() || "";
    if (a.length < 20) return A().toast("回答太短，至少写两句话再复盘");
    const r = CORE().reviewAnswer({ question: q, answer: a, requirements: [] });
    const list = [Object.assign({ at: Date.now(), question: q || "未命名题目" }, r), ...reviews().slice(0, 9)];
    set("v5Q", q);
    set("v5A", a);
    set("v5Reviews", list);
    draw();
  }

  function exportLedger() {
    const list = reviews();
    const jd = jdSaved();
    const co = companySaved();
    const cv = cvSaved();
    const lines = ["【履历间 · 证据台账】", "导出时间：" + new Date().toLocaleString("zh-CN"), ""];
    if (jd) {
      const l = CORE().buildLedger({ jdText: jd, companyText: co, gaps: [] });
      lines.push("一、岗位核验（覆盖率 " + pct(l.coverage) + "，L1 " + l.byLevel.L1 + " · L2 " + l.byLevel.L2 + " · L3 " + l.byLevel.L3 + "）");
      l.rows.forEach((r, i) => lines.push("  " + (i + 1) + ". [" + r.level + "][" + r.sourceTier + "] " + r.title + "｜原句：" + r.quote.slice(0, 56)));
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
    lines.push("口径：每条都保留原句；误伤率、采纳率标待测，需在真实标注样本上测算。");
    copy(lines.join("\n"), "证据台账已复制，可粘进文档存档");
  }

  /* ---------- 首页：三痛点与链路（沿用 v3 的总览卡） ---------- */

  function homePanel() {
    const pains = [
      { n: "01", t: "看不清对方", d: "JD 与公司材料进台账，L1/L2/L3 分级，每条原句可回溯，并给出当面问法", go: "match", demo: "check" },
      { n: "02", t: "说不清自己", d: "逐条要求对证据，缺口按性价比排，不硬编经历", go: "resume", demo: "align" },
      { n: "03", t: "留不下证据", d: "逐题诊断、STAR 改写、追问预测，记录可导出成本机台账", go: "interview", demo: "review" },
    ];
    return card(
      "证据链总览 <em>三个痛点，三条链路，一屏说清</em>",
      '<p class="v3-claim">不替你吹牛，只帮你核实和说清。</p>' +
        '<div class="v5-pains">' +
        pains.map((s) => '<article><b>' + s.n + "</b><strong>" + s.t + "</strong><p>" + s.d + "</p>" + '<div class="v3-actions">' + btn('data-v3-goto="' + s.go + '"', "进入", "v3-mini") + btn('data-v5-demo="' + s.demo + '" data-v5-go="' + s.go + '"', "看示例", "v3-mini") + "</div></article>").join("") +
        "</div>" +
        '<div class="v3-trust"><span>可信：结论可溯源、分等级、人工可兜底</span><span>有用：产出直接能投递、能当面说</span><span>安全：不碰隐私、不绕登录、不承诺包过</span><span>付费：买断或单次解锁，不自动续费</span></div>' +
        '<p class="v3-note">现在能看到结果的路径是：粘一段文字 → 点一次按钮。三个面板都配了「用示例试一下」，不用先建数据、不用先选岗位。</p>',
    );
  }

  function libraryPanel() {
    const mats = get("materials", []);
    const exps = get("experiences", []);
    const a = CORE().libraryAudit(mats, exps);
    return card(
      "经历体检 <em>证据可回溯率</em>",
      '<div class="v3-kpis">' + kpi("材料已核对", pct(a.verifiedRate), a.materials + " 份") + kpi("经历挂原件", pct(a.sourcedRate), a.experiences + " 条") + kpi("可量化", pct(a.metricRate), "带数字的结果") + "</div>" +
        '<ul class="v3-gaps">' +
        (a.pending.length ? '<li><b>待核对</b><span>' + a.pending.slice(0, 3).map((m) => esc(m.name || "材料")).join(" / ") + "</span></li>" : "") +
        (a.sourceless.length ? '<li><b>无来源</b><span>' + a.sourceless.slice(0, 3).map((e) => esc((e.title || "").slice(0, 20))).join(" / ") + "</span></li>" : "") +
        (a.vague.length ? '<li><b>缺量化</b><span>' + a.vague.slice(0, 3).map((e) => esc((e.title || "").slice(0, 20))).join(" / ") + "</span></li>" : "") +
        "</ul><p class=\"v3-note\">只有挂到原件的表述才算证据。缺口不会自动补齐，得你补材料。</p>",
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
    const main = document.querySelector("#main");
    if (!PAGES[page]) {
      el.innerHTML = "";
      el.hidden = true;
      if (main) main.classList.remove("v5-fold");
      legacyBar.remove();
      return;
    }
    el.hidden = false;
    const body =
      page === "match" ? matchPanel() : page === "resume" ? resumePanel() : page === "interview" ? interviewPanel() : page === "home" ? homePanel() : libraryPanel();
    el.innerHTML = '<div class="v3-wrap v5-wrap">' + body + "</div>";
    /* 01/02/03 是完整工作面，旧版同一页工作台折叠起来，避免两套入口重复；展开随时可用。 */
    const fold = page !== "home";
    if (main) main.classList.toggle("v5-fold", fold && !legacyOpen);
    if (fold) {
      el.appendChild(legacyBar);
      legacyBar.innerHTML = legacyOpen
        ? '<button class="v3-mini" data-v5-legacy="close">▴ 收起旧版工作台</button><span>下面就是 v1 起就有的原页面，数据互通。</span>'
        : '<button class="v3-mini" data-v5-legacy="open">▾ 展开旧版工作台（可选）</button><span>本页证据链已完整，无需再走旧流程。</span>';
    } else {
      legacyBar.remove();
    }
  }

  const legacyBar = document.createElement("div");
  legacyBar.className = "v5-legacy";
  let legacyOpen = false;

  const VERSIONS = [
    { id: "v1", label: "V1", href: "__v1__/index.html", title: "原始版" },
    { id: "v2", label: "V2", href: "__v2__/index.html", title: "证据版" },
    { id: "v3", label: "V3", href: "__v3__/index.html", title: "证据链" },
    { id: "v4", label: "V4", href: "__v4__/index.html", title: "三卡版" },
    { id: "v5", label: "V5", href: "", title: "布局增强版" },
  ];

  function mountSwitch() {
    const bar = document.querySelector("#top .top-actions");
    if (!bar) return;
    if (!bar.querySelector("[data-v5-switch]")) bar.insertAdjacentHTML("beforeend", '<div class="v3-switch" data-v5-switch></div>');
    const box = bar.querySelector("[data-v5-switch]");
    const page = (location.hash || "#home").slice(1);
    box.innerHTML = VERSIONS.map((v) => '<a href="' + (v.href || "index.html") + "#" + page + '" title="' + v.title + '"' + (v.id === "v5" ? ' class="on"' : "") + ">" + v.label + "</a>").join("");
  }

  function fill(host, sel, text) {
    const el = host.querySelector(sel);
    if (el) el.value = text;
  }

  function bindActions() {
    document.addEventListener("click", (e) => {
      const t = e.target.closest("[data-v5-run],[data-v5-sample],[data-v5-copy],[data-v5-card],[data-v5-rpt],[data-v5-export],[data-v5-demo],[data-v5-legacy],[data-v3-goto],[data-v3-copy]");
      if (!t) return;
      const host = stripEl();
      if (t.dataset.v5Legacy) {
        legacyOpen = t.dataset.v5Legacy === "open";
        return draw();
      }
      if (t.dataset.v5Demo) {
        const kind = t.dataset.v5Demo;
        const go = t.dataset.v5Go || "match";
        location.hash = "#" + go;
        setTimeout(() => applySample(kind, stripEl()), 30);
        return;
      }
      if (t.dataset.v5Run) {
        if (t.dataset.v5Run === "check") return runCheck(host);
        if (t.dataset.v5Run === "align") return runAlign(host);
        if (t.dataset.v5Run === "review") return runReview(host);
      }
      if (t.dataset.v5Sample) return applySample(t.dataset.v5Sample, host);
      if (t.dataset.v5Copy) return copy(t.dataset.v5Copy, "已复制");
      if (t.hasAttribute("data-v5-card")) return copy(riskCardText(jdSaved(), companySaved()), "风险卡片已复制");
      if (t.hasAttribute("data-v5-rpt")) return copy(alignText(), "对齐建议已复制");
      if (t.hasAttribute("data-v5-export")) return exportLedger();
      if (t.dataset.v3Goto) return A().go(t.dataset.v3Goto);
      if (t.dataset.v3Copy) return copy(t.dataset.v3Copy, "已复制");
    });
  }

  function applySample(kind, host) {
    if (kind === "check") {
      fill(host, "[data-v5-jd]", SAMPLE_JD);
      fill(host, "[data-v5-co]", SAMPLE_COMPANY);
      set("v5Jd", SAMPLE_JD);
      set("v5Company", SAMPLE_COMPANY);
      return draw();
    }
    if (kind === "align") {
      if (!jdSaved()) {
        set("v5Jd", SAMPLE_JD);
        set("v5Company", SAMPLE_COMPANY);
      }
      fill(host, "[data-v5-cv]", SAMPLE_CV);
      set("v5Cv", SAMPLE_CV);
      return draw();
    }
    if (kind === "review") {
      const q = host.querySelector("[data-v5-q]");
      const a = host.querySelector("[data-v5-a]");
      if (q) q.value = SAMPLE_Q;
      if (a) a.value = SAMPLE_A;
      const r = CORE().reviewAnswer({ question: SAMPLE_Q, answer: SAMPLE_A, requirements: [] });
      set("v5Q", SAMPLE_Q);
      set("v5A", SAMPLE_A);
      set("v5Reviews", [Object.assign({ at: Date.now(), question: SAMPLE_Q }, r), ...reviews().slice(0, 9)]);
      return draw();
    }
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
      legacyOpen = false;
      mountSwitch();
      draw();
    });
    bindActions();
    /* ?demo=check|align|review：直接落到对应面板并跑出示例 */
    const demo = new URLSearchParams(location.search).get("demo");
    if (demo) {
      const go = demo === "align" ? "resume" : demo === "review" ? "interview" : "match";
      location.hash = "#" + go;
      setTimeout(() => applySample(demo, stripEl()), 60);
    }
  }

  window.V5 = { boot, draw, call, online: () => online };
})();
