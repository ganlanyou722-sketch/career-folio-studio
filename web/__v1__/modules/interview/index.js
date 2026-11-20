(function () {
  "use strict";
  const { api, e, get, put, go, inner, icon, textSource } = window.FolioViews;
  function interviewQuestions(t, entries) {
    const role = t.role || "目标岗位";
    const tech = /开发|算法|数据|测试|工程|后端|前端/.test(role);
    const finance = /行研|投研|资管|风控|投行|投资/.test(role);
    const sales = /KA|销售|大客户|商务/.test(role);
    const focus = tech
      ? "技术方案"
      : finance
        ? "分析结论"
        : sales
          ? "客户需求"
          : "迭代方向";
    const req =
      (t.requirements || [])
        .map((x) => (typeof x === "string" ? x : x.text || x.quote))
        .filter(Boolean)[0] ||
      String(t.text || "")
        .split(/[。；\n]/)
        .map((s) => s.trim())
        .find((s) => s.length > 5) ||
      "";
    const linked = (t.evidence || []).find((x) => x.requirement === req);
    const entry =
      entries.find((x) => linked?.title && x.title.includes(linked.title)) ||
      entries[0];
    const caseName = entry?.title || "";
    const prompt = req
      ? "岗位提到“" +
        (req.length > 62 ? req.slice(0, 62) + "…" : req) +
        "”。你有哪些相关实践？"
      : "你有哪些实践能说明自己适合" + role + "？";
    return [
      {
        q: prompt,
        kind: "岗位要求",
        why: req
          ? "这条要求直接出现在当前岗位描述中。"
          : "面试官需要判断过往实践与岗位职责的关联。",
        hook: "这段经历中，哪些工作由你独立完成？",
        source: req || role,
        entry,
      },
      {
        q:
          (caseName ? "在「" + caseName + "」中，" : "") +
          "当时为什么选择这个" +
          focus +
          "？",
        kind: "决策与取舍",
        why: "这个问题考察你如何比较备选方案、识别限制并做出判断。",
        hook: "如果时间再少一半，你会先保留什么？",
        source: req || role,
        entry,
      },
      {
        q: caseName
          ? "你如何验证「" + caseName + "」取得的结果？"
          : "怎么判断这项工作有了实际结果？",
        kind: "结果与复盘",
        why: "说明结果的范围、归属和验证方式，有助于面试官了解你的贡献。",
        hook: "哪一项结果可以由交付物或实际使用情况印证？",
        source: entry?.result || caseName || role,
        entry,
      },
    ];
  }
  function versionEntries(snapshot) {
    if (!snapshot) return [];
    const entries = [];
    let heading = "",
      section = "";
    for (const b of snapshot.blocks || []) {
      if (b.type === "section") {
        section = b.text;
        heading = "";
        continue;
      }
      if (b.type === "heading") {
        heading = b.text;
        continue;
      }
      if (b.type !== "body" || !b.text?.trim()) continue;
      if (/教育|技能|联系/.test(section) && !b.source && !b.experienceId)
        continue;
      entries.push({
        id: b.id,
        title: heading || b.title || b.text.split(/[\n。]/)[0].slice(0, 42),
        action: b.text,
        source: textSource(b.source) || snapshot.title,
        experienceId: b.experienceId,
      });
    }
    return entries;
  }
  function renderInterview(root) {
    let target = get("target", null);
    let snap = get("interviewResume", null);
    const boundTarget = snap?.interviewTarget || snap?.target;
    if (
      snap &&
      target &&
      boundTarget &&
      (boundTarget.company !== target.company ||
        boundTarget.role !== target.role ||
        (boundTarget.revision &&
          target.revision &&
          boundTarget.revision !== target.revision))
    )
      snap = null;
    let tab = "questions",
      activeQuestion = 0;
    const jobs = () => window.MatchData?.jobs?.() || get("jds", []);
    function chooseTarget() {
      const list = jobs();
      if (!list.length) {
        go("match");
        return;
      }
      api().modal(
        "选择面试岗位",
        inner(
          '<div class="pv-picklist">' +
            list
              .map(
                (j, i) =>
                  '<button class="pv-pick" data-index="' +
                  i +
                  '">' +
                  icon("brief") +
                  "<span><strong>" +
                  e(j.role || "未命名岗位") +
                  "</strong><small>" +
                  e(j.company || "公司待确认") +
                  " · JD v" +
                  e(j.revision || 1) +
                  "</small></span></button>",
              )
              .join("") +
            '<button class="pv-btn" data-new>' +
            icon("plus") +
            "添加其他岗位</button></div>",
        ),
        (el, close) => {
          el.querySelectorAll("[data-index]").forEach(
            (b) =>
              (b.onclick = () => {
                const j = list[+b.dataset.index];
                const pendingSnapshot = !target && snap;
                if (window.MatchData?.select) window.MatchData.select(j.id);
                else put("target", j);
                target = get("target", j);
                snap = pendingSnapshot
                  ? { ...pendingSnapshot, interviewTarget: target }
                  : null;
                put("interviewResume", snap);
                activeQuestion = 0;
                close();
                if (api().render) api().render();
                else show();
              }),
          );
          el.querySelector("[data-new]").onclick = () => {
            close();
            go("match");
          };
        },
      );
    }
    function pickResume() {
      const draft = get("resumeDraft", null);
      const list = [
        ...(draft ? [{ ...draft, _draft: true }] : []),
        ...get("resumeVersions", []),
      ];
      api().modal(
        "选择本次面试的简历",
        inner(
          '<div class="pv-picklist"><button class="pv-pick" data-none>' +
            icon("brief") +
            "<span><strong>仅用岗位描述准备</strong><small>从岗位条件、职责和反问开始</small></span></button>" +
            list
              .map(
                (s, i) =>
                  '<button class="pv-pick" data-snap="' +
                  i +
                  '">' +
                  icon("file") +
                  "<span><strong>" +
                  e(s.title || "简历") +
                  "</strong><small>" +
                  e(s._draft ? "当前工作稿" : "已归档版本") +
                  " · " +
                  e(
                    [s.target?.company, s.target?.role]
                      .filter(Boolean)
                      .join(" / ") || "通用方向",
                  ) +
                  "</small></span></button>",
              )
              .join("") +
            "</div>",
        ),
        (el, close) => {
          const bind = (s) => {
            snap = s
              ? {
                  ...s,
                  interviewTarget: {
                    id: target.id,
                    role: target.role,
                    company: target.company,
                    revision: target.revision,
                  },
                }
              : null;
            put("interviewResume", snap);
            close();
            show();
          };
          el.querySelector("[data-none]").onclick = () => bind(null);
          el.querySelectorAll("[data-snap]").forEach(
            (b) => (b.onclick = () => bind(list[+b.dataset.snap])),
          );
        },
      );
    }
    function packId() {
      return JSON.stringify([
        target.id || [target.company, target.role],
        target.revision || 1,
        snap?.id || "",
        snap?.revision || snap?.at || snap?.updatedAt || "",
      ]);
    }
    function pack() {
      return get("interviewPacks", {})[packId()] || {};
    }
    function save(patch) {
      const all = get("interviewPacks", {});
      all[packId()] = { ...(all[packId()] || {}), ...patch };
      put("interviewPacks", all);
    }
    function tabs() {
      return (
        '<nav class="pv-tabs" aria-label="面试准备分区">' +
        [
          ["questions", "chat", "预测问题"],
          ["cases", "layers", "STAR 案例"],
          ["news", "globe", "公司动向"],
          ["reverse", "mic", "面试反问"],
        ]
          .map(
            ([id, n, label]) =>
              '<button data-tab="' +
              id +
              '" aria-pressed="' +
              (id === tab) +
              '" class="' +
              (id === tab ? "pv-active" : "") +
              '">' +
              icon(n, 17) +
              label +
              "</button>",
          )
          .join("") +
        "</nav>"
      );
    }
    function show() {
      const title =
        '<header class="pv-head"><div><h1>面试打磨台</h1><p>围绕这次投递，练习有事实依据的回答。</p></div>' +
        (target
          ? '<button class="pv-btn" data-target>' +
            icon("settings") +
            "切换岗位</button>"
          : "") +
        "</header>";
      if (!target) {
        root.innerHTML = inner(
          title +
            '<section class="pv-inter-empty"><div class="pv-sound">' +
            icon("mic", 58) +
            '</div><h2>先选定面试岗位</h2><p>绑定公司和 JD 后，就能准备岗位问题、经历案例与面试反问。</p><button class="pv-btn pv-primary" data-target>' +
            icon("brief") +
            "选择面试岗位</button></section>",
        );
        root.querySelector("[data-target]").onclick = chooseTarget;
        return;
      }
      const sourceContext = snap
        ? (snap.title || "已绑定简历") +
          (snap.revision ? " · r" + snap.revision : "")
        : "仅岗位描述";
      root.innerHTML = inner(
        title +
          '<section class="pv-jobbanner"><div class="pv-jobinfo"><div class="pv-jobmeta">' +
          icon("brief", 16) +
          e(target.company || "公司待确认") +
          "<span>JD v" +
          e(target.revision || 1) +
          "</span></div><h2>" +
          e(target.role || "目标岗位") +
          '</h2></div><button class="pv-jobresume" data-pick-resume>' +
          icon("file") +
          "<span><small>面试材料</small><strong>" +
          e(sourceContext) +
          "</strong></span>" +
          icon("caret", 15) +
          "</button></section>" +
          tabs() +
          '<div class="pv-section"></div>',
      );
      root.querySelector("[data-target]").onclick = chooseTarget;
      root.querySelector("[data-pick-resume]").onclick = pickResume;
      root.querySelectorAll("[data-tab]").forEach(
        (b) =>
          (b.onclick = () => {
            tab = b.dataset.tab;
            show();
          }),
      );
      const section = root.querySelector(".pv-section");
      if (tab === "questions") drawQuestions(section);
      if (tab === "cases") drawCases(section);
      if (tab === "news") drawNews(section);
      if (tab === "reverse") drawReverse(section);
    }
    function currentEntries() {
      const fromResume = versionEntries(snap);
      if (snap) return fromResume;
      return get("experiences", []).filter(
        (x) => x.title && x.confirmed !== false && x.status !== "待核实",
      );
    }
    function sourcePopup() {
      api().modal(
        "本次准备的材料",
        inner(
          '<div class="pv-source"><h3>' +
            e(target.company) +
            " · " +
            e(target.role) +
            "</h3><small>JD v" +
            e(target.revision || 1) +
            "</small><p>" +
            e(
              target.text ||
                (target.requirements || []).join("\n") ||
                "尚未录入岗位原文。",
            ) +
            "</p>" +
            (snap
              ? "<h3>" +
                e(snap.title || "简历版本") +
                "</h3><p>" +
                e(
                  (snap.blocks || [])
                    .map((b) => b.text)
                    .filter(Boolean)
                    .join("\n"),
                ) +
                "</p>"
              : "") +
            "</div>",
        ),
      );
    }
    function drawQuestions(section) {
      const p = pack();
      const entries = snap
        ? versionEntries(snap)
        : currentEntries().filter((x, i) => String(x.id ?? i) === p.entryId);
      const list = interviewQuestions(target, entries);
      section.innerHTML =
        '<div class="pv-question-layout"><div class="pv-qlist" role="group" aria-label="选择预测问题">' +
        list
          .map(
            (q, i) =>
              '<button data-q="' +
              i +
              '" class="pv-qpick"><small>' +
              e(q.kind) +
              "</small><strong>" +
              e(q.q) +
              "</strong></button>",
          )
          .join("") +
        '</div><article class="pv-qdetail"></article></div>';
      const buttons = [...section.querySelectorAll("[data-q]")];
      const detail = section.querySelector(".pv-qdetail");
      function select(i) {
        activeQuestion = i;
        const q = list[i],
          p = pack();
        buttons.forEach((b, j) => {
          b.classList.toggle("pv-selected", i === j);
          b.setAttribute("aria-pressed", String(i === j));
        });
        detail.innerHTML =
          '<span class="pv-kicker">' +
          icon("spark", 15) +
          "预测问题</span><h2>" +
          e(q.q) +
          "</h2><h4>为什么可能问</h4><p>" +
          e(q.why) +
          "</p><h4>可能的追问</h4><p>" +
          e(q.hook) +
          '</p><button data-source class="pv-source-btn">' +
          icon("link", 15) +
          '查看岗位与简历依据</button><label class="pv-answer">我的回答草稿<textarea rows="4" data-answer placeholder="记下要说的行动、细节和结果…">' +
          e(p.notes?.[i] || "") +
          '</textarea></label><span class="pv-autosave" role="status">' +
          (p.notes?.[i] ? "已保存在本机" : "输入时自动保存") +
          "</span>";
        const sourceButton = detail.querySelector("[data-source]");
        if (q.entry) {
          const heading = document.createElement("h4");
          heading.textContent = "可用经历";
          const quote = document.createElement("p");
          quote.textContent =
            q.entry.title + " · " + (q.entry.action || q.entry.result || "");
          sourceButton.before(heading, quote);
        }
        sourceButton.onclick = sourcePopup;
        detail.querySelector("[data-answer]").oninput = (ev) => {
          save({ notes: { ...(pack().notes || {}), [i]: ev.target.value } });
          detail.querySelector(".pv-autosave").textContent = "已保存在本机";
        };
      }
      buttons.forEach((b, i) => {
        b.onclick = () => select(i);
        b.onpointerenter = (ev) => {
          if (
            ev.pointerType === "mouse" &&
            activeQuestion !== i &&
            !detail.contains(document.activeElement)
          )
            select(i);
        };
      });
      select(activeQuestion);
    }
    function drawCases(section) {
      const entries = currentEntries(),
        p = pack();
      const current = entries.find((x, i) => String(x.id ?? i) === p.entryId);
      const originLabel = snap ? "来自绑定简历" : "来自经历库";
      if (!entries.length) {
        section.innerHTML =
          '<div class="pv-noinfo">' +
          icon("layers", 32) +
          "<h2>补充一条真实经历</h2><p>" +
          e(
            snap
              ? "这份简历没有关联的经历条目。可以另选材料，或依据岗位描述先准备问题。"
              : "先在个人经历台确认自己做过的事，再把它写成面试案例。",
          ) +
          '</p><button class="pv-btn" data-where>' +
          (snap ? "选择面试材料" : "打开个人经历台") +
          "</button></div>";
        section.querySelector("[data-where]").onclick = snap
          ? pickResume
          : () => go("library");
        return;
      }
      section.innerHTML =
        '<section class="pv-panel"><div class="pv-subhead"><div><h2>选择案例经历</h2><p>' +
        originLabel +
        '，每个案例单独保存。</p></div></div><div class="pv-entrylist">' +
        entries
          .map(
            (x, i) =>
              '<button class="pv-epick ' +
              (x === current ? "pv-selected" : "") +
              '" aria-pressed="' +
              (x === current) +
              '" data-entry="' +
              i +
              '">' +
              icon("book", 16) +
              e(x.title) +
              "</button>",
          )
          .join("") +
        '</div></section><div class="pv-casebody"></div>';
      section.querySelectorAll("[data-entry]").forEach(
        (b) =>
          (b.onclick = () => {
            const i = +b.dataset.entry;
            save({ entryId: String(entries[i].id ?? i) });
            drawCases(section);
          }),
      );
      if (!current) return;
      const entryId = p.entryId,
        record = p.cases?.[entryId] || {};
      const fields = [
        ["s", "S", "情境", current.situation || current.context || ""],
        ["t", "T", "本人任务", current.task || current.role || ""],
        ["a", "A", "行动与取舍", current.action || ""],
        ["r", "R", "已确认结果", current.result || ""],
      ];
      const body = section.querySelector(".pv-casebody");
      const saveCase = (patch) => {
        const cases = pack().cases || {};
        save({
          cases: {
            ...cases,
            [entryId]: { ...(cases[entryId] || {}), ...patch },
          },
        });
      };
      body.innerHTML =
        '<section class="pv-panel"><div class="pv-subhead"><div><h2>' +
        e(current.title) +
        "</h2><p>" +
        e(textSource(current.source) || originLabel) +
        '</p></div></div><div class="pv-star">' +
        fields
          .map(
            ([id, char, label, fallback]) =>
              "<label><span><b>" +
              char +
              "</b>" +
              label +
              '</span><textarea data-star="' +
              id +
              '" rows="3" placeholder="' +
              e(
                id === "r"
                  ? "补充真实结果、实际使用或交付状态"
                  : "按自己经历补充",
              ) +
              '">' +
              e(record[id] ?? fallback) +
              "</textarea></label>",
          )
          .join("") +
        '</div><label class="pv-answer">可供追问的真实细节<input data-hook placeholder="例如一次有依据的取舍" value="' +
        e(record.hook || "") +
        '"></label><button class="pv-btn pv-primary" data-compose>' +
        icon("mic", 16) +
        '整理口述稿</button></section><section class="pv-panel pv-script"><label class="pv-answer">我的口述稿<textarea rows="5" placeholder="整理后可继续改成自己的表达。">' +
        e(record.script || "") +
        '</textarea></label><span class="pv-autosave">自动保存到本次面试</span></section>';
      body
        .querySelectorAll("[data-star]")
        .forEach(
          (t) => (t.oninput = () => saveCase({ [t.dataset.star]: t.value })),
        );
      const latest =
        current.experienceId &&
        get("experiences", []).find((x) => x.id === current.experienceId);
      const currentText =
        latest &&
        [latest.role, latest.action, latest.result].filter(Boolean).join("\n");
      if (latest && currentText !== current.action) {
        const comparison = document.createElement("details");
        comparison.className = "pv-comparison";
        comparison.innerHTML =
          "<summary>" +
          icon("layers", 16) +
          "比较投递稿与当前经历</summary><div><p><strong>本次绑定的投递稿</strong>" +
          e(current.action) +
          "</p><p><strong>当前经历库</strong>" +
          e(currentText) +
          "</p></div>";
        body.querySelector(".pv-subhead").after(comparison);
      }
      body.querySelector("[data-hook]").oninput = (ev) =>
        saveCase({ hook: ev.target.value });
      body.querySelector(".pv-script textarea").oninput = (ev) =>
        saveCase({ script: ev.target.value });
      body.querySelector("[data-compose]").onclick = () => {
        const lines = [...body.querySelectorAll("[data-star]")].map((el) =>
          el.value.trim(),
        );
        const hook = body.querySelector("[data-hook]").value.trim();
        const script = [...lines, hook]
          .filter(Boolean)
          .map((v) => (/[。！？]$/.test(v) ? v : v + "。"))
          .join("");
        if (!script) {
          api().toast("先写下一个真实细节");
          return;
        }
        const output = body.querySelector(".pv-script textarea");
        const apply = () => {
          output.value = script;
          saveCase({ script });
          output.focus();
          api().toast("已整理口述稿");
        };
        if (output.value && output.value !== script) {
          api().modal(
            "替换口述稿？",
            inner(
              '<div class="pv-source"><p>现有口述稿将替换为下方内容。</p><p>' +
                e(script) +
                '</p><button class="pv-btn pv-primary" data-apply>使用这份口述稿</button></div>',
            ),
            (el, close) =>
              (el.querySelector("[data-apply]").onclick = () => {
                close();
                apply();
              }),
          );
        } else apply();
      };
    }
    function drawNews(section) {
      const news = pack().news || [];
      section.innerHTML =
        '<div class="pv-panel"><div class="pv-subhead"><div><h2>' +
        e(target.company || "公司") +
        '的公开动向</h2><p>记录已核实的来源，以及它与岗位职责的关系。</p></div><button class="pv-btn" data-add>' +
        icon("plus", 16) +
        "补充来源</button></div>" +
        (news.length
          ? news
              .map(
                (n) =>
                  '<article class="pv-news"><small>' +
                  e(n.date) +
                  " · 手动收录</small><h3>" +
                  e(n.title) +
                  "</h3><p>" +
                  e(n.note) +
                  '</p><a class="pv-link" href="' +
                  e(n.url) +
                  '" target="_blank" rel="noopener noreferrer">查看公开来源 ' +
                  icon("link", 15) +
                  "</a></article>",
              )
              .join("")
          : '<div class="pv-noinfo">' +
            icon("globe", 34) +
            "<h3>暂无可核实动向</h3><p>可以补充官网公告、业务更新或行业报告的公开链接。</p></div>") +
        "</div>";
      section.querySelector("[data-add]").onclick = () =>
        api().modal(
          "补充公开来源",
          inner(
            '<form class="pv-form"><label>来源标题<input name="title" required maxlength="150"></label><label>来源链接<input type="url" name="url" placeholder="https://" required></label><label>发布日期<input type="date" name="date" required></label><label>与岗位的关系<textarea name="note" rows="3"></textarea></label><button class="pv-btn pv-primary">保存来源</button></form>',
          ),
          (el, close) => {
            const form = el.querySelector("form");
            form.onsubmit = (ev) => {
              ev.preventDefault();
              const n = Object.fromEntries(new FormData(form));
              if (!/^https?:\/\//i.test(n.url)) {
                api().toast("请输入 http 或 https 来源链接");
                return;
              }
              if (!n.title.trim()) {
                api().toast("请输入来源标题");
                return;
              }
              save({ news: [n, ...(pack().news || [])] });
              close();
              drawNews(section);
            };
          },
        );
    }
    function drawReverse(section) {
      const brief =
        (target.requirements || []).find((x) => typeof x === "string") ||
        target.role;
      const data = [
        [
          "直属负责人",
          "入职前三个月，您希望这个岗位独立完成哪一项工作？",
          "了解短期交付标准，与 JD 的核心职责对齐。",
        ],
        [
          "团队同事",
          "日常推进这类工作时，会和哪些角色一起做决定？",
          "了解实际协作方式、反馈渠道和决策边界。",
        ],
        [
          "业务面试官",
          "团队现在最想解决哪一个具体业务问题？",
          "判断岗位当前的工作重心，以及能贡献的经验。",
        ],
      ];
      const selected = pack().reverse || [];
      section.innerHTML =
        '<div class="pv-subhead"><div><h2>留给面试官的问题</h2><p>围绕「' +
        e(brief) +
        '」了解实际工作。</p></div></div><div class="pv-reverse">' +
        data
          .map(
            ([who, q, why], i) =>
              '<article class="pv-panel"><small>' +
              icon("chat", 16) +
              e(who) +
              "</small><h3>" +
              e(q) +
              "</h3><p>" +
              e(why) +
              '</p><button class="pv-btn ' +
              (selected.includes(i) ? "pv-kept" : "") +
              '" data-keep="' +
              i +
              '" aria-pressed="' +
              selected.includes(i) +
              '">' +
              icon(selected.includes(i) ? "check" : "plus", 16) +
              (selected.includes(i) ? "已加入提问清单" : "加入提问清单") +
              "</button></article>",
          )
          .join("") +
        "</div>";
      section.querySelectorAll("[data-keep]").forEach(
        (b) =>
          (b.onclick = () => {
            const i = +b.dataset.keep;
            save({
              reverse: selected.includes(i)
                ? selected.filter((k) => k !== i)
                : [...selected, i],
            });
            drawReverse(section);
          }),
      );
    }
    show();
  }

  window.renderInterview = renderInterview;
})();
