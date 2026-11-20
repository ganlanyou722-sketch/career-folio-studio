/* 版本 2（冻结快照）的版本坞：不去改界面，只在右下角放两个回跳入口。 */
(function () {
  "use strict";
  function mount() {
    if (document.querySelector("[data-version-dock]")) return;
    var wrap = document.createElement("div");
    wrap.setAttribute("data-version-dock", "1");
    wrap.style.cssText = [
      "position:fixed",
      "right:22px",
      "bottom:22px",
      "z-index:90",
      "display:flex",
      "gap:8px",
    ].join(";");
    [
      { label: "版本 5 · 布局增强", href: "../index.html", primary: true },
      { label: "版本 3 · 证据链", href: "../__v3__/index.html", primary: false },
    ].forEach(function (item) {
      var a = document.createElement("a");
      a.href = item.href + (location.hash || "#home");
      a.textContent = item.label;
      a.style.cssText = [
        "display:inline-flex",
        "align-items:center",
        "padding:9px 14px",
        "border-radius:999px",
        "text-decoration:none",
        "font:500 12.5px/1 Inter,'Microsoft YaHei','PingFang SC',sans-serif",
        item.primary ? "background:#375f46" : "background:#e7ecdf",
        item.primary ? "color:#f4f8ee" : "color:#3f5a48",
        "box-shadow:0 6px 18px rgba(37,53,45,.18)",
      ].join(";");
      wrap.append(a);
    });
    document.body.append(wrap);
  }
  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", mount)
    : mount();
})();
