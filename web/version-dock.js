/* 版本坞：只在右下角给出各版本入口，不改页面任何交互。当前页为版本 6。 */
(function () {
  "use strict";
  function mount() {
    if (document.querySelector("[data-version-dock]")) return;
    var wrap = document.createElement("div");
    wrap.setAttribute("data-version-dock", "1");
    wrap.style.cssText = ["position:fixed", "right:22px", "bottom:22px", "z-index:90", "display:flex", "gap:8px", "align-items:center"].join(";");
    var items = [
      { label: "V1", href: "__v1__/index.html", title: "版本 1 · 原始版" },
      { label: "V2", href: "__v2__/index.html", title: "版本 2 · 证据版" },
      { label: "V3", href: "__v3__/index.html", title: "版本 3 · 证据链" },
      { label: "V4", href: "__v4__/index.html", title: "版本 4 · 三卡版" },
      { label: "V5", href: "__v5__/index.html", title: "版本 5 · 布局增强" },
      { label: "V6", href: "index.html", title: "版本 6 · 当前" }
    ];
    items.forEach(function (item) {
      var a = document.createElement("a");
      a.href = item.href;
      a.textContent = item.label;
      a.title = item.title;
      var on = item.label === "V6";
      a.style.cssText = [
        "display:inline-flex",
        "align-items:center",
        "justify-content:center",
        "min-width:40px",
        "padding:9px 12px",
        "border-radius:999px",
        "text-decoration:none",
        "font:500 12.5px/1 Inter,'Microsoft YaHei','PingFang SC',sans-serif",
        on ? "background:#375f46" : "background:#e7ecdf",
        on ? "color:#f4f8ee" : "color:#3f5a48",
        "box-shadow:0 6px 18px rgba(37,53,45,.18)"
      ].join(";");
      wrap.append(a);
    });
    document.body.append(wrap);
  }
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", mount) : mount();
})();
