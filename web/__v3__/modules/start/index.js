(function () {
  "use strict";
  const { api, e, get, put, go, inner, icon } = window.FolioViews;
  const directions = {
    计算机: ["开发", "算法", "数据", "测试"],
    互联网: ["产品", "运营", "市场营销", "KA 大客户"],
    金融: ["行研", "投研", "投行", "资管", "风控"],
  };
  function diagram(index) {
    const frame =
      '<svg viewBox="0 0 280 132" fill="none" aria-hidden="true" preserveAspectRatio="xMidYMid meet">';
    if (index === 0)
      return (
        frame +
        '<g stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><g opacity=".26"><path d="m29 91 48 18 46-19m82-4 34 12 21-9M41 43l37-14 31 12M202 38l24-10 26 10"/><circle cx="27" cy="91" r="2"/><circle cx="39" cy="44" r="2"/><circle cx="253" cy="39" r="2"/></g><g class="pv-dfigure" stroke-width="1.6"><path d="m77 75 66-25 65 25v10l-65 26-66-26z" fill="var(--pv-artbg)"/><path d="m77 75 66 26 65-26M143 101v10"/><path d="m77 60 66-26 65 26v10l-65 26-66-26z" fill="var(--pv-artbg)"/><path d="m77 60 66 26 65-26m-65 26v9"/><path d="m77 45 66-26 65 26v10l-65 26-66-26z" fill="var(--pv-artbg)"/><path d="m77 45 66 26 65-26m-65 26v10"/><path d="m115 45 28-11 28 11-28 11z" fill="currentColor" fill-opacity=".16"/><path d="m130 44 8-2m6 6 8-3"/></g></g></svg>'
      );
    if (index === 1)
      return (
        frame +
        '<g stroke="currentColor" stroke-width="1.25"><g opacity=".29"><path d="M46 100 231 29m-167-8 155 86" stroke-dasharray="2 6"/><circle cx="65" cy="24" r="2"/><circle cx="212" cy="105" r="2"/></g><g class="pv-dfigure"><g transform="rotate(-19 140 67)"><circle cx="140" cy="67" r="46" fill="var(--pv-artbg)"/><ellipse cx="140" cy="67" rx="26" ry="46"/><ellipse cx="140" cy="67" rx="10" ry="46"/><ellipse cx="140" cy="67" rx="46" ry="16"/><path d="M94 67h92m-86-22c18 16 59 16 80 0m-80 44c18-16 59-16 80 0"/></g><path d="M88 93c-27 7-38 5-38 0-3-10 39-32 92-51s91-28 94-19c2 5-19 20-47 36" transform="translate(0 9)" stroke-width="2"/><circle cx="207" cy="49" r="4" fill="currentColor"/></g></g></svg>'
      );
    return (
      frame +
      '<g stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"><g opacity=".24"><path d="m46 91 88 33 107-41M63 74l91 35m-46-52 90 35M73 102l109-40M100 113l110-41" stroke-dasharray="3 4"/></g><g class="pv-dfigure" fill="var(--pv-artbg)"><path d="m76 76 17-7 18 7v16l-18 7-17-7zM76 76l17 7 18-7m-18 7v16"/><path d="m108 52 17-7 18 7v36l-18 7-17-7zM108 52l17 7 18-7m-18 7v36"/><path d="m141 54 17-7 18 7v24l-18 7-17-7zM141 54l17 7 18-7m-18 7v24"/><path d="m174 27 17-7 18 7v45l-18 7-17-7zM174 27l17 7 18-7m-18 7v45"/><path d="m66 64 53-36 37 4 37-23" stroke-dasharray="3 4" fill="none"/></g></g></svg>'
    );
  }
  function renderStart(root) {
    const pending = get("pendingDirection", null);
    let selected =
      pending && pending.field && pending.role
        ? pending
        : get("direction", null);
    if (pending) put("pendingDirection", null);
    function commitDirection(value) {
      const previousTarget = get("target", null);
      if (previousTarget?.role && previousTarget.role !== value.role)
        put("target", null);
      put("direction", value);
    }
    if (pending && selected) commitDirection(selected);
    function select(field, role) {
      selected = { field, role };
      commitDirection(selected);
      if (api().render) api().render();
      else show();
    }
    function show() {
      if (selected) {
        root.innerHTML = inner(
          '<header class="pv-head"><div><h1>这次想怎么开始？</h1><p>选择手头已有的材料，开始制作岗位简历。</p></div><button class="pv-btn" data-choose>' +
            icon("settings") +
            e(selected.field) +
            " · " +
            e(selected.role) +
            '</button></header><div class="pv-pathgrid"><article class="pv-pathcard"><div class="pv-path-art pv-stack-art" aria-hidden="true"><i></i><i></i><i></i><span></span></div><div class="pv-pathbody"><h2>从经历开始做简历</h2><p>从课程项目、实习或竞赛材料中，整理自己的行动和结果。</p><button class="pv-btn pv-primary" data-go="library">' +
            icon("library") +
            '整理个人经历</button></div></article><article class="pv-pathcard"><div class="pv-path-art pv-paper-art" aria-hidden="true"><i></i><i></i><span>' +
            icon("edit", 28) +
            '</span></div><div class="pv-pathbody"><h2>用现有简历适配岗位</h2><p>保留原稿，先导入并核对内容，再根据目标岗位调整。</p><button class="pv-btn" data-import>' +
            icon("file") +
            '导入已有简历</button></div></article></div><div class="pv-inline"><span>' +
            icon("brief") +
            ' 已经有目标 JD？</span><button class="pv-link" data-go="match">添加岗位描述</button></div>',
        );
      } else {
        const cards = Object.entries(directions)
          .map(
            ([field, roles], i) =>
              '<article class="pv-dir pv-dir-' +
              i +
              '"><button class="pv-dtoggle" aria-expanded="false" aria-controls="pv-r-' +
              i +
              '"><span class="pv-dart">' +
              diagram(i) +
              '</span><span class="pv-dtitle">' +
              field +
              icon("caret") +
              '</span></button><div class="pv-roles" id="pv-r-' +
              i +
              '"><div class="pv-rolesinner">' +
              roles
                .map(
                  (r) =>
                    '<button class="pv-choice" data-role="' +
                    e(r) +
                    '" data-field="' +
                    field +
                    '">' +
                    e(r) +
                    "</button>",
                )
                .join("") +
              '<form data-custom="' +
              field +
              '"><input maxlength="60" aria-label="其他' +
              field +
              '岗位" placeholder="填写其他岗位名称" required><button title="确认岗位" aria-label="确认岗位">' +
              icon("check", 16) +
              "</button></form></div></div></article>",
          )
          .join("");
        root.innerHTML = inner(
          '<header class="pv-head"><div><h1>你想投哪个方向？</h1><p>选定方向后，我们会根据具体岗位整理经历与简历。</p></div></header><div class="pv-dirgrid">' +
            cards +
            '</div><div class="pv-inline"><span>' +
            icon("leaf") +
            ' 还没确定方向？</span><button class="pv-link" data-go="library">先整理经历</button></div><div class="pv-inline pv-inline-plain"><span>' +
            icon("brief") +
            ' 已经有目标 JD？</span><button class="pv-link" data-go="match">粘贴或上传 JD</button></div>',
        );
        const dirs = [...root.querySelectorAll(".pv-dir")];
        const open = (active) =>
          dirs.forEach((card) => {
            card.classList.toggle("pv-open", card === active);
            card
              .querySelector(".pv-dtoggle")
              .setAttribute("aria-expanded", String(card === active));
            card.querySelector(".pv-roles").inert = card !== active;
          });
        open(null);
        dirs.forEach((card) => {
          const toggle = card.querySelector(".pv-dtoggle");
          card.onpointerenter = (ev) => {
            if (
              ev.pointerType === "mouse" &&
              !root.querySelector(".pv-roles input:focus")
            )
              open(card);
          };
          toggle.onclick = () => open(card);
          card.onkeydown = (ev) => {
            if (ev.key === "Escape") {
              open(null);
              toggle.focus();
            }
          };
        });
        root
          .querySelectorAll("[data-role]")
          .forEach(
            (b) => (b.onclick = () => select(b.dataset.field, b.dataset.role)),
          );
        root.querySelectorAll("[data-custom]").forEach(
          (f) =>
            (f.onsubmit = (ev) => {
              ev.preventDefault();
              const name = f.querySelector("input").value.trim();
              if (name) select(f.dataset.custom, name);
            }),
        );
      }
      root.querySelectorAll("[data-go]").forEach(
        (b) =>
          (b.onclick = (ev) => {
            ev.stopPropagation();
            go(b.dataset.go);
          }),
      );
      const change = root.querySelector("[data-choose]");
      if (change)
        change.onclick = () => {
          selected = null;
          show();
        };
      const imp = root.querySelector("[data-import]");
      if (imp)
        imp.onclick = () => {
          put("resumeIntent", "import");
          go("resume");
        };
    }
    show();
  }

  window.renderStart = renderStart;
})();
