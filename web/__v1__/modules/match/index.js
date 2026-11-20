(() => {
  "use strict";
  const A = () => window.App;
  const esc = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char],
    );
  const uid = () =>
    globalThis.crypto?.randomUUID?.() ||
    String(Date.now()) + Math.random().toString(36).slice(2);
  const split = (value) =>
    String(value || "")
      .split(/\r?\n/)
      .map((s) => s.replace(/^\s*(?:[-•·]|\d+[.、])\s*/, "").trim())
      .filter(Boolean);
  const prefs = ["优先", "可接受", "暂不考虑"];
  const kinds = {
    direct: "直接支持",
    partial: "部分支持",
    unknown: "待补信息",
    gap: "已知不满足",
  };
  const directions = ["互联网", "计算机", "金融"];
  const historyKey = "matchLastAnalysis";
  const samples = [
    [
      "互联网",
      "云序科技",
      "产品运营实习生",
      "互联网服务",
      "可接受",
      ["归纳用户反馈", "组织产品试用"],
      ["社群运营经验"],
      "归纳试用反馈并跟进产品迭代，协助整理用户需求。",
    ],
    [
      "互联网",
      "青屿科技",
      "AI 产品实习生",
      "人工智能",
      "优先",
      ["用户调研", "原型设计", "需求分析"],
      ["AI 产品项目经验"],
      "协助 AI 产品的用户研究、原型设计和需求验证。",
    ],
    [
      "互联网",
      "松石网络",
      "商业运营实习生",
      "企业服务",
      "可接受",
      ["分析业务数据", "独立推进签约"],
      ["客户访谈经验"],
      "协助梳理客户需求、跟进业务数据和合作进度。",
    ],
  ].map(
    (
      [
        direction,
        company,
        role,
        industry,
        preference,
        requirements,
        bonus,
        body,
      ],
      i,
    ) => ({
      id: "sample-jd-" + i,
      direction,
      company,
      role,
      industry,
      preference,
      requirements,
      bonus,
      text:
        company +
        " · " +
        role +
        "\n" +
        body +
        "\n任职要求\n" +
        requirements.join("\n") +
        "\n加分项\n" +
        bonus.join("\n"),
      revision: 1,
      sample: true,
      style: i,
      checks: {},
      attachments: [],
      history: [],
    }),
  );
  function jobs() {
    const found = A().get("jds", null);
    if (Array.isArray(found)) return found;
    A().set("jds", samples);
    return samples;
  }
  function facts() {
    return (A().get("experiences", []) || []).filter(
      (f) =>
        f &&
        !["待核实", "待确认", "待核对"].includes(f.status) &&
        f.confirmed !== false,
    );
  }
  function sourceOf(f) {
    const s = f.source ?? f.file ?? "经历库";
    return typeof s === "object" ? s.name || s.title || "经历库" : s;
  }
  const domains = [
    ["用户调研", "用户研究", "用户访谈", "访谈用户"],
    ["用户反馈", "试用反馈", "反馈归纳", "整理反馈"],
    ["产品试用", "试用反馈", "试点", "组织试用"],
    ["原型设计", "交互原型", "原型"],
    ["业务数据", "数据分析", "业务分析"],
    ["需求分析", "需求梳理", "需求文档", "用户需求"],
    ["客户签约", "推进签约", "签订合同"],
    ["评测设计", "离线评测", "评测方案"],
    ["用户增长", "增长实验"],
    ["性能优化", "性能评估"],
    ["行业研究", "行业分析", "研报"],
    ["风险评估", "风险识别"],
    ["编程开发", "软件开发", "开发模块"],
    ["社群运营", "社群活动"],
  ];
  function evidence(jd, requirement, library) {
    const mark = jd.checks?.[requirement];
    if (mark?.kind === "gap")
      return {
        requirement,
        kind: "gap",
        quote: mark.note || "本人确认目前不具备这项要求",
        title: "本人确认",
        source: "岗位核对",
      };
    const parts = domains
      .filter((set) => set.some((s) => requirement.includes(s)))
      .flat();
    let best = null;
    for (const fact of library) {
      const quote = [
        fact.action,
        fact.result,
        fact.role,
        fact.description,
        fact.text,
      ]
        .filter((s) => typeof s === "string" && s.trim())
        .join("；");
      if (!quote) continue;
      const kind = quote.includes(requirement)
        ? "direct"
        : parts.some((p) => quote.includes(p))
          ? "partial"
          : null;
      if (!kind) continue;
      const entry = {
        requirement,
        kind,
        quote,
        title: fact.title || "个人经历",
        source: sourceOf(fact),
      };
      if (kind === "direct") return entry;
      best ||= entry;
    }
    return (
      best || {
        requirement,
        kind: "unknown",
        quote: "尚未找到对应的已确认经历。",
        source: "",
        title: "",
      }
    );
  }
  function analyse(jd, library) {
    const requirements = [...new Set(jd.requirements || [])];
    const eligible = jd.sample
      ? library
      : library.filter((f) => !f.demo && !f.sample);
    const rows = requirements.map((r) => evidence(jd, r, eligible));
    const counts = Object.fromEntries(
      Object.keys(kinds).map((k) => [
        k,
        rows.filter((row) => row.kind === k).length,
      ]),
    );
    return {
      id: jd.id,
      role: jd.role,
      company: jd.company,
      preference: jd.preference,
      revision: jd.revision,
      rows,
      counts,
      coverage: rows.length
        ? (counts.direct + 0.5 * counts.partial) / rows.length
        : 0,
    };
  }
  function order(items) {
    const rank = (a) =>
      a.preference === "优先" ? 0 : a.preference === "暂不考虑" ? 2 : 1;
    return items.sort(
      (a, b) =>
        rank(a) - rank(b) ||
        Number(!a.rows.length) - Number(!b.rows.length) ||
        Number(!!a.counts.gap) - Number(!!b.counts.gap) ||
        b.coverage - a.coverage,
    );
  }
  function tied(a, b) {
    return (
      a &&
      (a.preference || "可接受") === (b.preference || "可接受") &&
      !!a.rows.length === !!b.rows.length &&
      !!a.counts.gap === !!b.counts.gap &&
      a.coverage === b.coverage
    );
  }
  function signature(list) {
    return JSON.stringify([
      list.map((j) => [j.id, j.revision, j.preference]),
      facts().map((f) => [f.title, f.action, f.result, f.status]),
    ]);
  }
  function select(id) {
    const jd = jobs().find((j) => j.id === id);
    if (!jd) return;
    const result = analyse(jd, facts());
    A().set("target", { ...jd, evidence: result.rows });
  }
  function symbol(type, size = 18) {
    const paths = {
      plus: "M12 5v14M5 12h14",
      sliders: "M4 6h5m4 0h7M4 12h10m4 0h2M4 18h3m4 0h9M9 4v4m5 2v4m-7 2v4",
      spark: "m12 3 2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2Z",
      edit: "m4 20 1-5L16 4l4 4L9 19ZM13.5 6.5l4 4",
      upload: "M12 15V3m-5 5 5-5 5 5M4 15v5h16v-5",
      close: "m5 5 14 14M5 19 19 5",
      cards: "m5 4 12 1-1 15-12-1zM19 6l2 1-2 13",
      file: "M6 3h8l4 4v14H6zM14 3v5h4",
      check: "M4 12l5 5L20 6",
      chev: "m9 5 7 7-7 7",
    };
    return (
      '<svg width="' +
      size +
      '" height="' +
      size +
      '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="' +
      paths[type] +
      '"/></svg>'
    );
  }
  function art(index) {
    const turn = index % 3;
    const ray = (n) =>
      Array.from(
        { length: n },
        (_, i) =>
          '<path d="M80 20v' +
          (i % 2 ? "3" : "6") +
          '" transform="rotate(' +
          (i * 360) / n +
          ' 80 68)"/>',
      ).join("");
    const stars = [
      [14, 25],
      [33, 18],
      [124, 28],
      [144, 45],
      [18, 93],
      [122, 110],
      [34, 115],
      [136, 85],
    ]
      .map(
        ([x, y], i) =>
          '<path transform="translate(' +
          x +
          " " +
          y +
          ") scale(" +
          (i % 3 === 0 ? 0.8 : 0.48) +
          ')" d="M0-4 1-1 4 0 1 1 0 4-1 1-4 0-1-1Z"/>',
      )
      .join("");
    const compass =
      '<circle cx="80" cy="68" r="38"/><circle cx="80" cy="68" r="42" stroke-dasharray="1 3"/>' +
      ray(48) +
      '<path d="m80 24 7 35 31 9-31 6-7 39-8-39-31-6 31-9Z"/><path d="m80 24 0 44-8-9zm38 44H80l7 6zm-38 45V68l-8 6zM41 68h39l-8-9z" fill="currentColor" opacity=".38"/><path d="m58 45 22 13 22-13-12 23 12 22-22-13-22 13 12-22z"/><circle cx="80" cy="68" r="4"/>';
    const orbit =
      '<g transform="rotate(-28 80 68)"><ellipse cx="80" cy="68" rx="62" ry="18"/><ellipse cx="80" cy="68" rx="57" ry="13" stroke-dasharray="1 2"/><circle cx="80" cy="68" r="32" fill="var(--match-card)" stroke-width="1.3"/><path d="M54 50q26 17 54 1M51 55q29 18 59 1M49 61q31 17 62 1M49 67q30 17 62 1M49 74q32 16 61 1M52 81q27 12 56 1M55 87q23 10 49 1"/><path d="M18 68c0 24 124 24 124 0M23 68c0 18 114 18 114 0"/></g><circle cx="80" cy="68" r="48" stroke-dasharray="1 3"/><path d="M77 13h6m-3-3v6m-4 101h8"/>';
    const peaks =
      '<circle cx="80" cy="58" r="31" stroke-dasharray="1 1.8"/><circle cx="80" cy="58" r="24"/><circle cx="80" cy="58" r="18"/>' +
      Array.from(
        { length: 19 },
        (_, i) =>
          '<path d="M80 20v5" transform="rotate(' + (i - 9) * 9 + ' 80 58)"/>',
      ).join("") +
      '<path d="M20 100 62 51l18 26 14-18 46 44-117-1Zm16-2 26-47-5 29 8-4 15 18m-9-30 1 14 6 3m1 17 15-39-3 24 10-5 24 24" fill="var(--match-card)"/><path d="m53 90-5 9m9-16-4 14m7-14-1 15m5-14 2 14m24-9-2 11m6-13-1 13m5-15 2 15m2-13 5 13"/><path d="M41 106h77m-65 4h53m-38 4h22"/>';
    return (
      '<svg class="match-art" viewBox="0 0 160 130" fill="none" stroke="currentColor" stroke-width=".85" stroke-linejoin="round" aria-hidden="true">' +
      stars +
      [compass, orbit, peaks][turn] +
      "</svg>"
    );
  }
  let run = 0;
  function render(root) {
    const token = ++run;
    let demoDeck = !jobs().some((j) => !j.sample);
    const deckRows = () => jobs().filter((j) => Boolean(j.sample) === demoDeck);
    const reportKey = () => historyKey + (demoDeck ? "Demo" : "Personal");
    let list = deckRows();
    let report = A().get(reportKey(), null);
    let current =
      report?.items.find((x) => list.some((j) => j.id === x.id))?.id ||
      list[0]?.id;
    let busy = false;
    let dragCount = 0;
    root.innerHTML =
      '<div class="match-page"><header class="match-head"><div><h1>岗位匹配分析台</h1><p>把心仪的岗位放在一起，找到经历与机会的交集。</p></div><button class="match-btn match-dark" data-add>' +
      symbol("plus") +
      '添加 JD</button></header><section class="match-board"><div class="match-boardhead"><div><span class="match-boardicon">' +
      symbol("cards", 20) +
      '</span><h2>我的岗位牌组</h2><span class="match-count"></span></div><button class="match-btn match-analyse" data-analyse>' +
      symbol("spark") +
      '分析匹配</button></div><div class="match-deckswitch" hidden></div><div class="match-deck"></div><div class="match-boardfoot"><span>' +
      symbol("upload", 14) +
      '支持拖入 JD 文本或截图</span><span class="match-legend">点击牌卡核对岗位详情</span></div></section><div class="match-status" aria-live="polite"></div><section class="match-result"></section></div>';
    const q = (s) => root.querySelector(s);
    const deck = q(".match-deck"),
      board = q(".match-board");
    function ordered() {
      const lastIds = report?.items.map((i) => i.id) || [];
      return [...list].sort(
        (a, b) =>
          (lastIds.includes(a.id) ? lastIds.indexOf(a.id) : 1e8) -
          (lastIds.includes(b.id) ? lastIds.indexOf(b.id) : 1e8),
      );
    }
    function makeCard(j) {
      const card = document.createElement("button");
      const idx = j.style || 0;
      card.className = "match-card match-skin-" + (idx % 3);
      card.dataset.id = j.id;
      card.setAttribute(
        "aria-label",
        j.company + "，" + j.role + "，查看并核对岗位要求",
      );
      card.innerHTML =
        '<span class="match-cardframe"></span><span class="match-cardtop"><span>' +
        esc(j.direction || "方向待核对") +
        '</span><span class="match-cardgem">✧</span></span>' +
        art(idx) +
        '<span class="match-cardname">' +
        esc(j.role || "岗位待核对") +
        '</span><span class="match-cardcompany">' +
        esc(j.company || "公司待核对") +
        '</span><span class="match-cardfoot"><span>' +
        esc(j.preference || "意向未填") +
        "</span><span>" +
        (j.sample ? "示例 · " : "") +
        "JD v" +
        esc(j.revision || 1) +
        "</span></span>";
      const preview = () => {
        q(".match-legend").textContent =
          (j.requirements || []).slice(0, 2).join(" · ") || "点击核对岗位原文";
      };
      const reset = () => {
        q(".match-legend").textContent = "点击牌卡核对岗位详情";
      };
      card.addEventListener("pointerenter", preview);
      card.addEventListener("focus", preview);
      card.addEventListener("pointerleave", reset);
      card.addEventListener("blur", reset);
      card.addEventListener("click", () => {
        if (!busy) edit(j);
      });
      return card;
    }
    function cards() {
      const all = jobs(),
        switcher = q(".match-deckswitch");
      switcher.hidden =
        !all.some((j) => j.sample) || !all.some((j) => !j.sample);
      switcher.innerHTML =
        '<button type="button" data-personal aria-pressed="' +
        !demoDeck +
        '">我的岗位</button><button type="button" data-demo aria-pressed="' +
        demoDeck +
        '">示例牌组</button>';
      switcher.querySelectorAll("button").forEach(
        (b) =>
          (b.onclick = () => {
            if (busy) return;
            demoDeck = b.hasAttribute("data-demo");
            latest();
            current = report?.items[0]?.id || list[0]?.id;
            cards();
            results();
            q(".match-status").textContent = "";
          }),
      );
      q(".match-boardhead h2").textContent =
        demoDeck && list.length ? "示例岗位牌组" : "我的岗位牌组";
      q("[data-analyse]").innerHTML =
        symbol("spark") + (report ? "重新分析" : "分析匹配");
      deck.replaceChildren();
      ordered().forEach((j) => deck.append(makeCard(j)));
      if (!list.length)
        deck.innerHTML =
          '<button data-empty-add class="match-emptycard">' +
          symbol("plus", 32) +
          "添加第一个岗位</button>";
      q("[data-empty-add]")?.addEventListener("click", () => edit());
      q(".match-count").textContent = list.length + " 个岗位";
      q("[data-analyse]").disabled = !list.length;
    }
    function latest() {
      const all = jobs();
      if (!all.some((j) => Boolean(j.sample) === demoDeck))
        demoDeck = !all.some((j) => !j.sample);
      list = deckRows();
      report = A().get(reportKey(), null);
    }
    async function start() {
      if (busy || !list.length) return;
      busy = true;
      const button = q("[data-analyse]");
      button.disabled = true;
      q("[data-add]").disabled = true;
      button.innerHTML = symbol("spark") + "比较中";
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const status = q(".match-status");
      status.textContent = "正在对照岗位意向、明确要求和已确认经历…";
      const cards = [...deck.children];
      const rects = new Map(
        cards.map((c) => [c.dataset.id, c.getBoundingClientRect()]),
      );
      const signs = cards.map((_, i) => (i % 2 ? 1 : -1));
      const rotations = cards.map((_, i) => signs[i] * (2 + (i % 3)));
      const lift = cards.map(
        (_, i) => "translateY(-14px) rotate(" + rotations[i] + "deg)",
      );
      const animations = [];
      const sleep = (n) => new Promise((resolve) => setTimeout(resolve, n));
      try {
        board.classList.add("match-working");
        const result = order(list.map((j) => analyse(j, facts())));
        report = { items: result, signature: signature(list), at: Date.now() };
        if (A().set(reportKey(), report) === false) {
          status.textContent = "分析结果保留在当前页面，本机空间不足。";
        }
        if (!reduced) {
          cards.forEach((c, i) =>
            animations.push(
              c.animate([{ transform: "none" }, { transform: lift[i] }], {
                duration: 360,
                delay: Math.min(i, 5) * 35,
                easing: "cubic-bezier(.18,.7,.3,1)",
                fill: "both",
              }),
            ),
          );
          await sleep(730);
        }
        if (!root.contains(board) || run !== token) return;
        current = result[0]?.id;
        animations.splice(0).forEach((a) => a.cancel());
        ordered().forEach((j) =>
          deck.append(cards.find((c) => c.dataset.id === j.id)),
        );
        if (!reduced) {
          [...deck.children].forEach((c, i) => {
            const old = rects.get(c.dataset.id),
              next = c.getBoundingClientRect(),
              k = cards.indexOf(c);
            const dx = old.left - next.left,
              dy = old.top - next.top;
            c.style.zIndex = String(cards.length - i);
            animations.push(
              c.animate(
                [
                  {
                    transform:
                      "translate(" +
                      dx +
                      "px," +
                      (dy - 14) +
                      "px) rotate(" +
                      rotations[k] +
                      "deg)",
                  },
                  {
                    transform:
                      "translate(" +
                      dx * 0.35 +
                      "px," +
                      (dy * 0.35 - 24) +
                      "px) rotate(" +
                      -rotations[k] * 0.7 +
                      "deg)",
                    offset: 0.48,
                  },
                  { transform: "none" },
                ],
                {
                  duration: 620,
                  delay: Math.min(i, 7) * 95,
                  easing: "cubic-bezier(.22,.67,.25,1)",
                  fill: "both",
                },
              ),
            );
          });
          await Promise.all(animations.map((a) => a.finished.catch(() => {})));
        }
        if (!root.contains(board) || run !== token) return;
        status.innerHTML =
          symbol("check", 15) + "已按你的岗位意向与经历证据排序";
        results();
      } finally {
        animations.forEach((a) => a.cancel());
        cards.forEach((c) => (c.style.zIndex = ""));
        if (root.contains(board)) {
          board.classList.remove("match-working");
          busy = false;
          button.disabled = false;
          q("[data-add]").disabled = false;
          button.innerHTML = symbol("spark") + "重新分析";
        }
      }
    }
    function results() {
      const host = q(".match-result");
      if (!report || !report.items.length || !list.length) {
        host.innerHTML =
          '<div class="match-sectionhead"><h2>对比维度</h2></div><div class="match-dimensions">' +
          [
            ["sliders", "岗位意向", "按你的目标方向和偏好排序。"],
            ["file", "经历证据", "逐项对照 JD 要求与经历原文。"],
            ["spark", "待补信息", "找出值得补充的成果和细节。"],
          ]
            .map(
              ([ico, t, d]) =>
                '<div><span class="match-dimicon">' +
                symbol(ico, 21) +
                "</span><section><h3>" +
                t +
                "</h3><p>" +
                d +
                "</p></section></div>",
            )
            .join("") +
          "</div>";
        return;
      }
      const reports = report.items.filter((r) =>
        list.some((j) => j.id === r.id),
      );
      if (!reports.length) {
        host.innerHTML = "";
        return;
      }
      const job =
        list.find((j) => j.id === current) ||
        list.find((j) => j.id === reports[0].id);
      const data = reports.find((r) => r.id === job.id) || reports[0];
      const stale = signature(list) !== report.signature;
      let rank = 0;
      const quality = (d) =>
        !d.rows.length
          ? "条件待澄清"
          : d.counts.direct + d.counts.partial === 0
            ? "资料不足"
            : d.counts.direct +
              " 项直接支持 · " +
              d.counts.partial +
              " 项部分支持";
      host.innerHTML =
        '<div class="match-sectionhead"><h2>岗位比较</h2><span class="match-meta">' +
        (stale
          ? "资料有更新，重新分析可刷新结果"
          : "按意向、必需项缺口和证据覆盖排序") +
        '</span></div><div class="match-scroll"><table class="match-table"><thead><tr><th scope="col">比较项</th>' +
        reports
          .map((r, i) => {
            const same = tied(reports[i - 1], r);
            if (!same) rank = i + 1;
            return (
              '<th scope="col"><span class="match-rank">推荐 ' +
              rank +
              (same ? " · 同档" : "") +
              "</span><strong>" +
              esc(r.role) +
              "</strong><small>" +
              esc(r.company) +
              "</small></th>"
            );
          })
          .join("") +
        "</tr></thead><tbody>" +
        [
          ["岗位意向", (r) => esc(r.preference || "未填写")],
          ["证据覆盖", quality],
          [
            "缺口与待补",
            (r) =>
              r.counts.gap + " 项明确缺口 · " + r.counts.unknown + " 项待补",
          ],
          [
            "推荐依据",
            (r) =>
              '<button class="match-textbtn" data-why="' +
              esc(r.id) +
              '" aria-pressed="' +
              (r.id === data.id) +
              '">查看依据</button>',
          ],
        ]
          .map(
            ([title, f]) =>
              '<tr><th scope="row">' +
              title +
              "</th>" +
              reports.map((r) => "<td>" + f(r) + "</td>").join("") +
              "</tr>",
          )
          .join("") +
        '</tbody></table></div><article class="match-evidence"><div class="match-sectionhead"><div><span class="match-meta">' +
        esc(data.company) +
        " · JD v" +
        esc(data.revision) +
        "</span><h3>" +
        esc(data.role) +
        '的推荐依据</h3></div></div><div class="match-facts">' +
        (data.rows
          .map(
            (row) =>
              '<details><summary><span class="match-kind match-kind-' +
              row.kind +
              '">' +
              kinds[row.kind] +
              "</span><strong>" +
              esc(row.requirement) +
              "</strong>" +
              symbol("chev", 14) +
              "</summary><p>" +
              esc(row.quote) +
              "</p>" +
              (row.source
                ? "<small>" +
                  esc(row.title) +
                  " · " +
                  esc(row.source) +
                  "</small>"
                : "") +
              "</details>",
          )
          .join("") ||
          "<p>这份 JD 尚未填写明确必需项，可先核对岗位原文。</p>") +
        "</div>" +
        (job.bonus?.length
          ? '<p class="match-bonus">加分条件　' +
            esc(job.bonus.join("、")) +
            "</p>"
          : "") +
        '<div class="match-actions"><button class="match-btn match-dark" data-next="resume" ' +
        (stale ? 'disabled title="请先重新分析更新后的资料"' : "") +
        '>用这个岗位改简历</button><button class="match-btn" data-next="interview" ' +
        (stale ? 'disabled title="请先重新分析更新后的资料"' : "") +
        ">准备面试</button></div></article>";
      host.querySelectorAll("[data-why]").forEach(
        (b) =>
          (b.onclick = () => {
            current = b.dataset.why;
            results();
            q(".match-evidence").scrollIntoView({
              behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
                ? "instant"
                : "smooth",
              block: "nearest",
            });
          }),
      );
      host.querySelectorAll(".match-facts details").forEach((detail) => {
        let transient = false;
        detail.onpointerenter = (e) => {
          if (e.pointerType === "mouse" && !detail.open) {
            detail.open = true;
            transient = true;
          }
        };
        detail.onpointerleave = () => {
          if (transient) {
            detail.open = false;
            transient = false;
          }
        };
        detail.querySelector("summary").onclick = (e) => {
          if (transient) {
            e.preventDefault();
            transient = false;
          }
        };
      });
      host.querySelectorAll("[data-next]").forEach(
        (b) =>
          (b.onclick = () => {
            select(data.id);
            A().go(b.dataset.next);
          }),
      );
    }
    function edit(job, files = []) {
      openEditor(job, files, (added) => {
        if (added) demoDeck = Boolean(added.sample);
        latest();
        cards();
        results();
        q(".match-status").textContent = "";
      });
    }
    q("[data-add]").onclick = () => edit();
    q("[data-analyse]").onclick = start;
    board.addEventListener("dragenter", (e) => {
      if (!e.dataTransfer.types.includes("Files") || busy) return;
      e.preventDefault();
      dragCount++;
      board.classList.add("match-over");
    });
    board.addEventListener("dragleave", () => {
      if (--dragCount <= 0) {
        dragCount = 0;
        board.classList.remove("match-over");
      }
    });
    board.addEventListener("dragover", (e) => {
      if (e.dataTransfer.types.includes("Files")) e.preventDefault();
    });
    board.addEventListener("drop", (e) => {
      if (!e.dataTransfer.files.length) return;
      e.preventDefault();
      board.classList.remove("match-over");
      dragCount = 0;
      if (!busy) edit(null, [...e.dataTransfer.files]);
    });
    cards();
    results();
    if (report) q("[data-analyse]").innerHTML = symbol("spark") + "重新分析";
  }
  function attachmentDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open("lvli-match-attachments", 1);
      req.onupgradeneeded = () => req.result.createObjectStore("images");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async function fileStore(id, file) {
    const db = await attachmentDB();
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction("images", file ? "readwrite" : "readonly");
        const req = file
          ? tx.objectStore("images").put(file, id)
          : tx.objectStore("images").get(id);
        tx.oncomplete = () => resolve(req.result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error("保存失败"));
      });
    } finally {
      db.close();
    }
  }
  function draft() {
    return {
      id: uid(),
      company: "",
      role: "",
      direction: "互联网",
      industry: "",
      text: "",
      revision: 0,
      preference: "",
      requirements: [],
      bonus: [],
      attachments: [],
      checks: {},
      history: [],
      sample: false,
    };
  }
  function openEditor(existing, incoming = [], onDone) {
    const original = existing ? JSON.parse(JSON.stringify(existing)) : draft();
    let working = JSON.parse(JSON.stringify(original));
    let files = [],
      urls = [],
      queue = [],
      activeIndex = 0,
      splitJobs = false,
      processing = false;
    const dialog = document.createElement("dialog");
    dialog.className = "match-dialog";
    dialog.innerHTML =
      '<form class="match-form"><header><div><span class="match-meta">' +
      (existing
        ? "JD v" +
          esc(existing.revision) +
          (existing.sample ? " · 示例岗位" : "")
        : "岗位原文与要求") +
      "</span><h2>" +
      (existing ? "核对岗位详情" : "添加目标岗位") +
      '</h2></div><button type="button" class="match-iconbtn" data-dismiss aria-label="关闭">' +
      symbol("close") +
      '</button></header><main><div class="match-uploader"><input type="file" accept=".txt,.md,.png,.jpg,.jpeg,.webp,image/*" multiple><span>' +
      symbol("upload", 20) +
      '<strong>拖入 JD 截图或文本文件</strong></span><small>支持多文件，也可以直接在下方粘贴原文</small></div><div class="match-filearea"></div><div class="match-errors" role="status"></div><div class="match-editrow"><label>公司名称<input name="company" placeholder="例如，青屿科技" maxlength="100" required></label><label>岗位原称<input name="role" placeholder="填写 JD 上的岗位名称" maxlength="100" required></label></div><div class="match-editrow"><label>职业方向<select name="direction">' +
      directions.map((d) => "<option>" + d + "</option>").join("") +
      '</select></label><label>所属行业<input name="industry" placeholder="例如，人工智能"></label></div><label>岗位原文<textarea name="text" rows="4" placeholder="粘贴岗位职责、任职要求等原文" required></textarea></label><div class="match-editrow"><label>明确必需条件<textarea name="requirements" rows="3" placeholder="每行一项，来源于岗位原文"></textarea></label><label>加分条件<textarea name="bonus" rows="3" placeholder="每行一项，可选填"></textarea></label></div><fieldset class="match-prefs"><legend>我的意向</legend>' +
      ["", ...prefs]
        .map(
          (p, i) =>
            '<label><input type="radio" name="preference" value="' +
            p +
            '"><span>' +
            ["未填写", "优先", "可接受", "暂不考虑"][i] +
            "</span></label>",
        )
        .join("") +
      '</fieldset><div class="match-manual"></div><div class="match-history"></div></main><footer><span class="match-meta" data-footer>保存后加入岗位牌组</span><button class="match-btn" type="button" data-dismiss>取消</button><button class="match-btn match-dark" type="submit">保存岗位</button></footer></form>';
    document.body.append(dialog);
    const form = dialog.querySelector("form"),
      f = (name) => form.elements.namedItem(name);
    const area = form.querySelector(".match-filearea"),
      err = form.querySelector(".match-errors"),
      uploader = form.querySelector(".match-uploader");
    const close = () => dialog.close();
    if (existing) {
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "match-remove";
      remove.textContent = "移出牌组";
      form.querySelector("footer").prepend(remove);
      const ask = document.createElement("div");
      ask.className = "match-remove-confirm";
      ask.hidden = true;
      ask.innerHTML =
        '<span>将这个岗位移出当前牌组？</span><button type="button" class="match-btn" data-keep>保留</button><button type="button" class="match-btn match-dark" data-confirm>确认移出</button>';
      form.querySelector("footer").before(ask);
      remove.onclick = () => {
        ask.hidden = false;
        remove.hidden = true;
        ask.querySelector("[data-keep]").focus();
      };
      ask.querySelector("[data-keep]").onclick = () => {
        ask.hidden = true;
        remove.hidden = false;
        remove.focus();
      };
      ask.querySelector("[data-confirm]").onclick = () => {
        if (
          A().set(
            "jds",
            jobs().filter((j) => j.id !== existing.id),
          ) === false
        )
          return;
        close();
        onDone();
        A().toast("岗位已移出牌组");
      };
    }
    dialog.addEventListener(
      "close",
      () => {
        urls.forEach(URL.revokeObjectURL);
        dialog.remove();
      },
      { once: true },
    );
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) close();
    });
    dialog
      .querySelectorAll("[data-dismiss]")
      .forEach((b) => (b.onclick = close));
    const read = () => ({
      ...working,
      company: f("company").value.trim(),
      role: f("role").value.trim(),
      industry: f("industry").value.trim(),
      direction: f("direction").value,
      preference: f("preference").value,
      text: f("text").value.trim(),
      requirements: [...new Set(split(f("requirements").value))],
      bonus: [...new Set(split(f("bonus").value))],
    });
    function fill(j) {
      working = j;
      [
        "company",
        "role",
        "industry",
        "text",
        "direction",
        "preference",
        "requirements",
        "bonus",
      ].forEach((k) => {
        f(k).value = Array.isArray(j[k]) ? j[k].join("\n") : j[k] || "";
      });
      showChecks();
    }
    function showChecks() {
      const reqs = split(f("requirements").value),
        host = form.querySelector(".match-manual");
      host.innerHTML = reqs.length
        ? '<details><summary>标记已确认的必需项缺口</summary><div class="match-check-list">' +
          reqs
            .map(
              (r, i) =>
                '<label><input type="checkbox" data-check="' +
                i +
                '" ' +
                (working.checks[r]?.kind === "gap" ? "checked" : "") +
                "><span>目前不具备「" +
                esc(r) +
                "」</span></label>",
            )
            .join("") +
          "</div></details>"
        : "";
      host.querySelectorAll("[data-check]").forEach(
        (c) =>
          (c.onchange = () => {
            const r = reqs[Number(c.dataset.check)];
            if (c.checked) working.checks[r] = { kind: "gap" };
            else delete working.checks[r];
          }),
      );
    }
    f("requirements").onchange = showChecks;
    const displayFile = (f) =>
      f.url
        ? '<a href="' +
          esc(f.url) +
          '" target="_blank" rel="noopener" class="match-thumb"><img src="' +
          esc(f.url) +
          '" alt="' +
          esc(f.name) +
          '"><small>' +
          esc(f.name) +
          "</small></a>"
        : '<span class="match-filetag">' +
          symbol("file", 14) +
          esc(f.name) +
          "</span>";
    function showFiles() {
      const multiple = files.length > 1 && !existing;
      area.innerHTML =
        (files.length
          ? '<div class="match-attachments">' +
            (splitJobs ? [files[activeIndex]] : files)
              .filter(Boolean)
              .map(displayFile)
              .join("") +
            "</div>"
          : "") +
        (multiple
          ? '<div class="match-filemodes"><button type="button" aria-pressed="' +
            !splitJobs +
            '" data-mode="merge">合为一个 JD</button><button type="button" aria-pressed="' +
            splitJobs +
            '" data-mode="split">分别建立 JD</button></div>'
          : "") +
        (splitJobs
          ? '<div class="match-tabs">' +
            files
              .map(
                (x, i) =>
                  '<button type="button" data-index="' +
                  i +
                  '" aria-pressed="' +
                  (i === activeIndex) +
                  '">' +
                  esc(x.name) +
                  "</button>",
              )
              .join("") +
            "</div>"
          : "");
      area.querySelectorAll("[data-mode]").forEach(
        (b) =>
          (b.onclick = () => {
            const next = b.dataset.mode === "split";
            if (next === splitJobs) return;
            stash();
            splitJobs = next;
            if (next) {
              activeIndex = 0;
              fill(queue[0]);
            } else fill(merged);
            showFiles();
          }),
      );
      area.querySelectorAll("[data-index]").forEach(
        (b) =>
          (b.onclick = () => {
            stash();
            activeIndex = Number(b.dataset.index);
            fill(queue[activeIndex]);
            showFiles();
          }),
      );
      form.querySelector("[data-footer]").textContent = splitJobs
        ? "逐份核对后将保存 " + files.length + " 个岗位"
        : existing
          ? "更改内容将生成新修订"
          : "保存后加入岗位牌组";
    }
    let merged = working;
    function stash() {
      if (splitJobs) queue[activeIndex] = read();
      else merged = read();
    }
    function parseText(content, name) {
      let raw = content.trim(),
        j = draft(),
        mode = "",
        req = [],
        bonus = [];
      const lines = split(raw);
      j.text = raw;
      const field = (rx) =>
        lines
          .find((s) => rx.test(s))
          ?.replace(rx, "")
          .trim() || "";
      j.company = field(/^(?:公司(?:名称)?|招聘企业)\s*[：:]\s*/);
      j.role = field(/^(?:岗位(?:原称|名称)?|职位(?:名称)?)\s*[：:]\s*/);
      if (
        !j.role &&
        lines[0]?.length < 40 &&
        /实习生|工程师|经理|分析师|运营|研究员|设计师/.test(lines[0])
      )
        j.role = lines[0];
      if (!j.role && !raw) j.role = (name || "").replace(/\.[^.]+$/, "");
      lines.forEach((s) => {
        const m = s.match(
          /^(?:任职要求|岗位要求|必需条件|硬性要求|加分条件|加分项|优先条件|岗位职责|职位描述)\s*[：:]?\s*/,
        );
        if (m) {
          mode = /加分|优先/.test(m[0])
            ? "bonus"
            : /要求|必需/.test(m[0])
              ? "req"
              : "";
          s = s.slice(m[0].length);
        }
        if (s) {
          if (mode === "req") req.push(s);
          if (mode === "bonus") bonus.push(s);
        }
      });
      j.requirements = req;
      j.bonus = bonus;
      return j;
    }
    f("text").addEventListener("paste", () =>
      setTimeout(() => {
        const next = parseText(f("text").value, "");
        ["company", "role", "requirements", "bonus"].forEach((k) => {
          if (!f(k).value.trim())
            f(k).value = Array.isArray(next[k]) ? next[k].join("\n") : next[k];
        });
        showChecks();
      }, 0),
    );
    async function ingest(list) {
      if (processing) return;
      processing = true;
      stash();
      err.textContent = "正在读取文件…";
      form.querySelector('[type="submit"]').disabled = true;
      const issues = [];
      for (const file of list) {
        if (!file.size) {
          issues.push(file.name + " 为空文件");
          continue;
        }
        if (file.size > 30 * 1024 * 1024) {
          issues.push(file.name + " 超过 30 MB");
          continue;
        }
        if (
          !/\.(?:md|txt|png|jpe?g|webp)$/i.test(file.name) &&
          !file.type.startsWith("image/")
        ) {
          issues.push(file.name + " 的格式不受支持");
          continue;
        }
        let text = "",
          url = "",
          imageId = "";
        try {
          if (
            file.type.startsWith("image/") ||
            /\.(?:png|jpe?g|webp)$/i.test(file.name)
          ) {
            url = URL.createObjectURL(file);
            urls.push(url);
            imageId = uid();
            if ("TextDetector" in window) {
              try {
                const img = await createImageBitmap(file);
                try {
                  text = (await new TextDetector().detect(img))
                    .map((b) => b.rawValue)
                    .join("\n");
                } finally {
                  img.close();
                }
              } catch {}
            }
            if (!text) issues.push("可对照截图填写原文和要求");
          } else {
            text = await file.text();
          }
          const j = parseText(text, file.name);
          const attachment = {
            name: file.name,
            id: imageId,
            url,
            file: imageId ? file : null,
          };
          files.push(attachment);
          queue.push(j);
          merged = {
            ...merged,
            company: merged.company || j.company,
            role: merged.role || j.role,
            requirements: [
              ...new Set([...merged.requirements, ...j.requirements]),
            ],
            bonus: [...new Set([...merged.bonus, ...j.bonus])],
            text: [merged.text, j.text].filter(Boolean).join("\n\n"),
          };
        } catch {
          issues.push("无法读取 " + file.name);
        }
      }
      if (!dialog.isConnected) return;
      fill(splitJobs ? queue[activeIndex] : merged);
      showFiles();
      err.textContent = [...new Set(issues)].join("；");
      processing = false;
      form.querySelector('[type="submit"]').disabled = false;
    }
    uploader.querySelector("input").onchange = (e) => {
      ingest([...e.target.files]);
      e.target.value = "";
    };
    uploader.ondragover = (e) => {
      e.preventDefault();
      uploader.classList.add("match-over");
    };
    uploader.ondragleave = () => uploader.classList.remove("match-over");
    uploader.ondrop = (e) => {
      e.preventDefault();
      uploader.classList.remove("match-over");
      ingest([...e.dataTransfer.files]);
    };
    form.onsubmit = async (e) => {
      e.preventDefault();
      if (processing) return;
      stash();
      const records = splitJobs ? queue : [merged],
        invalid = records.findIndex((j) => !j.company || !j.role || !j.text);
      if (invalid !== -1) {
        if (splitJobs) {
          activeIndex = invalid;
          fill(queue[activeIndex]);
          showFiles();
        }
        err.textContent = "请核对公司、岗位原称和岗位原文。";
        form.reportValidity();
        return;
      }
      const currentJobs = jobs();
      if (
        existing &&
        currentJobs.find((j) => j.id === existing.id)?.revision !==
          existing.revision
      ) {
        err.textContent = "此岗位已在另一处更新，关闭后重新打开可查看新版。";
        return;
      }
      processing = true;
      const submit = form.querySelector('[type="submit"]');
      submit.disabled = true;
      submit.textContent = "保存中…";
      try {
        for (const attachment of files)
          if (attachment.file && attachment.id)
            await fileStore(attachment.id, attachment.file);
        const updates = records.map((record, i) => {
          const images = (splitJobs ? [files[i]] : files).map(
            ({ id, name }) => ({ id, name }),
          );
          const revision = existing ? existing.revision + 1 : 1;
          const old = existing
            ? {
                id: existing.id,
                company: existing.company,
                role: existing.role,
                text: existing.text,
                revision: existing.revision,
                requirements: existing.requirements,
                bonus: existing.bonus,
                preference: existing.preference,
              }
            : null;
          return {
            ...record,
            id: existing ? existing.id : uid(),
            attachments: [...(original.attachments || []), ...images],
            style: existing ? existing.style : (currentJobs.length + i) % 3,
            revision,
            history: old ? [...(existing.history || []), old] : [],
          };
        });
        const next = existing
          ? currentJobs.map((j) => (j.id === existing.id ? updates[0] : j))
          : [...currentJobs, ...updates];
        if (A().set("jds", next) === false) throw new Error("保存失败");
        close();
        onDone(updates[0]);
        A().toast(
          existing ? "已保存岗位修订" : "已加入 " + updates.length + " 个岗位",
        );
      } catch {
        err.textContent = "当前浏览器无法保存资料，请检查本地存储空间后重试。";
      } finally {
        processing = false;
        submit.disabled = false;
        submit.textContent = "保存岗位";
      }
    };
    fill(working);
    if (existing?.history?.length)
      form.querySelector(".match-history").innerHTML =
        "<details><summary>查看以前的岗位原文（" +
        existing.history.length +
        "）</summary>" +
        existing.history
          .slice()
          .reverse()
          .map(
            (j) =>
              "<details><summary>JD v" +
              esc(j.revision) +
              " · " +
              esc(j.company) +
              " · " +
              esc(j.role) +
              "</summary><pre>" +
              esc(j.text) +
              "</pre></details>",
          )
          .join("") +
        "</details>";
    if (existing?.attachments?.length) {
      const prior = document.createElement("div");
      prior.className = "match-attachments";
      area.before(prior);
      existing.attachments.forEach(async (item) => {
        const el = document.createElement("span");
        el.className = "match-filetag";
        el.textContent = item.name;
        prior.append(el);
        if (item.id) {
          try {
            const blob = await fileStore(item.id);
            if (blob && dialog.isConnected) {
              const url = URL.createObjectURL(blob);
              urls.push(url);
              el.outerHTML = displayFile({ ...item, url });
            }
          } catch {}
        }
      });
    }
    dialog.showModal();
    if (incoming.length) ingest(incoming);
  }
  window.MatchData = { jobs, select };
  window.renderMatch = render;
})();
