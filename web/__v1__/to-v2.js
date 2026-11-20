/* 版本 1（冻结快照）的唯一改动：一个回到版本 2 的入口，保证 2→1 可随时切回。 */
(function () {
  "use strict";
  function mount() {
    if (document.querySelector("[data-back-v2]")) return;
    var b = document.createElement("a");
    b.setAttribute("data-back-v2", "1");
    b.href = "../index.html" + (location.hash || "#home");
    b.textContent = "回到版本 2 · 证据版";
    b.style.cssText = [
      "position:fixed",
      "right:22px",
      "bottom:22px",
      "z-index:90",
      "display:inline-flex",
      "align-items:center",
      "gap:6px",
      "padding:9px 14px",
      "border-radius:999px",
      "background:#375f46",
      "color:#f4f8ee",
      "font:500 12.5px/1 Inter,'Microsoft YaHei','PingFang SC',sans-serif",
      "text-decoration:none",
      "box-shadow:0 6px 18px rgba(37,53,45,.22)",
      "opacity:.92",
    ].join(";");
    b.onmouseenter = function () {
      b.style.opacity = "1";
    };
    b.onmouseleave = function () {
      b.style.opacity = ".92";
    };
    document.body.append(b);
  }
  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", mount)
    : mount();
})();
