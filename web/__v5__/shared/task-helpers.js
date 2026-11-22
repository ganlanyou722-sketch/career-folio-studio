(function () {
  "use strict";
  const shapes = {
    settings:
      '<path d="M4 7h7m4 0h5M4 17h3m4 0h9"/><circle cx="13" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
    layers: '<path d="m3 8 9-5 9 5-9 5zM3 12l9 5 9-5M3 16l9 5 9-5"/>',
    file: '<path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6m-6 4h5"/>',
    chat: '<path d="M4 4h16v12H9l-5 4zM8 8h8m-8 4h6"/>',
    leaf: '<path d="M5 19C3 11 8 4 20 4c0 11-5 16-13 14m-3 3L15 10"/>',
    library: '<path d="M3 7V5h7l2 2h9v13H3zM7 11h9"/>',
    globe:
      '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="m4 12 5 5L20 6"/>',
    book: '<path d="M3 5c4-1 7 0 9 2 2-2 5-3 9-2v14c-4-1-7 0-9 2-2-2-5-3-9-2zM12 7v14"/>',
    pin: '<path d="M8 3h8l-1 7 4 4H5l4-4zM12 14v7"/>',
    brief:
      '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V4h8v3M3 12c6 3 12 3 18 0"/>',
    spark:
      '<path d="m12 3 2.2 6.8 6.8 2.2-6.8 2.2-2.2 6.8-2.2-6.8L3 12l6.8-2.2z"/>',
    mic: '<rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8"/>',
    link: '<path d="m10 14 4-4m-6 3-2 2a3 3 0 0 0 4 4l4-4m2-2 2-2a3 3 0 0 0-4-4l-4 4"/>',
    search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>',
    caret: '<path d="m8 10 4 4 4-4"/>',
    edit: '<path d="m5 15-1 5 5-1 12-12-4-4zM15 5l4 4"/>',
  };
  function icon(n, s = 18) {
    return (
      '<svg width="' +
      s +
      '" height="' +
      s +
      '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      (shapes[n] || shapes.file) +
      "</svg>"
    );
  }
  const api = () => window.App;
  const e = (v) => api().esc(String(v == null ? "" : v));
  const get = (key, fallback) => api().get(key, fallback);
  const put = (key, value) => api().set(key, value);
  const go = (id) => api().go(id);
  const textSource = (v) =>
    !v
      ? ""
      : typeof v === "string"
        ? v
        : [
            v.name || v.title || v.fileName || v.materialId,
            v.location || v.page,
            v.quote || v.excerpt,
          ]
            .filter(Boolean)
            .join(" · ");
  const inner = (html) => '<div class="pv">' + html + "</div>";
  window.FolioViews = { api, e, get, put, go, inner, icon, textSource };
})();
