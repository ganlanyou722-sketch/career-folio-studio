(() => {
  "use strict";
  const { get, set, esc, icon, modal, toast, go, closeModal } = App;
  const groups = ["实习实践", "项目竞赛", "学习研究"];
  const uid = () =>
    crypto.randomUUID?.() ||
    Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const mats = () => get("materials", []),
    exps = () => get("experiences", []);
  let view = "materials",
    active = "全部",
    query = "",
    dragged = "",
    activeRoot;
  const samples = [
    [
      "产品实习工作记录.pdf",
      "实习实践",
      "产品实习生负责梳理用户访谈反馈，完成需求分析和交互原型，跟进两处交互调整。团队目前处于试点阶段，已交付原型和需求文档。",
      "第 2 页",
    ],
    [
      "校园服务设计大赛.pptx",
      "项目竞赛",
      "负责组织用户调研，分析问卷数据，完成服务设计方案，代表小组完成竞赛答辩。",
      "幻灯片 4",
    ],
    [
      "用户研究访谈笔记.docx",
      "学习研究",
      "制定访谈提纲，整理用户反馈，形成调研报告，用于课程研究成果汇报。",
      "第 3 段",
    ],
    [
      "试点复盘清单.txt",
      "实习实践",
      "交互调整完成后，整理待验证问题并与团队核对试点范围。",
      "第 1 段",
    ],
    [
      "服务原型设计说明.pdf",
      "项目竞赛",
      "围绕校园服务流程设计原型，整理功能列表和用户旅程。",
      "第 1 页",
    ],
    [
      "课程实践记录.txt",
      "学习研究",
      "记录每次课程访谈的目标、提纲与发现。",
      "第 1 段",
    ],
  ];
  function seedLibrary() {
    if (get("materials", null) === null)
      set(
        "materials",
        samples.map(([name, category, text, location], i) => ({
          id: "demo-m" + i,
          name,
          category,
          text,
          location,
          ext: name.split(".").pop().toUpperCase(),
          date: "2026-11-" + (20 - Math.floor(i / 2)),
          status: i < 3 ? "已核对" : "待核对",
          demo: true,
        })),
      );
    if (get("experiences", null) === null)
      set(
        "experiences",
        [
          {
            id: "demo-e0",
            title: "AI 助手产品试点",
            role: "产品实习生",
            action:
              "梳理用户访谈反馈，完成需求分析和交互原型，跟进两处交互调整。",
            result: "交付试点原型和需求文档。",
            source: samples[0][0],
            sourceId: "demo-m0",
            time: "2026 年夏",
            category: groups[0],
          },
          {
            id: "demo-e1",
            title: "校园服务设计大赛",
            role: "项目组成员",
            action: "组织用户调研，分析问卷数据，完成服务设计方案。",
            result: "完成竞赛答辩。",
            source: samples[1][0],
            sourceId: "demo-m1",
            time: "2026 年春",
            category: groups[1],
          },
          {
            id: "demo-e2",
            title: "用户研究课程项目",
            role: "用户研究组成员",
            action: "制定访谈提纲，整理用户反馈，形成调研报告。",
            result: "交付课程研究报告。",
            source: samples[2][0],
            sourceId: "demo-m2",
            time: "2026 年春",
            category: groups[2],
          },
        ].map((e) => ({
          ...e,
          status: "材料明确",
          confirmed: true,
          demo: true,
        })),
      );
  }
  function storeFile(mode, id, file) {
    return new Promise((ok, fail) => {
      const req = indexedDB.open("folioStudioFiles", 1);
      req.onupgradeneeded = () => req.result.createObjectStore("files");
      req.onerror = () => fail(req.error);
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction(
          "files",
          mode === "put" ? "readwrite" : "readonly",
        );
        const os = tx.objectStore("files");
        const request = mode === "put" ? os.put(file, id) : os.get(id);
        tx.oncomplete = () => {
          db.close();
          ok(request.result);
        };
        tx.onerror = () => {
          db.close();
          fail(tx.error);
        };
      };
    });
  }
  function fmtIcon(ext) {
    return (
      '<span class="doc-icon ext-' +
      esc(ext.toLowerCase()) +
      '"><i></i><b>' +
      esc(ext === "PPTX" ? "PPT" : ext === "DOCX" ? "DOC" : ext) +
      "</b></span>"
    );
  }
  function materialRows(list, compact = false) {
    return (
      '<div class="files-table ' +
      (compact ? "compact" : "") +
      '"><div class="files-row files-headers"><span>材料名称</span><span>所属文件夹</span><span>核对状态</span><span>更新时间</span></div>' +
      list
        .map(
          (m) =>
            '<button class="files-row file-row" draggable="true" data-drag-id="' +
            esc(m.id) +
            '" data-material="' +
            esc(m.id) +
            '"><span class="name-cell">' +
            fmtIcon(m.ext) +
            "<span>" +
            esc(m.name) +
            "</span>" +
            (m.demo ? '<small class="sample-tag">示例</small>' : "") +
            '</span><span class="category-cell">' +
            icon("folder", 14) +
            esc(m.category) +
            '</span><span><small class="status-pill ' +
            (m.status === "已核对" ? "verified" : "waiting") +
            '"><i></i>' +
            esc(m.status) +
            "</small></span><time>" +
            esc(m.date) +
            "</time></button>",
        )
        .join("") +
      (list.length ? "" : '<p class="lib-empty">还没有符合条件的材料。</p>') +
      "</div>"
    );
  }
  function refresh() {
    if (location.hash === "#library")
      renderLibrary(document.querySelector("#main"));
    else if (!location.hash || location.hash === "#home") App.render();
  }
  function folderView(g, i) {
    const docs = mats().filter((m) => m.category === g);
    return (
      '<article class="filecab cab-' +
      i +
      '" data-drop-cat="' +
      g +
      '"><button class="cab-pick" data-cat="' +
      g +
      '" aria-label="筛选' +
      g +
      '"></button><div class="cab-illustration"><div class="cab-back"></div>' +
      docs
        .slice(0, 4)
        .reverse()
        .map(
          (m, k, a) =>
            '<button class="cab-paper" style="--level:' +
            k +
            ";--count:" +
            a.length +
            '" data-material="' +
            esc(m.id) +
            '" title="' +
            esc(m.name) +
            '"><b>' +
            esc(m.ext) +
            "</b><span>" +
            esc(m.name) +
            "</span></button>",
        )
        .join("") +
      '<div class="cab-front"><span>' +
      icon("folder", 17) +
      "<b>" +
      g +
      "</b></span><em>" +
      String(docs.length).padStart(2, "0") +
      '</em></div></div><span class="cab-info">' +
      g +
      "<small>" +
      docs.length +
      " 份材料</small></span></article>"
    );
  }
  function fileLanding(root, group, x, y, name) {
    const target = [...root.querySelectorAll("[data-drop-cat]")].find(
      (n) => n.dataset.dropCat === group,
    );
    if (!target) return;
    target
      .querySelector(".cab-front")
      ?.animate(
        [
          { transform: "skewX(5deg) rotate(-3deg)" },
          { transform: "translateY(4px) skewX(6deg) rotate(-1deg)" },
          { transform: "skewX(5deg) rotate(-3deg)" },
        ],
        { duration: 410, easing: "ease-out" },
      );
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = target.getBoundingClientRect(),
      label = document.createElement("span");
    label.className = "file-landing";
    label.textContent = name;
    Object.assign(label.style, { left: x + "px", top: y + "px" });
    document.body.append(label);
    const anim = label.animate(
      [
        {
          opacity: 0.95,
          transform: "translate(-50%,-60%) rotate(-7deg) scale(1)",
        },
        {
          opacity: 0.85,
          offset: 0.55,
          transform:
            "translate(calc(-50% + " +
            (rect.x + rect.width / 2 - x) * 0.7 +
            "px),calc(-75% + " +
            (rect.y + rect.height * 0.5 - y - 20) +
            "px)) rotate(-4deg) scale(.85)",
        },
        {
          opacity: 0,
          transform:
            "translate(calc(-50% + " +
            (rect.x + rect.width / 2 - x) +
            "px),calc(-50% + " +
            (rect.y + rect.height * 0.65 - y) +
            "px)) rotate(0) scale(.55)",
        },
      ],
      { duration: 430, easing: "cubic-bezier(.2,.75,.3,1)" },
    );
    anim.onfinish = () => label.remove();
  }
  function renderLibrary(root) {
    activeRoot = root;
    root.innerHTML =
      '<div class="lib-page"><div class="page-intro"><div><div class="eyebrow"><i></i>EXPERIENCE LIBRARY</div><h1>个人经历台</h1><p>收好原始材料，把真实贡献整理成可追溯的经历。</p></div><button class="btn primary" data-add>' +
      icon("plus", 16) +
      '添加材料</button></div><div class="sec-head"><h2>我的资料柜</h2><span class="sec-note">悬停抽阅 · 拖入归档</span></div><div class="cabinet">' +
      groups.map(folderView).join("") +
      '</div><div class="lib-list-head"><div class="lib-tabs"><button data-view="materials" class="' +
      (view === "materials" ? "sel" : "") +
      '">材料 <small>' +
      mats().length +
      '</small></button><button data-view="experiences" class="' +
      (view === "experiences" ? "sel" : "") +
      '">经历 <small>' +
      exps().length +
      '</small></button></div><div class="experience-actions">' +
      (view === "experiences"
        ? '<button class="btn" data-from-experiences>' +
          icon("file", 15) +
          "选经历制简历</button>"
        : "") +
      '<button class="quiet-link" data-write>' +
      icon("edit", 15) +
      '直接写经历</button></div></div><div class="lib-filters"><div class="filter-items">' +
      ["全部", ...groups]
        .map(
          (g) =>
            '<button class="' +
            (g === active ? "sel" : "") +
            '" data-cat="' +
            g +
            '">' +
            g +
            "</button>",
        )
        .join("") +
      '</div><label class="lib-search">' +
      icon("search", 15) +
      '<input value="' +
      esc(query) +
      '" placeholder="搜索' +
      (view === "materials" ? "材料" : "经历") +
      '" aria-label="搜索当前列表"></label></div><div data-items></div><div class="lib-dropfoot">' +
      icon("upload", 17) +
      "将文件拖入此处，或拖到上方文件夹归档</div></div>";
    const draw = () => {
      const sub = root.querySelector("[data-items]"),
        filter = (x) =>
          (active === "全部" || x.category === active) &&
          (x.name || x.title)
            .toLowerCase()
            .includes(query.trim().toLowerCase());
      if (view === "materials")
        sub.innerHTML = materialRows(mats().filter(filter));
      else {
        sub.innerHTML =
          '<div class="experience-list">' +
          exps()
            .filter(filter)
            .map(
              (e) =>
                '<button class="exp-item" data-exp="' +
                esc(e.id) +
                '"><i>' +
                icon("book", 19) +
                "</i><div><h3>" +
                esc(e.title) +
                "</h3><p>" +
                esc(e.action) +
                "</p><small>" +
                esc(e.source || "本人录入") +
                '</small></div><span class="status-pill verified">' +
                esc(e.status) +
                "</span></button>",
            )
            .join("") +
          "</div>" +
          (!exps().filter(filter).length
            ? '<p class="lib-empty">暂无符合筛选条件的经历。</p>'
            : "");
        sub
          .querySelectorAll("[data-exp]")
          .forEach((b) => (b.onclick = () => editExperience(b.dataset.exp)));
      }
    };
    draw();
    const fromExperiences = root.querySelector("[data-from-experiences]");
    if (fromExperiences)
      fromExperiences.onclick = () => {
        set("resumeIntent", "experience");
        go("resume");
      };
    root.querySelector("[data-add]").onclick = () => uploadDialog();
    root.querySelector("[data-write]").onclick = () => editExperience();
    root.querySelectorAll("[data-cat]").forEach(
      (b) =>
        (b.onclick = () => {
          active = b.dataset.cat;
          renderLibrary(root);
        }),
    );
    root.querySelectorAll("[data-view]").forEach(
      (b) =>
        (b.onclick = () => {
          view = b.dataset.view;
          renderLibrary(root);
        }),
    );
    root.querySelector("input").oninput = (e) => {
      query = e.target.value;
      draw();
    };
    root.ondragstart = (e) => {
      const id = e.target.closest("[data-drag-id]")?.dataset.dragId;
      if (id) {
        dragged = id;
        e.dataTransfer.setData("application/x-folio-material", id);
        e.dataTransfer.effectAllowed = "move";
        e.target.classList.add("being-dragged");
      }
    };
    root.ondragend = () => {
      dragged = "";
      root
        .querySelectorAll(".over,.being-dragged")
        .forEach((n) => n.classList.remove("over", "being-dragged"));
    };
    root.ondragover = (e) => {
      if (root.className !== "page-library") return;
      e.preventDefault();
      const t = e.target.closest("[data-drop-cat],.lib-dropfoot");
      root.querySelectorAll(".over").forEach((n) => {
        if (n !== t) n.classList.remove("over");
      });
      t?.classList.add("over");
    };
    root.ondragleave = (e) => {
      if (!root.contains(e.relatedTarget))
        root
          .querySelectorAll(".over")
          .forEach((n) => n.classList.remove("over"));
    };
    root.ondrop = async (e) => {
      if (root.className !== "page-library") return;
      e.preventDefault();
      const g = e.target.closest("[data-drop-cat]")?.dataset.dropCat;
      root.querySelectorAll(".over").forEach((n) => n.classList.remove("over"));
      if (e.dataTransfer.files.length) {
        await ingest(
          [...e.dataTransfer.files],
          g || (active !== "全部" ? active : groups[0]),
        );
        return;
      }
      const id =
        e.dataTransfer.getData("application/x-folio-material") || dragged;
      if (id && g) {
        set(
          "materials",
          mats().map((m) => (m.id === id ? { ...m, category: g } : m)),
        );
        toast("已归档到" + g);
        renderLibrary(root);
        fileLanding(
          root,
          g,
          e.clientX,
          e.clientY,
          mats().find((m) => m.id === id)?.name || "材料",
        );
      }
      dragged = "";
    };
  }
  async function ingest(files, category) {
    let count = 0;
    for (const f of files) {
      const ext = f.name.split(".").pop().toUpperCase();
      if (
        !["PDF", "DOCX", "PPTX", "JPG", "JPEG", "PNG", "TXT"].includes(ext) ||
        !f.size ||
        f.size > 30 * 1024 * 1024
      ) {
        toast(f.name + "：请选择支持的非空文件，单份上限 30 MB。");
        continue;
      }
      const id = uid();
      try {
        await storeFile("put", id, f);
        const text = ext === "TXT" ? (await f.text()).slice(0, 100000) : "";
        if (
          set("materials", [
            {
              id,
              name: f.name,
              category,
              ext,
              text,
              location: ext === "TXT" ? "第 1 段" : "",
              date: new Date().toLocaleDateString("sv-SE"),
              status: "待核对",
              demo: false,
            },
            ...mats(),
          ])
        )
          count++;
      } catch {
        toast(f.name + " 未能保存，请检查浏览器可用空间。");
      }
    }
    if (count) {
      toast("已存入 " + count + " 份材料，可打开核对原文");
      view = "materials";
      refresh();
    }
  }
  function uploadDialog() {
    modal(
      "添加材料",
      '<div class="lib-form"><label>归入文件夹<select data-group>' +
        groups
          .map(
            (g) =>
              "<option " +
              (g === active ? "selected" : "") +
              ">" +
              g +
              "</option>",
          )
          .join("") +
        '</select></label><label class="upload-zone">' +
        icon("upload", 28) +
        '<b>点击选择或拖入材料</b><small>PDF、DOCX、PPTX、TXT、JPG、PNG · 单份 30 MB</small><input type="file" multiple accept=".pdf,.docx,.pptx,.txt,.jpg,.jpeg,.png"></label><p class="form-tip">原件保存在本机浏览器，文本材料可直接核对。文档与图片可补充摘录及原文位置。</p></div>',
      (box) => {
        const z = box.querySelector(".upload-zone"),
          run = async (files) => {
            if (!files.length) return;
            z.querySelector("b").textContent = "正在存入资料柜…";
            await ingest([...files], box.querySelector("select").value);
            closeModal();
          };
        z.ondragover = (e) => {
          e.preventDefault();
          z.classList.add("over");
        };
        z.ondragleave = () => z.classList.remove("over");
        z.ondrop = (e) => {
          e.preventDefault();
          run(e.dataTransfer.files);
        };
        box.querySelector("input").onchange = (e) => run(e.target.files);
      },
    );
  }
  function showMaterial(id) {
    const m = mats().find((x) => x.id === id);
    if (!m) return;
    modal(
      m.name,
      '<form class="lib-form"><div class="lib-meta">' +
        fmtIcon(m.ext) +
        "<span>" +
        esc(m.ext) +
        " · " +
        esc(m.date) +
        (m.demo ? " · 示例材料" : " · 本地文件") +
        "</span>" +
        (!m.demo
          ? '<button type="button" class="quiet-link" data-original>下载原件</button>'
          : "") +
        '</div><div class="lib-split"><label>文件夹<select name="category">' +
        groups
          .map(
            (g) =>
              "<option " +
              (g === m.category ? "selected" : "") +
              ">" +
              g +
              "</option>",
          )
          .join("") +
        '</select></label><label>来源位置<input name="location" value="' +
        esc(m.location) +
        '" placeholder="如：第 2 页 / 第 3 段"></label></div><label>原文摘录<textarea name="text" rows="5" required placeholder="粘贴自己参与的部分，以便核对事实">' +
        esc(m.text) +
        '</textarea></label><div><strong class="form-label">关联经历</strong>' +
        exps()
          .filter((e) => e.sourceId === id)
          .map(
            (e) =>
              '<button type="button" class="source-chip" data-e="' +
              esc(e.id) +
              '">' +
              icon("book", 14) +
              esc(e.title) +
              "</button>",
          )
          .join("") +
        (!exps().some((e) => e.sourceId === id)
          ? '<p class="form-tip">还没有关联经历。</p>'
          : "") +
        '</div><div class="form-actions"><button type="button" class="btn" data-new>提炼一条经历</button><button type="submit" class="btn primary">' +
        icon("check", 15) +
        "确认并保存</button></div></form>",
      (box) => {
        const form = box.querySelector("form");
        const save = (status) => {
          const data = Object.fromEntries(new FormData(form));
          return set(
            "materials",
            mats().map((i) =>
              i.id === id
                ? {
                    ...i,
                    ...data,
                    status,
                    date: new Date().toLocaleDateString("sv-SE"),
                  }
                : i,
            ),
          );
        };
        form.onsubmit = (e) => {
          e.preventDefault();
          if (save("已核对")) {
            closeModal();
            refresh();
            toast("材料已核对并保存");
          }
        };
        box.querySelector("[data-new]").onclick = () => {
          if (!form.reportValidity()) return;
          if (save("已核对")) editExperience(null, id);
        };
        box
          .querySelectorAll("[data-e]")
          .forEach((b) => (b.onclick = () => editExperience(b.dataset.e)));
        const dl = box.querySelector("[data-original]");
        if (dl)
          dl.onclick = async () => {
            try {
              const f = await storeFile("get", id);
              if (!f) throw Error();
              const u = URL.createObjectURL(f),
                a = document.createElement("a");
              a.href = u;
              a.download = m.name;
              a.click();
              setTimeout(() => URL.revokeObjectURL(u), 60000);
            } catch {
              toast("未能读取本机原件。");
            }
          };
      },
    );
  }
  function editExperience(id, sourceId) {
    const e = exps().find((i) => i.id === id) || {},
      m = mats().find((x) => x.id === (sourceId || e.sourceId));
    const inp = (key, label, placeholder, req) =>
      "<label>" +
      label +
      '<input name="' +
      key +
      '" value="' +
      esc(e[key]) +
      '" placeholder="' +
      placeholder +
      '" ' +
      (req ? "required" : "") +
      "></label>";
    modal(
      id ? "核对经历" : "直接写一段经历",
      '<form class="lib-form">' +
        (m
          ? '<div class="source-quote"><small>' +
            icon("file", 13) +
            esc(m.name) +
            " · " +
            esc(m.location) +
            "</small><p>" +
            esc(m.text || "等待摘录") +
            "</p></div>"
          : "") +
        inp("title", "经历名称", "项目、实践或工作的名称", true) +
        '<div class="lib-split">' +
        inp("role", "我的角色", "你在其中负责什么", true) +
        inp("time", "时间", "例如 2026 年春", false) +
        '</div><label>个人行动<textarea name="action" rows="3" required placeholder="描述你实际完成的工作">' +
        esc(e.action) +
        '</textarea></label><label>结果与产出<textarea name="result" rows="2" placeholder="可填写交付、试点或采用情况，也可稍后补">' +
        esc(e.result) +
        '</textarea></label><div class="form-actions"><button class="btn primary" type="submit">确认并存入经历库</button></div></form>',
      (box) =>
        (box.querySelector("form").onsubmit = (ev) => {
          ev.preventDefault();
          const d = Object.fromEntries(new FormData(ev.target));
          const v = {
            ...e,
            ...d,
            id: e.id || uid(),
            category:
              m?.category ||
              e.category ||
              (active === "全部" ? groups[0] : active),
            source: m?.name || e.source || "本人录入",
            sourceId: m?.id || "",
            status: "本人确认",
            confirmed: true,
          };
          if (
            set(
              "experiences",
              id ? exps().map((x) => (x.id === id ? v : x)) : [v, ...exps()],
            )
          ) {
            view = "experiences";
            active = "全部";
            closeModal();
            refresh();
            toast("经历已存入个人资料库");
          }
        }),
    );
  }
  Object.assign(window, {
    seedLibrary,
    renderLibrary,
    materialRows,
    showMaterial,
    editExperience,
  });
})();
