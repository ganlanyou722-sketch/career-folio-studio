/**
 * 面试工坊 · 模拟面试页签（V7）
 * 依赖 window.FolioViews 与 window.InterviewForge；题库、故事线、状态机、打分都在引擎里。
 * 本文件只做三件事：呈现、收集作答、把评分改法写回口述稿。
 */
(function () {
  "use strict";
  const { api, e, icon } = window.FolioViews || {};
  if (!api) return;

  let session = null;
  let key = "";
  let judge = null;
  let probe = null;
  let showGolden = false;

  const BARS_ORDER = ["L1", "L2", "L3", "L4"];
  const CAT_ORDER = ["fact", "depth", "collab", "result", "transfer"];

  function ensureStyle() {
    if (document.querySelector("[data-coach-style]")) return;
    const style = document.createElement("style");
    style.setAttribute("data-coach-style", "1");
    style.textContent = [
      ".pv-coach-badge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;font-size:11.5px;background:#eef2e6;color:#3f5a48;margin-left:6px}",
      ".pv-coach-badge.warn{background:#fdeceb;color:#a23d34}",
      ".pv-coach-badge.ok{background:#e5f1e7;color:#2f6344}",
      ".pv-coach-meta{display:flex;flex-wrap:wrap;gap:10px;font-size:12.5px;color:#5b6b60;margin:10px 0 12px}",
      ".pv-coach-live{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:#5b6b60;margin-top:6px}",
      ".pv-coach-live b{color:#2f6344}",
      ".pv-coach-card{border:1px solid #dfe6dc;border-radius:14px;padding:14px 16px;background:#fbfdf9;margin-top:12px}",
      ".pv-coach-score{display:flex;align-items:baseline;gap:10px;margin-bottom:8px}",
      ".pv-coach-score strong{font-size:26px;color:#2f6344}",
      ".pv-coach-dim{display:grid;grid-template-columns:84px 1fr 44px;gap:8px;align-items:center;margin:5px 0;font-size:12.5px}",
      ".pv-coach-bar{height:7px;border-radius:999px;background:#e7ecdf;overflow:hidden}",
      ".pv-coach-bar i{display:block;height:100%;background:#4d7a5d}",
      ".pv-coach-quote{margin:4px 0 8px;padding-left:10px;border-left:2px solid #cfe0d2;font-size:12.5px;color:#42584a}",
      ".pv-coach-fix{font-size:13px;margin:6px 0 0;color:#33463b}",
      ".pv-coach-details summary{cursor:pointer;font-size:13px;color:#2f6344;margin:8px 0}",
      ".pv-coach-details div{font-size:12.5px;color:#4a5c50;margin:4px 0 0 12px}",
      ".pv-coach-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}",
      ".pv-coach .bad{color:#a23d34}",
    ].join("\n");
    document.head.append(style);
  }

  function ensureSession(ctx) {
    const k = ctx.packId() + "|coach";
    if (session && key === k) return session;
    key = k;
    const F = window.InterviewForge;
    const facts = (ctx.entries || []).map((x, i) => ({
      id: x.id != null ? x.id : "e" + i,
      title: x.title,
      action: x.action,
      result: x.result || "",
      scene: x.scene || x.context || x.role || "",
      reflection: x.reflection || "",
      attribution: x.attribution || "",
      sourceId: x.experienceId || (x.source ? "src" : ""),
    }));
    const pack = F.buildQuestionPack({
      role: ctx.target.role,
      company: ctx.target.company,
      requirements: ctx.target.requirements || [],
      facts,
    });
    session = F.createCoachSession({ pack });
    judge = null;
    probe = null;
    return session;
  }

  const saved = (ctx) => ctx.pack() || {};

  function barRow(label, value) {
    const w = Math.round(Math.max(0, Math.min(1, value)) * 100);
    return (
      '<div class="pv-coach-dim"><span>' + e(label) + '</span><span class="pv-coach-bar"><i style="width:' +
      w + '%"></i></span><span>' + w + "</span></div>"
    );
  }

  function scoreHtml(result) {
    const F = window.InterviewForge;
    const dims = result.dims;
    const quotes = result.evidence
      .map((x) =>
        x.verified
          ? '<div class="pv-coach-quote">' + e(x.label) + "：" + e(x.quote) + "</div>"
          : '<div class="pv-coach-quote">' + e(x.label) + "：" + e(x.note) + "</div>",
      )
      .join("");
    return (
      '<div class="pv-coach-card"><div class="pv-coach-score"><strong>' + result.score + "</strong><span>" +
      e(result.barsLabel) + " · 引用核验 " + result.quoteVerified + "/5</span></div>" +
      Object.keys(dims).map((k) => barRow(F.DIM_LABEL[k], dims[k])).join("") +
      '<div style="margin-top:8px">' + quotes + "</div>" +
      result.fixes.map((f) => '<div class="pv-coach-fix">· ' + e(f) + "</div>").join("") +
      (result.barsNext ? '<div class="pv-coach-fix" style="color:#5b6b60">下一步：' + e(result.barsNext) + "</div>" : "") +
      "</div>"
    );
  }

  function goldenHtml(g) {
    return (
      '<div class="pv-coach-card"><div class="pv-coach-meta">' + e(g.title) + " · 3 分钟故事线 · 口述 " +
      g.checks.speakSec + " 秒 · 数字 " + g.checks.metrics + " 个 · 状态 " +
      (g.status === "ready" ? "可复述" : "待补") + "</div>" +
      g.segments
        .map(
          (s) =>
            '<div class="pv-coach-card" style="margin-top:8px"><div class="pv-coach-meta">' + e(s.label) + " " +
            s.startSec + "–" + s.endSec + " 秒 · 预算 " + s.budgetChars + " 字 · 实际 " + s.chars + " 字" +
            (s.overBudget ? '<span class="bad">' + e(s.trimHint) + "</span>" : "") +
            (s.evidenceOk ? '<span class="pv-coach-badge ok">有依据</span>' : s.evidence ? '<span class="pv-coach-badge warn">待核</span>' : "") +
            "</div><p>" + e(s.text) + "</p></div>",
        )
        .join("") +
      '<div class="pv-coach-card"><div class="pv-coach-meta">30 秒电梯版（' + g.elevator.chars + "/" + g.elevator.budgetChars +
      ' 字）</div><p>' + e(g.elevator.text) + "</p></div></div>"
    );
  }

  function startHtml(ctx) {
    const s = ensureSession(ctx);
    const p = s.pack;
    const F = window.InterviewForge;
    const gapCount = p.questions.filter((q) => q.unsupported).length;
    const gold = p.facts[0];
    const golden = gold ? F.compileGoldenCase({ fact: gold, role: p.role, requirements: p.requirements }) : null;
    const last = saved(ctx).coach && saved(ctx).coach.last;
    return (
      '<div class="pv-panel"><div class="pv-subhead"><div><h2>模拟面试 · 本场 ' + p.questions.length + " 题</h2>" +
      "<p>题目由岗位要求与你的经历一起推出；答完立刻追问、打分，改法直接说补哪一句。</p></div></div>" +
      '<div class="pv-coach-meta"><span>必备要求覆盖 ' + p.coverage.mustCovered + "/" + p.coverage.mustTotal +
      '</span><span>缺口题 ' + gapCount + "</span><span>事实 " + p.facts.length + " 条</span>" +
      (p.gaps.length ? '<span class="bad">待补 ' + p.gaps.length + " 项</span>" : "") + "</div>" +
      p.gaps.slice(0, 4).map((g) => '<div class="pv-coach-fix">· ' + e(g.text) + "</div>").join("") +
      '<div class="pv-coach-actions"><button class="pv-btn pv-primary" data-start>' + icon("mic", 16) + "开始模拟面试</button>" +
      (golden && golden.ok ? '<button class="pv-btn" data-golden>' + icon("layers", 16) + "看三分钟故事线</button>" : "") +
      "</div>" +
      (last ? '<div class="pv-coach-card"><div class="pv-coach-meta">上一轮 · ' + last.overall + " 分 · " +
        e(last.barsLabel || "") + " · 追问 " + last.probeCount + " 次 · 平均 " + last.avgSec + " 秒/题</div>" +
        (last.topFixes || []).map((f) => '<div class="pv-coach-fix">· ' + e(f.text) + "</div>").join("") + "</div>" : "") +
      "</div>" + (golden && golden.ok && showGolden ? goldenHtml(golden) : "")
    );
  }

  function qlistHtml(s) {
    const scores = {};
    s.records().forEach((r) => {
      if (!scores[r.questionId] || r.score > scores[r.questionId]) scores[r.questionId] = r.score;
    });
    const groups = {};
    s.pack.questions.forEach((q, i) => {
      groups[q.category] = groups[q.category] || [];
      groups[q.category].push({ q, i });
    });
    return CAT_ORDER.filter((c) => groups[c])
      .map((c) => {
        const g = groups[c];
        return (
          '<div style="margin-bottom:12px"><div style="font-size:12.5px;color:#5b6b60;margin-bottom:6px">' +
          e(g[0].q.categoryLabel) + " · " + g.length + " 题</div>" +
          g
            .map(({ q, i }) => {
              const cur = s.current();
              const on = cur && cur.index === i;
              const tag = q.unsupported
                ? '<span class="pv-coach-badge warn">缺口</span>'
                : q.jdLink.must
                  ? '<span class="pv-coach-badge ok">必备</span>'
                  : '<span class="pv-coach-badge">加分</span>';
              const sc = scores[q.id] != null ? '<span class="pv-coach-badge ok">' + scores[q.id] + "</span>" : "";
              return (
                '<button class="pv-qpick ' + (on ? "pv-selected" : "") + '" data-i="' + i + '" aria-pressed="' + on +
                '"><small>' + e(q.categoryLabel) + tag + sc + "</small><strong>" +
                e(q.question.length > 42 ? q.question.slice(0, 42) + "…" : q.question) + "</strong></button>"
              );
            })
            .join("") +
          "</div>"
        );
      })
      .join("");
  }

  function questionHtml(s) {
    const cur = s.current();
    if (!cur) return finishHtml(s);
    const q = cur.question;
    return (
      '<div class="pv-coach-meta"><span>第 ' + (cur.index + 1) + " / " + cur.total + " 题</span><span>追问余量 " +
      cur.followUpsLeft + "</span><span>已用 " + Math.round(cur.elapsedSec) + " / " + cur.budgetSec + " 秒</span></div>" +
      '<span class="pv-kicker">' + icon("spark", 15) + e(q.categoryLabel) +
      (q.unsupported
        ? '<span class="pv-coach-badge warn">缺口题</span>'
        : q.jdLink.must
          ? '<span class="pv-coach-badge ok">必备要求</span>'
          : '<span class="pv-coach-badge">加分项</span>') +
      "</span>" +
      '<h2 style="margin:8px 0 4px">' + e(probe ? probe.question : q.question) + "</h2>" +
      "<h4>为什么问</h4><p>" + e(probe ? probe.gapText + "（追问第 " + probe.level + " 层）" : q.whyAsked) + "</p>" +
      "<h4>证据绑定</h4><p>" + (q.factLink ? e(q.factLink.title + " · " + q.factLink.anchor) : "暂无对应事实：先补一条经历，或只练口径") + "</p>" +
      '<details class="pv-coach-details"><summary>BARS 四档 · 这一题怎么算好</summary>' +
      BARS_ORDER.map((k) => "<div><b>" + e(window.InterviewForge.BARS[k].label) + "</b>：" + e(q.bars[k]) + "</div>").join("") +
      "</details>" +
      '<details class="pv-coach-details"><summary>会被扣分的说法</summary>' +
      q.redFlags.map((r) => "<div>· " + e(r) + "</div>").join("") +
      "</details>" +
      '<label class="pv-answer">我的回答（限 180 秒）<textarea rows="6" data-answer placeholder="先说结论，再说你做的三步，最后给数字和基线…"></textarea></label>' +
      '<div class="pv-coach-live" data-live><span>字数 <b>0</b></span><span>预计 0 秒</span><span>填充词 0</span><span>数字 0</span></div>' +
      '<div class="pv-coach-actions"><button class="pv-btn pv-primary" data-submit>' + icon("check", 16) + "提交判定</button>" +
      '<button class="pv-btn" data-finish>结束并出分</button></div>' +
      (judge ? judgeHtml(judge) : "")
    );
  }

  function judgeHtml(j) {
    if (j.kind === "probe")
      return (
        '<div class="pv-coach-card"><div class="pv-coach-meta"><span class="pv-coach-badge warn">追问</span>' +
        "<span>在考：" + e(j.probe.gapText) + "</span><span>还剩 " + j.progress.followUpsLeft + " 层</span></div><p>" +
        e(j.probe.question) + "</p></div>" + scoreHtml(j.last)
      );
    if (j.kind === "advance" || j.kind === "finish")
      return scoreHtml(j.last) + (j.kind === "finish" ? '<div class="pv-coach-fix">本场结束：' + e(j.reason || "") + "</div>" : "");
    return "";
  }

  function finishHtml(s) {
    const sc = s.finish().scorecard;
    const F = window.InterviewForge;
    return (
      '<div class="pv-coach-card"><div class="pv-coach-score"><strong>' + sc.overall + "</strong><span>" + e(sc.barsLabel) +
      " · 答 " + sc.answered + "/" + sc.total + " 题 · 追问 " + sc.probeCount + " 次</span></div>" +
      Object.keys(sc.dims).map((k) => barRow(F.DIM_LABEL[k], sc.dims[k])).join("") +
      '<div class="pv-coach-meta"><span>L4 ' + sc.barsMix.L4 + "</span><span>L3 " + sc.barsMix.L3 +
      "</span><span>L2 " + sc.barsMix.L2 + "</span><span>L1 " + sc.barsMix.L1 + "</span></div>" +
      sc.topFixes.map((f) => '<div class="pv-coach-fix">· ' + e(f.text) + "（" + f.times + " 次）</div>").join("") +
      '<div class="pv-coach-actions"><button class="pv-btn pv-primary" data-writeback>' + icon("edit", 16) + "写入口述稿 v2</button>" +
      '<button class="pv-btn" data-restart>再练一轮</button></div>' +
      '<div class="pv-coach-fix" style="color:#5b6b60">下一步：把三条改法补进 STAR 案例页，再练一轮，看追问次数有没有下降。</div></div>'
    );
  }

  function bind(section, ctx) {
    const s = ensureSession(ctx);
    const ta = section.querySelector("[data-answer]");
    if (ta) {
      const live = section.querySelector("[data-live]");
      ta.oninput = () => {
        const m = window.InterviewForge.objectiveMetrics(ta.value, 0, 180);
        const sec = Math.round(m.chars / window.InterviewForge.CHARS_PER_SEC);
        live.innerHTML =
          "<span>字数 <b>" + m.chars + "</b></span><span>预计 <b>" + sec + "</b> 秒" +
          (sec > 180 ? ' <span class="bad">超时</span>' : "") +
          "</span><span>填充词 <b" + (m.fillerRate > 0.03 ? ' class="bad"' : "") + "> " + m.fillerCount +
          "</b></span><span>数字 <b>" + m.numbers + "</b></span>";
      };
    }
    const start = section.querySelector("[data-start]");
    if (start) start.onclick = () => draw(section, ctx);
    const gold = section.querySelector("[data-golden]");
    if (gold)
      gold.onclick = () => {
        showGolden = !showGolden;
        draw(section, ctx);
      };
    section.querySelectorAll("[data-i]").forEach((b) => {
      b.onclick = () => {
        const target = +b.dataset.i;
        const cur = s.current();
        if (cur && target < cur.index) {
          api().toast("本场只能往后练；想重来请先结束本场");
          return;
        }
        let guard = 0;
        while (s.current() && s.current().index < target && guard++ < 40) {
          s.submit("（跳过：先看下一题题面）", { elapsedSec: 1 });
        }
        judge = null;
        probe = null;
        draw(section, ctx);
      };
    });
    const submit = section.querySelector("[data-submit]");
    if (submit)
      submit.onclick = () => {
        const text = ta ? ta.value : "";
        if (!text.trim()) {
          api().toast("先写一句结论，再补三步动作");
          return;
        }
        const out = s.submit(text, { elapsedSec: Math.round(text.length / window.InterviewForge.CHARS_PER_SEC) });
        if (out.kind === "reject") {
          api().toast(out.reason);
          return;
        }
        judge = out;
        probe = out.kind === "probe" ? out.probe : null;
        if (out.kind === "finish") saveScore(ctx, out.scorecard);
        draw(section, ctx);
      };
    const fin = section.querySelector("[data-finish]");
    if (fin)
      fin.onclick = () => {
        const out = s.finish();
        judge = out;
        probe = null;
        saveScore(ctx, out.scorecard);
        draw(section, ctx);
      };
    const write = section.querySelector("[data-writeback]");
    if (write)
      write.onclick = () => {
        const sc = s.finish().scorecard;
        const p = s.pack;
        const entry = (p.facts || [])[0];
        if (!entry) {
          api().toast("还没有可写入的经历");
          return;
        }
        const F = window.InterviewForge;
        const g = F.compileGoldenCase({ fact: entry, role: p.role, requirements: p.requirements });
        if (!g.ok) {
          api().toast("先补一条完整经历，才能生成口述稿");
          return;
        }
        const im = F.improveScript({ goldenCase: g, scorecard: sc });
        const cases = saved(ctx).cases || {};
        const k = String(entry.id);
        const prev = cases[k] || {};
        ctx.save({
          cases: Object.assign({}, cases, {
            [k]: Object.assign({}, prev, {
              script: im.script,
              scriptV: (Number(prev.scriptV) || 1) + 1,
              scriptAt: Date.now(),
              scriptNote: im.note,
            }),
          }),
        });
        api().toast("已写入口述稿 v" + ((Number(prev.scriptV) || 1) + 1));
        draw(section, ctx);
      };
    const again = section.querySelector("[data-restart]");
    if (again)
      again.onclick = () => {
        session = null;
        judge = null;
        probe = null;
        draw(section, ctx);
      };
  }

  function saveScore(ctx, scorecard) {
    ctx.save({
      coach: Object.assign({}, saved(ctx).coach || {}, {
        last: {
          at: Date.now(),
          overall: scorecard.overall,
          barsLabel: scorecard.barsLabel,
          probeCount: scorecard.probeCount,
          avgSec: scorecard.avgSec,
          topFixes: scorecard.topFixes,
          answered: scorecard.answered,
          total: scorecard.total,
        },
      }),
    });
  }

  function draw(section, ctx) {
    ensureStyle();
    const s = ensureSession(ctx);
    const started = s.current() !== null || judge !== null || s.records().length > 0;
    if (!started) {
      section.innerHTML = startHtml(ctx);
      bind(section, ctx);
      return;
    }
    section.innerHTML =
      '<div class="pv-coach"><div class="pv-question-layout"><div class="pv-qlist">' + qlistHtml(s) +
      '</div><article class="pv-qdetail">' + questionHtml(s) + "</article></div></div>";
    bind(section, ctx);
  }

  window.drawCoachPanel = function (section, ctx) {
    if (!window.InterviewForge) {
      section.innerHTML = '<div class="pv-noinfo">' + icon("spark", 32) + "<h2>面试工坊未加载</h2><p>请确认 shared/interview-forge.js 已引入。</p></div>";
      return;
    }
    draw(section, ctx);
  };
})();
