(() => {
  "use strict";
  const marks = {
    stack: '<path d="m3 7 9-4 9 4-9 4zM3 12l9 4 9-4M3 17l9 4 9-4"/>',
    home: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    folder:
      '<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    layers: '<path d="m3 7 9-4 9 4-9 4zM3 12l9 4 9-4M3 17l9 4 9-4"/>',
    cards:
      '<rect x="8" y="4" width="12" height="16" rx="2"/><path d="m5 6-2 1 3 14 9-1M12 12l2-3 2 3-2 3z"/>',
    file: '<path d="M6 3h8l4 4v14H6zM13 3v5h5M9 12h6M9 16h6"/>',
    edit: '<path d="M12 4H5v16h14v-8M10 15l1-4 7-7 3 3-7 7z"/>',
    chat: '<path d="M4 4h16v12H9l-5 4zM8 9h8M8 12h5"/>',
    archive:
      '<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v11h14V9M10 13h4"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.7"/><path d="m16 16 5 5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    chevron: '<path d="m9 5 7 7-7 7"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    calendar:
      '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v5M17 3v5M3 10h18"/>',
    monitor:
      '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
    globe:
      '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
    finance: '<path d="m3 8 9-5 9 5zM3 21h18M5 18h14M6 10v6M12 10v6M18 10v6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
    compass:
      '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
    check: '<path d="m4 12 5 5L20 6"/>',
    sparkles: '<path d="m12 3 2 6 6 3-6 2-2 7-2-7-6-2 6-3zM19 3v4M17 5h4"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    x: '<path d="m6 6 12 12M18 6 6 18"/>',
    upload: '<path d="M12 16V3m-5 6 5-6 5 6M4 15v6h16v-6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    list: '<path d="M8 5h13M8 12h13M8 19h13M3 5h1M3 12h1M3 19h1"/>',
    book: '<path d="M3 4c4-2 7-1 9 1 2-2 5-3 9-1v15c-4-1-6 0-9 2-3-2-6-3-9-2zM12 5v16"/>',
    target:
      '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    panel:
      '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
    leaf: '<path d="M5 19C2 7 10 4 21 3c-1 12-4 17-13 15m-4 3L15 10"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 5 2c-2 1-2 2-2 3M12 17h.1"/>',
    pin: '<path d="M18 9c0 5-6 11-6 11S6 14 6 9a6 6 0 0 1 12 0z"/><circle cx="12" cy="9" r="2"/>',
  };
  const aliases = {
    briefcase: "folder",
    "file-text": "file",
    message: "chat",
    "message-circle": "chat",
    sparkle: "sparkles",
    settings: "panel",
    arrow: "chevron",
    trash: "archive",
    save: "archive",
    brief: "file",
    "chevron-down": "down",
    "chevron-right": "chevron",
    copy: "layers",
    building: "finance",
    clipboard: "file",
    checkCircle: "check",
    download: "down",
  };
  const icon = (key, size = 18) =>
    '<svg aria-hidden="true" width="' +
    Number(size) +
    '" height="' +
    Number(size) +
    '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">' +
    (marks[key] || marks[aliases[key]] || marks.file) +
    "</svg>";
  const esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const get = (key, val) => {
    try {
      const v = localStorage.getItem("folio.v1." + key);
      return v === null ? val : JSON.parse(v);
    } catch {
      return val;
    }
  };
  const set = (key, v) => {
    try {
      localStorage.setItem("folio.v1." + key, JSON.stringify(v));
      return true;
    } catch {
      toast("本地存储空间不足，请先导出当前内容。");
      return false;
    }
  };
  function toast(s) {
    const t = document.createElement("div");
    t.className = "app-toast";
    t.innerHTML = icon("info", 17) + "<span>" + esc(s) + "</span>";
    document.querySelector("#toasts").append(t);
    setTimeout(() => t.remove(), 3200);
  }
  let lastFocus;
  function closeModal() {
    document.querySelector("#overlay").replaceChildren();
    document.body.classList.remove("dialog-open");
    if (lastFocus?.isConnected) lastFocus.focus({ preventScroll: true });
  }
  function modal(title, html, onMount) {
    const outer = document.querySelector("#overlay");
    if (!outer.firstChild) lastFocus = document.activeElement;
    outer.innerHTML =
      '<div class="modal-shade"><section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header class="modal-title"><h2 id="modal-title">' +
      esc(title) +
      '</h2><button class="icon-button" data-close aria-label="关闭">' +
      icon("x") +
      '</button></header><div class="modal-inner">' +
      html +
      "</div></section></div>";
    document.body.classList.add("dialog-open");
    const box = outer.querySelector(".modal-card");
    outer.querySelector(".modal-shade").onclick = (e) => {
      if (e.target === e.currentTarget) closeModal();
    };
    box.querySelector("[data-close]").onclick = closeModal;
    onMount?.(box, closeModal);
    if (!box.contains(document.activeElement))
      box
        .querySelector("input:not([type=file]),textarea,button")
        ?.focus({ preventScroll: true });
    return box;
  }
  const names = {
    home: "工作台总览",
    library: "个人经历台",
    match: "岗位匹配台",
    resume: "简历优化台",
    interview: "面试打磨台",
    versions: "简历仓库",
    start: "方向与任务",
  };
  const navMarks = {
    home: "home",
    library: "folder",
    match: "cards",
    resume: "edit",
    interview: "chat",
    versions: "archive",
    start: "compass",
  };
  const work = ["library", "match", "resume", "interview"];
  const meta = {
    library: ["EXPERIENCE", "归集材料，整理真实经历。"],
    match: ["JOB MATCH", "比较 JD，找到适配岗位。"],
    resume: ["RÉSUMÉ STUDIO", "打磨表达，定稿专属简历。"],
    interview: ["INTERVIEW", "围绕目标岗位，准备面试。"],
  };
  const fields = {
    计算机: ["开发", "算法", "数据", "测试"],
    互联网: ["产品", "运营", "市场营销", "KA 大客户"],
    金融: ["行研", "投研", "投行", "资管", "风控"],
  };
  function go(page) {
    if (!(page in names)) return;
    if (location.hash === "#" + page) render();
    else location.hash = page;
  }
  function nav(id) {
    return (
      '<button class="nav-item" data-go="' +
      id +
      '">' +
      icon(navMarks[id], 18) +
      "<span>" +
      names[id] +
      "</span></button>"
    );
  }
  function sidebar() {
    document.querySelector("#sidebar").innerHTML =
      '<button class="brand" data-go="home"><img src="assets/brand.svg" alt=""><span>履历间<small>FOLIO STUDIO</small></span></button><div class="navs">' +
      nav("home") +
      '<div class="nav-label">求职工作台</div>' +
      work.map(nav).join("") +
      '<div class="nav-label">我的空间</div>' +
      nav("versions") +
      nav("start") +
      '</div><div class="side-bottom"><button data-help class="nav-item">' +
      icon("help") +
      '使用指南</button><div class="side-user"><span class="user-icon">' +
      icon("leaf", 21) +
      "</span><span>个人工作空间<small><i></i>本机存储</small></span></div></div>";
  }
  function top(page) {
    const dir = get("direction", null),
      target = get("target", null);
    document.querySelector("#top").innerHTML =
      '<div class="crumb"><button class="icon-button mobile-menu" aria-label="导航" data-menu>' +
      icon("menu") +
      "</button>" +
      icon("panel", 17) +
      "<span>我的空间</span><b>/</b><strong>" +
      names[page] +
      '</strong></div><div class="top-actions">' +
      (dir?.role || target?.role
        ? '<button class="target-chip" data-go="start">' +
          icon("target", 14) +
          esc(target?.role || dir.role) +
          "</button>"
        : "") +
      '<button class="search-launch" data-search>' +
      icon("search", 16) +
      '<span>搜索工作空间</span><kbd>Ctrl K</kbd></button><span class="top-sep"></span><span class="avatar" title="个人工作空间">我</span></div>';
  }
  function day() {
    return new Intl.DateTimeFormat("zh-CN", {
      month: "long",
      day: "numeric",
      weekday: "long",
      timeZone: "Asia/Shanghai",
    }).format(new Date());
  }
  function home(root) {
    const materials = get("materials", []),
      dir = get("direction", null);
    root.innerHTML =
      '<div class="home-page"><div class="page-intro"><div><div class="eyebrow"><i></i>WORKSPACE OVERVIEW</div><h1>工作台总览</h1><p>从梳理经历到准备面试，在这里推进你的求职进度。</p></div><span class="day-tag">' +
      icon("calendar", 16) +
      day() +
      '</span></div><section class="hero"><div class="map-lines"></div><div class="hero-content"><span class="hero-kicker">' +
      icon("compass", 15) +
      " 求职方向 <b>/</b> CAREER PATH</span><h2>你想投哪个方向<span>？</span></h2><p>" +
      (dir?.role
        ? "当前方向 · " + esc(dir.field) + " / " + esc(dir.role)
        : "选择职业方向，为接下来的岗位匹配和简历优化做准备。") +
      '</p><div class="directions">' +
      Object.keys(fields)
        .map(
          (f, i) =>
            '<div class="dir-wrap"><button class="dir-trigger" aria-expanded="false" data-field="' +
            f +
            '">' +
            icon(["monitor", "globe", "finance"][i], 16) +
            f +
            icon("down", 13) +
            '</button><div class="dir-pop"><strong>选择岗位</strong>' +
            fields[f]
              .map(
                (r) =>
                  '<button data-role="' +
                  r +
                  '" data-dir="' +
                  f +
                  '">' +
                  r +
                  "</button>",
              )
              .join("") +
            "</div></div>",
        )
        .join("") +
      '</div></div><div class="hero-art">' +
      DeskArt.hero(materials) +
      '</div></section><section class="work-section"><div class="sec-head"><h2>我的工作台</h2><span class="sec-note">4 个工作台</span></div><div class="work-grid">' +
      work
        .map(
          (id, i) =>
            '<button class="work-card ' +
            id +
            '" data-go="' +
            id +
            '"><div class="card-visual"><span class="art-grid"></span>' +
            DeskArt.card(id) +
            '</div><div class="card-copy"><small>' +
            meta[id][0] +
            "</small><h3>" +
            names[id] +
            "</h3><p>" +
            meta[id][1] +
            "</p></div></button>",
        )
        .join("") +
      '</div></section><section class="recent-section"><div class="sec-head"><h2>最近材料</h2><button class="quiet-link" data-go="library">查看资料库 ' +
      icon("chevron", 13) +
      "</button></div>" +
      window.materialRows(materials.slice(0, 3), true) +
      "</section></div>";
    root.querySelectorAll("[data-sheet]").forEach((el) => {
      el.onclick = () => {
        const m = materials[+el.dataset.sheet];
        if (m) window.showMaterial(m.id);
        else go("library");
      };
      el.onkeydown = (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          el.onclick();
        }
      };
    });
    root.querySelectorAll("[data-field]").forEach((el) => {
      el.onclick = (e) => {
        e.stopPropagation();
        const par = el.parentElement;
        root.querySelectorAll(".dir-wrap.open").forEach((n) => {
          if (n !== par) n.classList.remove("open");
        });
        par.classList.toggle("open");
        el.setAttribute("aria-expanded", par.classList.contains("open"));
      };
    });
    root.querySelectorAll("[data-dir]").forEach(
      (el) =>
        (el.onclick = () => {
          set("pendingDirection", {
            field: el.dataset.dir,
            role: el.dataset.role,
          });
          go("start");
        }),
    );
  }
  function render() {
    let id = decodeURIComponent(location.hash.slice(1)) || "home";
    if (!names[id]) id = "home";
    if (document.querySelector("#overlay").firstChild) closeModal();
    document.body.classList.remove("nav-open");
    document.querySelectorAll(".nav-item[data-go]").forEach((x) => {
      x.classList.toggle("active", x.dataset.go === id);
      if (x.dataset.go === id) x.setAttribute("aria-current", "page");
      else x.removeAttribute("aria-current");
    });
    top(id);
    document.title = names[id] + " · 履历间";
    const root = document.querySelector("#main");
    root.className = "page-" + id;
    root.replaceChildren();
    window.scrollTo(0, 0);
    (
      ({
        home,
        library: window.renderLibrary,
        match: window.renderMatch,
        resume: window.renderResume,
        versions: window.renderVersions,
        interview: window.renderInterview,
        start: window.renderStart,
      })[id] || home
    )(root);
  }
  function search() {
    modal(
      "搜索工作空间",
      '<div class="search-field">' +
        icon("search") +
        '<input id="global-query" placeholder="输入材料、经历或工作台名称" autocomplete="off"></div><div id="results"></div>',
      (box) => {
        const input = box.querySelector("input");
        const update = () => {
          const q = input.value.toLowerCase().trim();
          const matches = [
            ...Object.entries(names).map(([id, title]) => ({
              title,
              kind: "工作台",
              open: () => go(id),
            })),
            ...get("materials", []).map((m) => ({
              title: m.name,
              kind: "材料",
              open: () => window.showMaterial(m.id),
            })),
            ...get("experiences", []).map((e) => ({
              title: e.title,
              kind: "经历",
              open: () => window.editExperience(e.id),
            })),
          ].filter((v) => v.title.toLowerCase().includes(q));
          const container = box.querySelector("#results");
          container.innerHTML =
            matches
              .slice(0, 16)
              .map(
                (m, i) =>
                  '<button class="search-row" data-i="' +
                  i +
                  '">' +
                  icon(m.kind === "材料" ? "file" : "layers", 16) +
                  "<span>" +
                  esc(m.title) +
                  "</span><small>" +
                  m.kind +
                  "</small></button>",
              )
              .join("") || '<p class="muted">没有找到相关项目。</p>';
          container.querySelectorAll("[data-i]").forEach(
            (el) =>
              (el.onclick = () => {
                closeModal();
                matches[+el.dataset.i].open();
              }),
          );
        };
        input.oninput = update;
        update();
        input.focus();
      },
    );
  }
  function boot() {
    window.seedLibrary();
    sidebar();
    render();
    window.addEventListener("hashchange", render);
    document.addEventListener("click", (e) => {
      const n = e.target.closest(
        "[data-go],[data-menu],[data-search],[data-help],[data-material]",
      );
      if (n?.dataset.go) go(n.dataset.go);
      else if (n?.hasAttribute("data-search")) search();
      else if (n?.hasAttribute("data-menu"))
        document.body.classList.toggle("nav-open");
      else if (n?.hasAttribute("data-help"))
        modal(
          "使用指南",
          '<div class="help-copy"><h3>从方向开始</h3><p>在总览悬停一个职业方向，选择岗位后可以从已有材料或简历开始。</p><h3>整理与比较</h3><p>拖入文件归档，在个人经历台核对事实。岗位匹配台支持多份 JD 比较。</p><h3>完成投递稿</h3><p>在简历优化台编辑并定稿，随后可到仓库选择版本准备面试。首次进入时包含可试用的示例材料，修改保存在当前浏览器。</p></div>',
        );
      else if (n?.dataset.material) window.showMaterial(n.dataset.material);
      if (!e.target.closest(".dir-wrap"))
        document
          .querySelectorAll(".dir-wrap.open")
          .forEach((w) => w.classList.remove("open"));
      if (
        document.body.classList.contains("nav-open") &&
        !e.target.closest("#sidebar,[data-menu]")
      )
        document.body.classList.remove("nav-open");
    });
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        search();
      }
      if (e.key === "Escape") {
        closeModal();
        document.body.classList.remove("nav-open");
        document
          .querySelectorAll(".dir-wrap.open")
          .forEach((w) => w.classList.remove("open"));
      }
      const dlg = document.querySelector(".modal-card");
      if (dlg && e.key === "Tab") {
        const items = [
          ...dlg.querySelectorAll(
            'button:not([disabled]),input:not([disabled]),textarea,select,[tabindex="0"]',
          ),
        ].filter((n) => n.getClientRects().length);
        if (!items.length) return;
        if (e.shiftKey && document.activeElement === items[0]) {
          e.preventDefault();
          items.at(-1).focus();
        } else if (!e.shiftKey && document.activeElement === items.at(-1)) {
          e.preventDefault();
          items[0].focus();
        }
      }
    });
  }
  window.App = {
    get,
    set,
    toast,
    esc,
    icon,
    modal,
    closeModal,
    go,
    boot,
    render,
    names,
  };
})();
