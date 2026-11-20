/* The editor keeps canvas objects, target bindings and immutable snapshots together. */
(() => {
  "use strict";
  const A = () => window.App;
  const get = (key, fallback) => A().get(key, fallback);
  const set = (key, data) => A().set(key, data);
  const esc = (value) => A().esc(String(value ?? ""));
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const uid = () =>
    globalThis.crypto?.randomUUID?.() ||
    "r" + Math.random().toString(36).slice(2);
  const roleName = (t) => t?.role || "通用岗位";
  const targetName = (t) =>
    [t?.company, t?.role].filter(Boolean).join(" · ") || "按职业方向生成";
  const dateLabel = (stamp) =>
    new Date(stamp).toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  const targetKey = (t) =>
    JSON.stringify([
      t?.id || "",
      t?.company || "",
      t?.role || "",
      t?.revision || "",
    ]);
  const block = (type, text, extra = {}) => ({
    id: uid(),
    type,
    text,
    ...extra,
  });
  const types = {
    name: "姓名",
    contact: "个人信息",
    section: "栏目",
    heading: "经历标题",
    body: "正文",
  };
  const sizes = { name: 38, contact: 15, section: 20, heading: 17, body: 16 };
  const iPaths = {
    check: '<path d="m5 12 4 4 10-10"/>',
    seal: '<path d="m12 3 3 2 3 .4.5 3.1 2 3-2 3-.5 3.1-3 .4-3 2-3-2-3-.4-.5-3.1-2-3 2-3L6 5.4l3-.4z"/><path d="m8.5 11.9 2.4 2.4 4.7-5"/>',
    upload: '<path d="M4 15v4h16v-4M12 16V4m-5 5 5-5 5 5"/>',
    download: '<path d="M4 16v4h16v-4M12 3v12m-5-5 5 5 5-5"/>',
    archive:
      '<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v12h14V8m-10 4h6"/>',
    undo: '<path d="M9 5 4 10l5 5M4 10h9a6 6 0 0 1 6 6"/>',
    redo: '<path d="m15 5 5 5-5 5m5-5h-9a6 6 0 0 0-6 6"/>',
    bold: '<path d="M7 4h6a4 4 0 0 1 0 8H7zm0 8h7a4 4 0 1 1 0 8H7z"/>',
    up: '<path d="m6 15 6-6 6 6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    align: '<path d="M3 6h18M3 10h12M3 14h18M3 18h12"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    grip: '<path d="M9 6h.1M15 6h.1M9 12h.1M15 12h.1M9 18h.1M15 18h.1" stroke-width="3"/>',
    edit: '<path d="m4 15 11-11 5 5L9 20l-6 1zM12 7l5 5"/>',
    file: '<path d="M6 2h8l4 4v16H6zM14 2v5h4M9 12h6m-6 4h6"/>',
    leaf: '<path d="M3 18C2 8 8 3 21 3c0 11-4 17-14 15M4 21l12-12"/>',
    spark:
      '<path d="m12 3 2.3 6.7L21 12l-6.7 2.3L12 21l-2.3-6.7L3 12l6.7-2.3z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
    search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 10v6m4-6v6"/>',
  };
  const ico = (key, size = 18) =>
    '<svg aria-hidden="true" width="' +
    size +
    '" height="' +
    size +
    '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.65">' +
    (iPaths[key] || "") +
    "</svg>";
  const btn = (action, label, icon, style = "") =>
    '<button type="button" class="re-btn ' +
    style +
    '" data-action="' +
    action +
    '">' +
    (icon ? ico(icon) : "") +
    esc(label) +
    "</button>";
  const tool = (action, label, icon) =>
    '<button type="button" class="re-tool" data-action="' +
    action +
    '" aria-label="' +
    label +
    '" title="' +
    label +
    '">' +
    ico(icon) +
    "</button>";
  const modal = (title, html, init) =>
    A().modal(
      title,
      '<div class="re-dialog">' + html + "</div>",
      (card, close) =>
        init(card.querySelector(".re-dialog"), close || A().closeModal),
    );
  const toast = (msg) => A().toast(msg);
  const baseDraft = (target, blocks, sample = false) => ({
    id: uid(),
    title:
      (target?.company ? target.company + " · " : "") +
      (target?.role || "个人") +
      "简历",
    target: clone(target || {}),
    blocks,
    sample,
    revision: 1,
    updatedAt: Date.now(),
  });
  const sourceText = (value) =>
    typeof value === "string"
      ? value
      : value?.name || value?.title || value?.fileName || "";
  function experienceBlocks(items) {
    return items.flatMap((item) => {
      const meta = {
        experienceId: item.id,
        source: sourceText(item.source) || item.title,
      };
      return [
        block("heading", item.title, meta),
        block(
          "body",
          [item.role, item.action, item.result].filter(Boolean).join("\n"),
          meta,
        ),
      ];
    });
  }
  function newDraft(target) {
    const available = get("experiences", []).filter(
      (e) => e.action || e.result,
    );
    const facts = available.filter((e) => !String(e.id).startsWith("demo-"));
    if (!facts.length && available.length)
      return baseDraft(
        target,
        [
          block("name", "林知夏"),
          block(
            "contact",
            "求职方向  /  " +
              (target?.role || "产品经理") +
              "      ·      上海",
          ),
          block("section", "项目与实践经历"),
          ...experienceBlocks(available.slice(0, 3)),
        ],
        true,
      );
    if (facts.length)
      return baseDraft(target, [
        block("name", ""),
        block("contact", ""),
        block("section", "项目与实践经历"),
        ...experienceBlocks(facts.slice(0, 3)),
      ]);
    return baseDraft(
      target,
      [
        block("name", "林知夏"),
        block(
          "contact",
          "求职方向  /  " + (target?.role || "产品经理") + "      ·      上海",
        ),
        block("section", "教育背景"),
        block("heading", "示例大学  ·  信息管理与信息系统"),
        block("body", "本科课程涵盖产品设计、统计学与数据分析。"),
        block("section", "项目经历"),
        block("heading", "校园服务小程序  /  产品设计"),
        block(
          "body",
          "负责需求梳理与交互原型设计，围绕校园活动报名流程整理用户反馈。根据试用记录调整表单顺序，提交迭代原型与验收清单。",
          { source: "示例经历 · 校园服务小程序" },
        ),
        block("heading", "课程研究项目  /  用户研究"),
        block(
          "body",
          "围绕新用户使用路径设计访谈提纲，记录使用障碍并归纳改进方向。",
          { source: "示例经历 · 课程研究项目" },
        ),
        block("section", "技能与工具"),
        block("body", "用户访谈、需求文档写作、交互原型设计。"),
      ],
      true,
    );
  }
  function persist(d) {
    const drafts = get("resumeDrafts", {});
    drafts[targetKey(d.target)] = d;
    return (
      set("resumeDrafts", drafts) !== false && set("resumeDraft", d) !== false
    );
  }
  function currentDraft() {
    const target = get("target", null) || get("direction", null) || {};
    const current = get("resumeDraft", null);
    if (current && targetKey(current.target) === targetKey(target))
      return current;
    const stored = get("resumeDrafts", {})[targetKey(target)];
    if (stored) {
      persist(stored);
      return stored;
    }
    const d = current
      ? {
          ...clone(current),
          id: uid(),
          title:
            (target?.company ? target.company + " · " : "") +
            roleName(target) +
            "简历",
          target: clone(target),
          revision: 1,
          updatedAt: Date.now(),
        }
      : newDraft(target);
    persist(d);
    return d;
  }
  function styleOf(b) {
    const size = b.size || sizes[b.type] || 16;
    const weight = b.bold ?? ["name", "section", "heading"].includes(b.type);
    return (
      "font-size:" +
      Math.max(10, Math.min(60, size)) +
      "px;font-weight:" +
      (weight ? "700" : "400") +
      ";text-align:" +
      (["left", "center", "right"].includes(b.align) ? b.align : "left") +
      ";line-height:" +
      (b.line || 1.55) +
      ";font-family:" +
      (b.font === "serif"
        ? '"Songti SC","SimSun",serif'
        : '"Microsoft YaHei","PingFang SC",sans-serif')
    );
  }
  function blockMarkup(b, interactive = false) {
    return (
      '<div class="re-block re-' +
      esc(b.type) +
      '" data-id="' +
      esc(b.id) +
      '">' +
      (interactive
        ? '<button type="button" title="拖动调整段落顺序" aria-label="拖动调整段落顺序" class="re-grip" draggable="true">' +
          ico("grip", 15) +
          "</button>"
        : "") +
      '<div class="re-copy" ' +
      (interactive
        ? 'tabindex="0" role="textbox" aria-label="' +
          esc(types[b.type]) +
          '" aria-multiline="true" data-placeholder="' +
          (b.type === "name"
            ? "填写姓名"
            : b.type === "contact"
              ? "填写联系方式"
              : "双击填写内容") +
          '"'
        : "") +
      " style='" +
      styleOf(b) +
      "'>" +
      esc(b.text) +
      "</div></div>"
    );
  }
  // Screen, print and editable slides share this pagination and the same type metrics.
  function paginate(blocks) {
    const pages = [[]],
      probe = document.createElement("div");
    probe.className = "re-measure";
    probe.innerHTML = '<article class="re-paper re-probe"></article>';
    document.body.append(probe);
    const paper = probe.firstElementChild;
    for (const b of blocks) {
      paper.insertAdjacentHTML("beforeend", blockMarkup(b));
      if (paper.offsetHeight > 1123 && pages.at(-1).length) {
        pages.push([]);
        paper.innerHTML = blockMarkup(b);
      }
      pages.at(-1).push(b);
    }
    probe.remove();
    return pages;
  }
  function bottle() {
    return (
      '<div class="re-finish-art" aria-hidden="true"><div class="re-bottle"><svg viewBox="0 0 110 150"><defs><linearGradient id="re-glass" x2="1" y2=".6"><stop stop-color="#bfdfba"/><stop offset=".42" stop-color="#81ab8c"/><stop offset=".87" stop-color="#4c7561"/><stop offset="1" stop-color="#375b4a"/></linearGradient></defs><g fill="none" stroke="#254a3e" stroke-width="3.4" stroke-linejoin="round"><path d="m20 23 5-11h41l8 9-13 6-3 17H40l1-16-9-5z" fill="#c6c6a9"/><path d="M30 23q4 15 19 16l-6-8-2-7" fill="#435c4a"/><path d="M15 13h11v12H15z" fill="#608373"/><rect x="37" y="37" width="25" height="12" rx="3" fill="#405f51"/><path d="M39 49h21c1 13 8 17 14 25 6 8 8 18 8 46q0 16-12 17H34q-14-1-14-16V90c0-21 17-25 19-41Z" fill="url(#re-glass)"/><path d="M30 94v23" stroke="#d8ebcd" stroke-width="4"/><path d="M42 84h23v25H42z" stroke-width="1.5" fill="#f3eace"/><path d="m46 98 5 2 8-10" stroke-width="2"/></g></svg></div><div class="re-mist">' +
      Array.from(
        { length: 15 },
        (_, i) =>
          '<i style="--x:' +
          (-80 - (i % 5) * 24) +
          "px;--y:" +
          (-42 + ((i * 19) % 85)) +
          "px;--delay:" +
          (i % 5) * 32 +
          'ms"></i>',
      ).join("") +
      "</div></div>"
    );
  }
  function snapshot(d, reason) {
    const versions = get("resumeVersions", []);
    const existing = versions.find(
      (v) => v.draftId === d.id && v.revision === d.revision,
    );
    if (existing) {
      if (!existing.actions?.includes(reason)) {
        existing.actions = [...(existing.actions || []), reason];
        if (set("resumeVersions", versions) === false) return null;
      }
      return existing;
    }
    const v = {
      ...clone(d),
      id: uid(),
      draftId: d.id,
      at: Date.now(),
      actions: [reason],
    };
    versions.unshift(v);
    return set("resumeVersions", versions) === false ? null : v;
  }
  function modalImport(apply) {
    modal(
      "导入原简历",
      '<p>粘贴原文，或选择一份 TXT 文件。导入后可以逐段核对与编辑。</p><label class="re-label">简历原文<textarea rows="9" placeholder="第一行填写姓名，接着粘贴联系方式、教育背景和项目经历…"></textarea></label><div class="re-actions"><label class="re-btn">' +
        ico("upload") +
        '读取 TXT<input type="file" accept=".txt,text/plain" hidden></label>' +
        btn("import", "创建可编辑底稿", "check", "re-primary") +
        "</div>",
      (m, close) => {
        const input = m.querySelector("textarea");
        m.querySelector("[type=file]").onchange = async (e) => {
          const f = e.target.files[0];
          if (!f) return;
          if (f.size > 2e6) {
            toast("请选择 2 MB 以内的文本文件");
            return;
          }
          try {
            input.value = await f.text();
          } catch {
            toast("文件读取失败，可以粘贴原文");
          }
        };
        m.querySelector("[data-action]").onclick = () => {
          const lines = input.value
            .split(/\r?\n/)
            .map((s) => s.trim())
            .filter(Boolean);
          if (!lines.length) return input.focus();
          const blocks = lines.flatMap((s, n) => {
            if (n === 0 && s.length < 24) return [block("name", s)];
            if (
              /^(教育背景|个人经历|工作经历|实习经历|项目经历|技能|个人优势|校园经历|专业技能|教育经历)[：:]?$/.test(
                s,
              )
            )
              return [block("section", s.replace(/[：:]$/, ""))];
            return (s.match(/[\s\S]{1,480}/g) || []).map((t) =>
              block(n === 1 && s.length < 75 ? "contact" : "body", t),
            );
          });
          apply(blocks);
          close();
        };
      },
    );
  }
  function pickFacts(d, apply) {
    const facts = get("experiences", []),
      selected = get("resumeExperienceIds", []);
    set("resumeExperienceIds", []);
    modal(
      "从经历起稿",
      facts.length
        ? '<p>勾选与目标岗位有关的经历，保留你的角色、行动、结果和来源。</p><div class="re-factlist">' +
            facts
              .map(
                (f, n) =>
                  '<label><input type="checkbox" value="' +
                  n +
                  '" ' +
                  (!selected.length || selected.includes(f.id)
                    ? "checked"
                    : "") +
                  "><span><strong>" +
                  esc(f.title) +
                  "</strong><small>" +
                  esc(f.action || f.role || "手动录入的经历") +
                  "</small></span></label>",
              )
              .join("") +
            "</div>" +
            btn("build", "生成工作稿", "check", "re-primary")
        : "<p>经历库中还没有可用条目。可以先核对经历，也可以直接导入一份已有简历。</p>" +
            btn("materials", "整理经历", "archive"),
      (m, close) => {
        m.querySelector("button").onclick = () => {
          if (!facts.length) {
            close();
            A().go("library");
            return;
          }
          const items = Array.from(
            m.querySelectorAll(":checked"),
            (el) => facts[+el.value],
          );
          if (!items.length) {
            toast("至少选择一条经历");
            return;
          }
          const personal = ["name", "contact"].map((type) =>
            clone(
              (!d.sample && d.blocks.find((b) => b.type === type)) ||
                block(type, ""),
            ),
          );
          apply([
            ...personal,
            block("section", "项目与实践经历"),
            ...experienceBlocks(items),
          ]);
          close();
        };
      },
    );
  }
  let stopEditor = () => {};
  window.renderResume = (root) => {
    stopEditor();
    let d = currentDraft(),
      selected = d.blocks.find((b) => b.type === "body")?.id || d.blocks[0]?.id,
      undo = [],
      redo = [],
      suggestion = null,
      timer,
      editing = null,
      historyBase = null,
      scale = 1,
      generation = 0;
    let lastSealed = get("resumeVersions", []).find(
      (v) => v.draftId === d.id && v.actions?.includes("定稿"),
    )?.revision;
    root.innerHTML =
      '<section class="re-view"><div class="re-titlebar"><div><h1>简历优化台</h1><p>把真实经历打磨成一份可以投递的简历。</p></div><div class="re-header-actions">' +
      btn("versions", "简历仓库", "archive") +
      btn("final", "定稿", "seal", "re-primary") +
      '</div></div><div class="re-documentbar"><div class="re-doc-icon">' +
      ico("file", 22) +
      '</div><div><button class="re-docname" data-action="rename" title="修改简历名称"></button><small class="re-docmeta"></small></div><span class="re-status" aria-live="polite"></span></div><div class="re-workbench"><div class="re-board"><div class="re-toolbar">' +
      tool("undo", "撤销", "undo") +
      tool("redo", "重做", "redo") +
      '<span></span><select class="re-font" aria-label="字体"><option value="sans">黑体</option><option value="serif">宋体</option></select><select class="re-size" aria-label="字号"></select>' +
      tool("bold", "粗体", "bold") +
      tool("align", "切换对齐方式", "align") +
      '<select class="re-line" aria-label="行距"><option value="1.3">1.3 倍行距</option><option value="1.55">1.55 倍行距</option><option value="1.8">1.8 倍行距</option></select><span></span>' +
      tool("up", "段落上移", "up") +
      tool("down", "段落下移", "down") +
      tool("add", "添加段落", "plus") +
      tool("delete", "删除选中段落", "trash") +
      '</div><div class="re-stage"><div class="re-pages"></div>' +
      bottle() +
      '</div><div class="re-caption"><span class="re-pagecount"></span><span>双击文字编辑 · 拖动手柄排序</span></div></div><aside class="re-inspector"><div class="re-aside-title"><i>' +
      ico("spark", 20) +
      '</i><strong>文字打磨</strong></div><div class="re-assistant"></div><div class="re-side-foot">' +
      btn("facts", "从经历起稿", "leaf") +
      btn("import", "导入原稿", "upload") +
      btn("export", "导出简历", "download") +
      "</div></aside></div></section>";
    const view = root.querySelector(".re-view"),
      $ = (s) => view.querySelector(s),
      byId = (id) => d.blocks.find((b) => b.id === id),
      current = () => byId(selected),
      status = $(".re-status"),
      pagesEl = $(".re-pages");
    function saved() {
      status.textContent = "已保存到本机";
      status.classList.remove("re-unsaved");
    }
    function store() {
      try {
        if (!persist(d)) throw Error("storage full");
        return true;
      } catch {
        status.textContent = "保存失败";
        status.classList.add("re-unsaved");
        toast("本机存储不可用，当前页保留了工作稿");
        return false;
      }
    }
    function change(work, redraw = true) {
      clearTimeout(timer);
      historyBase = null;
      undo.push(clone(d));
      if (undo.length > 60) undo.shift();
      redo = [];
      work();
      d.revision++;
      d.updatedAt = Date.now();
      suggestion = null;
      if (store()) saved();
      if (redraw) paint();
    }
    function measure() {
      if (!pagesEl.isConnected) return;
      const w = pagesEl.clientWidth;
      scale = Math.min(1, w / 794);
      pagesEl.querySelectorAll(".re-sheet-frame").forEach((f) => {
        f.style.width = 794 * scale + "px";
        f.style.height = 1123 * scale + "px";
        f.firstElementChild.style.transform = "scale(" + scale + ")";
      });
    }
    function paint() {
      editing = null;
      if (!current()) selected = d.blocks[0]?.id;
      const pages = paginate(d.blocks);
      pagesEl.innerHTML = pages
        .map(
          (group) =>
            '<div class="re-sheet-frame"><article class="re-paper">' +
            group.map((b) => blockMarkup(b, true)).join("") +
            "</article></div>",
        )
        .join("");
      $(".re-docname").innerHTML = esc(d.title) + " " + ico("edit", 13);
      $(".re-docmeta").textContent =
        (d.sample ? "示例工作稿 · " : "") +
        targetName(d.target) +
        " · r" +
        d.revision;
      $(".re-pagecount").textContent = "A4 纵向  ·  " + pages.length + " 页";
      measure();
      inspect();
      refreshTools();
    }
    function refreshTools() {
      const finalButton = $('[data-action="final"]');
      if (!finalButton.disabled)
        finalButton.innerHTML =
          d.revision === lastSealed
            ? ico("check") + "已定稿"
            : ico("seal") + "定稿";
      const b = current();
      $(".re-size").innerHTML = [
        ...new Set([
          12,
          14,
          15,
          16,
          17,
          18,
          20,
          22,
          24,
          28,
          32,
          38,
          b?.size || sizes[b?.type] || 16,
        ]),
      ]
        .sort((a, c) => a - c)
        .map((n) => '<option value="' + n + '">' + n + "</option>")
        .join("");
      $(".re-size").value = b?.size || sizes[b?.type] || 16;
      $(".re-line").value = b?.line || 1.55;
      $(".re-font").value = b?.font || "sans";
      $('[data-action="bold"]').classList.toggle(
        "re-on",
        !!b && (b.bold ?? ["name", "section", "heading"].includes(b.type)),
      );
      $('[data-action="undo"]').disabled = !undo.length;
      $('[data-action="redo"]').disabled = !redo.length;
      pagesEl
        .querySelectorAll(".re-block")
        .forEach((el) =>
          el.classList.toggle("re-selected", el.dataset.id === selected),
        );
    }
    function inspect() {
      const b = current(),
        a = $(".re-assistant");
      a.innerHTML = b
        ? '<div class="re-side-label"><span class="re-dot"></span>已选' +
          esc(types[b.type]) +
          "</div><blockquote>" +
          esc(b.text || "空白段落") +
          "</blockquote>" +
          (b.source
            ? '<div class="re-source">' +
              ico("archive", 14) +
              esc(sourceText(b.source)) +
              "</div>"
            : "") +
          '<div class="re-side-rule"></div><label class="re-label">修改方式<select class="re-mode"><option value="compact">精简表达</option><option value="lines">分条呈现</option><option value="manual">自行改写</option></select></label><p class="re-hint">本机文字整理，可预览并逐条应用。</p>' +
          btn("suggest", "预览修改", "spark", "re-assist-btn") +
          '<div class="re-proposal"></div>' +
          (b.type === "body" || b.type === "heading"
            ? '<div class="re-side-rule"></div><strong class="re-minihead">这段经历取得了什么结果？</strong>' +
              btn("result", "补充真实结果", "plus")
            : "")
        : "<p>选择画布上的一段文字开始修改。</p>";
    }
    function activeText(el) {
      const b = byId(el.closest(".re-block").dataset.id);
      if (!b) return;
      if (!historyBase) {
        historyBase = clone(d);
        undo.push(historyBase);
        if (undo.length > 60) undo.shift();
        redo = [];
      }
      b.text = el.innerText.replace(/\r/g, "");
      d.revision++;
      d.updatedAt = Date.now();
      status.textContent = "保存中…";
      status.classList.add("re-unsaved");
      const ok = store();
      clearTimeout(timer);
      timer = setTimeout(() => {
        historyBase = null;
        if (ok) saved();
      }, 650);
      refreshTools();
    }
    function select(id) {
      if (selected === id) return;
      selected = id;
      suggestion = null;
      inspect();
      refreshTools();
    }
    function beginEdit(el) {
      select(el.closest(".re-block").dataset.id);
      editing = el;
      el.contentEditable = "plaintext-only";
      el.focus();
    }
    pagesEl.addEventListener("click", (e) => {
      const b = e.target.closest(".re-block");
      if (b) select(b.dataset.id);
    });
    pagesEl.addEventListener("dblclick", (e) => {
      const el = e.target.closest(".re-copy");
      if (el) beginEdit(el);
    });
    pagesEl.addEventListener("keydown", (e) => {
      if (
        e.key === "Enter" &&
        e.target.matches(".re-copy") &&
        !e.target.isContentEditable
      ) {
        e.preventDefault();
        beginEdit(e.target);
      }
      if (e.key === "Escape" && editing) editing.blur();
    });
    pagesEl.addEventListener("input", (e) => {
      if (e.target.matches(".re-copy")) activeText(e.target);
    });
    pagesEl.addEventListener("focusout", (e) => {
      if (e.target === editing) {
        e.target.removeAttribute("contenteditable");
        historyBase = null;
        editing = null;
        $(".re-docmeta").textContent =
          (d.sample ? "示例工作稿 · " : "") +
          targetName(d.target) +
          " · r" +
          d.revision;
        /* Reflow after completed hand edits. */ requestAnimationFrame(() => {
          if (view.isConnected && !editing && !suggestion) paint();
        });
      }
    });
    let dragging = null;
    function reorder(work) {
      const before = new Map(
        [...pagesEl.querySelectorAll(".re-block")].map((el) => [
          el.dataset.id,
          el.getBoundingClientRect(),
        ]),
      );
      change(work);
      if (matchMedia("(prefers-reduced-motion: reduce)").matches || scale <= 0)
        return;
      pagesEl.querySelectorAll(".re-block").forEach((el) => {
        const old = before.get(el.dataset.id);
        if (!old) return;
        const offset = (old.top - el.getBoundingClientRect().top) / scale;
        if (Math.abs(offset) > 1)
          el.animate(
            [
              { transform: "translateY(" + offset + "px)" },
              { transform: "translateY(0)" },
            ],
            { duration: 310, easing: "cubic-bezier(.22,.8,.25,1)" },
          );
      });
    }
    pagesEl.addEventListener("dragstart", (e) => {
      const el = e.target.closest(".re-grip");
      if (!el) return;
      dragging = el.closest(".re-block").dataset.id;
      e.dataTransfer.setData("text/plain", dragging);
      e.dataTransfer.effectAllowed = "move";
    });
    pagesEl.addEventListener("dragover", (e) => {
      if (!dragging) return;
      e.preventDefault();
      pagesEl.querySelector(".re-drop")?.classList.remove("re-drop");
      e.target.closest(".re-block")?.classList.add("re-drop");
    });
    pagesEl.addEventListener("drop", (e) => {
      e.preventDefault();
      const dest = e.target.closest(".re-block")?.dataset.id;
      if (dragging && dest && dest !== dragging) {
        const id = dragging;
        reorder(() => {
          const b = byId(id);
          d.blocks = d.blocks.filter((x) => x.id !== id);
          d.blocks.splice(
            d.blocks.findIndex((x) => x.id === dest),
            0,
            b,
          );
          selected = id;
        });
      }
      dragging = null;
    });
    pagesEl.addEventListener("dragend", () => {
      dragging = null;
      pagesEl.querySelector(".re-drop")?.classList.remove("re-drop");
    });
    function startOver(blocks) {
      change(() => {
        d.blocks = blocks;
        d.sample = false;
        selected = d.blocks[0].id;
      });
      toast("底稿已生成，可撤销此次修改");
    }
    function suggest() {
      const b = current();
      if (!b) return;
      const mode = $(".re-mode").value,
        original = b.text;
      let value = original.trim();
      if (mode === "compact")
        value = value
          .replace(
            /在这个过程中[，,]?|在此过程中[，,]?|主要是|与此同时[，,]?|具体来说[，,]?/g,
            "",
          )
          .replace(/进行了([^，。；\n]{1,12})的工作/g, "$1")
          .replace(/负责对(.{1,15})进行(分析|评估|整理|调研)/g, "负责$2$1")
          .replace(/\s*[；;]\s*/g, "；");
      if (mode === "lines")
        value = value
          .split(/[。；;\n]+/)
          .filter(Boolean)
          .map((s) => "• " + s.replace(/^[•·]\s*/, "").trim())
          .join("\n");
      suggestion = { id: b.id, original, value };
      const pane = $(".re-proposal");
      pane.innerHTML =
        '<label class="re-label">' +
        (mode === "manual"
          ? "新的表述"
          : value === original
            ? "当前表达已简洁，可继续手改"
            : "修改预览") +
        '<textarea rows="4">' +
        esc(value) +
        '</textarea></label><div class="re-actions">' +
        btn("discard", "放弃", "") +
        btn("apply", "应用修改", "check", "re-primary") +
        "</div>";
      if (mode === "manual") pane.querySelector("textarea").focus();
    }
    function traverse(from, to) {
      if (!from.length) return;
      const oldId = d.id,
        oldRev = d.revision;
      to.push(clone(d));
      d = from.pop();
      d.id = oldId;
      d.revision = oldRev + 1;
      d.updatedAt = Date.now();
      historyBase = null;
      suggestion = null;
      if (store()) saved();
      paint();
    }
    function animateFinish() {
      const host = $(".re-stage"),
        can = pagesEl.querySelector(".re-sheet-frame"),
        finalButton = $('[data-action="final"]');
      if (!can) return;
      const clip = can.getBoundingClientRect(),
        stageRect = host.getBoundingClientRect();
      host.style.setProperty(
        "--re-spray-x",
        Math.max(10, clip.right - stageRect.left - 44) + "px",
      );
      host.style.setProperty(
        "--re-spray-y",
        Math.max(32, clip.top - stageRect.top + 80) + "px",
      );
      host.classList.remove("re-finishing");
      void host.offsetWidth;
      host.classList.add("re-finishing");
      finalButton.disabled = true;
      finalButton.innerHTML = ico("seal") + "定稿中…";
      const gen = ++generation;
      lastSealed = d.revision;
      setTimeout(() => {
        if (!view.isConnected || gen !== generation) return;
        host.classList.remove("re-finishing");
        finalButton.disabled = false;
        refreshTools();
        toast("这一版已收入简历仓库");
      }, 1450);
    }
    function handle(action) {
      const b = current(),
        index = d.blocks.findIndex((x) => x.id === selected);
      switch (action) {
        case "versions":
          A().go("versions");
          break;
        case "final":
          if (store() && snapshot(d, "定稿")) animateFinish();
          break;
        case "import":
          modalImport(startOver);
          break;
        case "facts":
          pickFacts(d, startOver);
          break;
        case "export":
          exportModal(clone(d));
          break;
        case "rename":
          modal(
            "简历名称",
            '<label class="re-label">版本名称<input value="' +
              esc(d.title) +
              '" maxlength="80"></label>' +
              btn("save", "保存名称", "check", "re-primary"),
            (m, close) => {
              m.querySelector("button").onclick = () => {
                const t = m.querySelector("input").value.trim();
                if (!t) return;
                change(() => {
                  d.title = t;
                });
                close();
              };
            },
          );
          break;
        case "undo":
          traverse(undo, redo);
          break;
        case "redo":
          traverse(redo, undo);
          break;
        case "bold":
          if (b)
            change(() => {
              b.bold = !(
                b.bold ?? ["name", "section", "heading"].includes(b.type)
              );
            });
          break;
        case "align":
          if (b)
            change(() => {
              const next = { left: "center", center: "right", right: "left" };
              b.align = next[b.align || "left"];
            });
          break;
        case "up":
        case "down": {
          const j = index + (action === "up" ? -1 : 1);
          if (index >= 0 && j >= 0 && j < d.blocks.length)
            reorder(() => {
              [d.blocks[index], d.blocks[j]] = [d.blocks[j], d.blocks[index]];
            });
          break;
        }
        case "add": {
          const fresh = block("body", "");
          change(() => {
            d.blocks.splice(index + 1, 0, fresh);
            selected = fresh.id;
          });
          beginEdit(pagesEl.querySelector(".re-selected .re-copy"));
          break;
        }
        case "delete":
          if (b && d.blocks.length > 1)
            change(() => {
              d.blocks.splice(index, 1);
              selected = d.blocks[Math.max(0, index - 1)]?.id;
            });
          break;
        case "suggest":
          suggest();
          break;
        case "discard":
          suggestion = null;
          $(".re-proposal").innerHTML = "";
          break;
        case "apply": {
          if (!suggestion || !b) return;
          if (suggestion.id !== b.id || suggestion.original !== b.text) {
            toast("原文已更新，请重新预览修改");
            suggest();
            return;
          }
          const text = $(".re-proposal textarea").value;
          if (!text.trim()) return;
          change(() => {
            b.text = text;
          });
          toast("已应用到当前选区");
          break;
        }
        case "result":
          if (b)
            resultModal(b, (value, sync) => {
              change(() => {
                b.text = (b.text.trim() + "\n" + value).trim();
                if (sync && b.experienceId) {
                  const facts = get("experiences", []);
                  const related = facts.find((x) => x.id === b.experienceId);
                  if (related) {
                    related.result = value;
                    set("experiences", facts);
                  }
                }
              });
            });
          break;
      }
    }
    view.addEventListener("click", (e) => {
      const action = e.target.closest("[data-action]");
      if (action && !action.disabled) handle(action.dataset.action);
    });
    view.addEventListener("change", (e) => {
      const b = current();
      if (!b) return;
      if (e.target.matches(".re-size"))
        change(() => {
          b.size = Number(e.target.value);
        });
      if (e.target.matches(".re-line"))
        change(() => {
          b.line = Number(e.target.value);
        });
      if (e.target.matches(".re-font"))
        change(() => {
          b.font = e.target.value;
        });
    });
    function key(e) {
      if (!view.isConnected) return stopEditor();
      if (
        !document.querySelector(".re-dialog") &&
        (e.ctrlKey || e.metaKey) &&
        ["z", "y"].includes(e.key.toLowerCase()) &&
        !e.isComposing
      ) {
        e.preventDefault();
        const redoKey = e.key.toLowerCase() === "y" || e.shiftKey;
        handle(redoKey ? "redo" : "undo");
      }
    }
    const observer = new ResizeObserver(measure);
    observer.observe(pagesEl);
    document.addEventListener("keydown", key);
    stopEditor = () => {
      observer.disconnect();
      document.removeEventListener("keydown", key);
      clearTimeout(timer);
      stopEditor = () => {};
    };
    paint();
    saved();
    const intent = get("resumeIntent", "");
    if (intent) {
      set("resumeIntent", "");
      if (intent === "import") modalImport(startOver);
      if (intent === "experience") pickFacts(d, startOver);
    }
  };
  function resultModal(b, commit) {
    const select = (opts) =>
      opts.map((o) => "<option>" + esc(o) + "</option>").join("");
    modal(
      "补充这段经历的结果",
      '<label class="re-label">你掌握哪类结果？<select class="re-result-kind">' +
        select([
          "有量化结果",
          "有试用、采用或交付",
          "负责人明确认可",
          "暂时没有",
        ]) +
        '</select></label><div class="re-result-fields"></div>' +
        (b.experienceId
          ? '<label class="re-check"><input type="checkbox" class="re-sync">同时同步到这条经历</label>'
          : "") +
        '<div class="re-actions">' +
        btn("later", "稍后补", "") +
        btn("confirm", "确认并添加", "check", "re-primary") +
        "</div>",
      (m, close) => {
        const kind = m.querySelector("select"),
          fields = m.querySelector(".re-result-fields"),
          ok = m.querySelector('[data-action="confirm"]');
        function redraw() {
          const prompts = [
            [
              "数值与单位",
              "填写真实数值，注明最终值或基线",
              "范围与归属",
              "说明测试范围、数据口径及个人贡献",
            ],
            [
              "进展类型",
              "例如完成试点、交付或被采用",
              "谁使用了什么，进展到哪一步？",
              "填写能确认的范围与用途",
            ],
            [
              "谁给出了反馈？",
              "填写对方的角色",
              "对方明确认可了哪项工作？",
              "填写对方的实际反馈",
            ],
          ];
          const p = prompts[kind.selectedIndex];
          ok.hidden = !p;
          fields.innerHTML = p
            ? '<label class="re-label">' +
              p[0] +
              '<input class="re-r1" placeholder="' +
              p[1] +
              '"></label><label class="re-label">' +
              p[2] +
              '<textarea class="re-r2" rows="3" placeholder="' +
              p[3] +
              '"></textarea></label><div class="re-previewline" aria-live="polite"></div>'
            : "<p>保留已经确认的行动，可以随时回来补写。</p>";
          const preview = () => {
            const a = fields.querySelector(".re-r1")?.value.trim(),
              c = fields.querySelector(".re-r2")?.value.trim();
            return a && c
              ? (kind.selectedIndex === 2
                  ? a + "明确反馈：" + c
                  : a + "，" + c
                ).replace(/[。，，]+$/, "") + "。"
              : "";
          };
          if (p)
            fields.oninput = () => {
              fields.querySelector(".re-previewline").textContent = preview();
            };
          ok.onclick = () => {
            const val = preview();
            if (!val) {
              toast("请补全结果、范围或归属");
              return;
            }
            commit(val, !!m.querySelector(".re-sync")?.checked);
            close();
            toast("结果已写入当前段落");
          };
        }
        kind.onchange = redraw;
        redraw();
        m.querySelector('[data-action="later"]').onclick = close;
      },
    );
  }
  function exportModal(d, isArchived = false) {
    const pages = paginate(d.blocks);
    modal(
      "导出当前版本",
      '<div class="re-export-summary"><span>' +
        ico("file", 26) +
        "</span><div><strong>" +
        esc(d.title) +
        "</strong><small>A4 纵向 · " +
        pages.length +
        " 页 · r" +
        d.revision +
        '</small></div></div><p>PDF 使用系统打印窗口保存。PPTX 中每段文字均可独立编辑和移动。</p><div class="re-actions">' +
        btn("pdf", "打印 / 存为 PDF", "file") +
        btn("pptx", "下载 PPTX", "download", "re-primary") +
        '</div><small class="re-exp-status" role="status"></small>',
      (m, close) => {
        m.querySelector("[data-action=pdf]").onclick = () => {
          try {
            printResume(d, pages);
            if (!isArchived) snapshot(d, "打印预览");
            close();
          } catch {
            toast("浏览器未能启动打印，请重试");
          }
        };
        const ppt = m.querySelector("[data-action=pptx]");
        ppt.onclick = async () => {
          ppt.disabled = true;
          m.querySelector(".re-exp-status").textContent = "正在生成可编辑文件…";
          try {
            await downloadSlides(d, pages);
            if (!isArchived) snapshot(d, "PPTX");
            close();
            toast("PPTX 已生成");
          } catch {
            m.querySelector(".re-exp-status").textContent =
              "生成失败，可重试或选择打印。";
            ppt.disabled = false;
          }
        };
      },
    );
  }
  function printResume(d, pages) {
    const frame = document.createElement("iframe");
    frame.title = "打印简历";
    frame.className = "re-print-frame";
    document.body.append(frame);
    const doc = frame.contentDocument;
    const css =
      "*{box-sizing:border-box}html,body{margin:0;background:white;color:#263831}@page{size:A4 portrait;margin:0}.re-paper{padding:64px 62px;width:794px;height:1123px;break-after:page;overflow:hidden}.re-paper:last-child{break-after:auto}.re-block{padding:4px 0}.re-copy{white-space:pre-wrap;overflow-wrap:anywhere}.re-contact{color:#58695f}.re-section{margin-top:23px;border-bottom:1.5px solid #84998a;color:#2d5340}.re-heading{margin-top:10px}@media print{.re-paper{width:210mm;height:297mm}}";
    doc.open();
    doc.write(
      '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>' +
        esc(d.title) +
        "</title><style>" +
        css +
        "</style></head><body>" +
        pages
          .map(
            (page) =>
              '<article class="re-paper">' +
              page.map((b) => blockMarkup(b)).join("") +
              "</article>",
          )
          .join("") +
        "</body></html>",
    );
    doc.close();
    frame.contentWindow.addEventListener(
      "afterprint",
      () => setTimeout(() => frame.remove(), 150),
      { once: true },
    );
    frame.contentWindow.focus();
    frame.contentWindow.print();
    setTimeout(() => frame.remove(), 300000);
  }
  let slideLibrary;
  function loadSlides() {
    if (window.PptxGenJS) return Promise.resolve(window.PptxGenJS);
    if (!slideLibrary)
      slideLibrary = new Promise((resolve, reject) => {
        const el = document.createElement("script");
        el.src = new URL("vendor/pptxgen.bundle.js", document.baseURI).href;
        el.onload = () =>
          window.PptxGenJS
            ? resolve(window.PptxGenJS)
            : reject(Error("library unavailable"));
        el.onerror = reject;
        document.head.append(el);
      }).catch((e) => {
        slideLibrary = null;
        throw e;
      });
    return slideLibrary;
  }
  async function downloadSlides(d, pages) {
    const PPT = await loadSlides(),
      out = new PPT();
    out.defineLayout({ name: "A4", width: 210 / 25.4, height: 297 / 25.4 });
    out.layout = "A4";
    out.title = d.title;
    out.author = "履历间";
    const wrap = document.createElement("div");
    wrap.className = "re-measure";
    document.body.append(wrap);
    try {
      for (const group of pages) {
        const slide = out.addSlide();
        wrap.innerHTML =
          '<article class="re-paper">' +
          group.map((b) => blockMarkup(b)).join("") +
          "</article>";
        const paper = wrap.firstElementChild,
          r = paper.getBoundingClientRect(),
          sx = 210 / 25.4 / 794,
          sy = 297 / 25.4 / 1123;
        Array.from(paper.querySelectorAll(".re-copy")).forEach((el, j) => {
          const b = group[j],
            rect = el.getBoundingClientRect(),
            fontSize = (b.size || sizes[b.type] || 16) * 0.75;
          slide.addText(b.text, {
            x: (rect.left - r.left) * sx,
            y: (rect.top - r.top) * sy,
            w: rect.width * sx,
            h: rect.height * sy,
            fontFace: b.font === "serif" ? "SimSun" : "Microsoft YaHei",
            fontSize,
            bold: b.bold ?? ["name", "section", "heading"].includes(b.type),
            color:
              b.type === "section"
                ? "2D5340"
                : b.type === "contact"
                  ? "58695F"
                  : "263831",
            margin: 0,
            breakLine: false,
            paraSpaceAfter: 0,
            lineSpacingMultiple: b.line || 1.55,
            align: b.align || "left",
            valign: "top",
            objectName: types[b.type],
          });
          if (b.type === "section")
            slide.addShape(out.ShapeType.line, {
              x: (rect.left - r.left) * sx,
              y: (rect.bottom - r.top + 4) * sy,
              w: rect.width * sx,
              h: 0,
              line: { color: "84998A", width: 1 },
            });
        });
      }
      await out.writeFile({
        fileName: d.title.replace(/[\\/:*?"<>|]/g, "_") + ".pptx",
      });
    } finally {
      wrap.remove();
    }
  }
  window.renderVersions = (root) => {
    stopEditor();
    const versions = get("resumeVersions", []),
      draft = get("resumeDraft", null);
    let filter = "";
    root.innerHTML =
      '<section class="re-view"><div class="re-titlebar"><div><h1>简历仓库</h1><p>按岗位找回工作稿与定稿，继续准备下一次投递。</p></div>' +
      btn("resume", "打开优化台", "edit", "re-primary") +
      "</div>" +
      (draft
        ? '<div class="re-current"><div class="re-doc-icon">' +
          ico("edit", 22) +
          "</div><div><small>当前工作稿</small><strong>" +
          esc(draft.title) +
          "</strong></div>" +
          btn("resume", "继续编辑", "edit") +
          "</div>"
        : "") +
      '<div class="re-versions-head"><h2>归档版本 <span>' +
      versions.length +
      "</span></h2><label>" +
      ico("search", 17) +
      '<input type="search" placeholder="搜索公司、岗位或版本" aria-label="搜索归档版本"></label></div><div class="re-versions-grid"></div></section>';
    const grid = root.querySelector(".re-versions-grid");
    function draw() {
      const list = versions.filter((v) =>
        [v.title, targetName(v.target), ...(v.actions || [])]
          .join(" ")
          .toLowerCase()
          .includes(filter.toLowerCase()),
      );
      grid.innerHTML = list.length
        ? list
            .map(
              (v) =>
                '<article class="re-version" data-v="' +
                esc(v.id) +
                '"><div class="re-version-cover"><div class="re-mini-paper"><b>' +
                esc(
                  v.blocks.find((b) => b.type === "name")?.text || "个人简历",
                ) +
                "</b>" +
                v.blocks
                  .filter((b) => b.type === "section" || b.type === "heading")
                  .slice(0, 3)
                  .map(
                    (b) => "<strong>" + esc(b.text) + "</strong><i></i><i></i>",
                  )
                  .join("") +
                "</div><span>" +
                esc(v.actions?.includes("定稿") ? "已定稿" : "已归档") +
                '</span></div><div class="re-version-info"><small>' +
                esc(targetName(v.target)) +
                "</small><h3>" +
                esc(v.title) +
                "</h3><p>" +
                ico("clock", 14) +
                dateLabel(v.at) +
                " · r" +
                v.revision +
                '</p><div class="re-vbuttons">' +
                btn("export", "导出", "download") +
                btn("copy", "另存工作稿", "edit") +
                btn("interview", "准备面试", "") +
                "</div></div></article>",
            )
            .join("")
        : '<div class="re-empty">' +
          ico("archive", 32) +
          "<h3>" +
          (filter ? "没有匹配的版本" : "第一份定稿会出现在这里") +
          "</h3><p>" +
          (filter
            ? "试试其他公司、岗位或版本名称。"
            : "在优化台完成编辑后，点「定稿」收藏这一版。") +
          "</p></div>";
    }
    draw();
    root.querySelector("input").oninput = (e) => {
      filter = e.target.value.trim();
      draw();
    };
    root.querySelector(".re-view").onclick = (e) => {
      const target = e.target.closest("[data-action]");
      if (!target) return;
      const action = target.dataset.action;
      if (action === "resume") {
        A().go("resume");
        return;
      }
      const v = versions.find(
        (x) => x.id === target.closest("[data-v]")?.dataset.v,
      );
      if (!v) return;
      if (action === "export") {
        exportModal(v, true);
        return;
      }
      if (action === "interview") {
        set("interviewResume", clone(v));
        set("target", v.target?.id || v.target?.company ? v.target : null);
        A().go("interview");
        return;
      }
      if (action === "copy") {
        const next = {
          ...clone(v),
          id: uid(),
          title: v.title + " · 副本",
          revision: 1,
          updatedAt: Date.now(),
        };
        delete next.at;
        delete next.draftId;
        delete next.actions;
        set("target", next.target);
        persist(next);
        A().go("resume");
        toast("已从归档快照创建工作稿");
      }
    };
  };
})();
