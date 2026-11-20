(() => {
  let seq = 0;
  function scene(body, view = "0 0 180 110") {
    const id = "art" + ++seq;
    const defs =
      '<defs><filter id="shadow" x="-50%" y="-50%" width="210%" height="230%"><feDropShadow dx="0" dy="4" stdDeviation="3.2" flood-color="#25332c" flood-opacity=".19"/></filter><linearGradient id="sage" x2=".8" y2="1"><stop stop-color="#cee0a9"/><stop offset="1" stop-color="#8eae79"/></linearGradient><linearGradient id="purple" x2="1" y2="1"><stop stop-color="#a99ac7"/><stop offset="1" stop-color="#79658e"/></linearGradient><linearGradient id="paper" x2=".5" y2="1"><stop stop-color="#fffef5"/><stop offset="1" stop-color="#e9e5d8"/></linearGradient><linearGradient id="gold" x2="1" y2="1"><stop stop-color="#f4c987"/><stop offset="1" stop-color="#cca36e"/></linearGradient><linearGradient id="blue" x2=".8" y2="1"><stop stop-color="#bcd7e4"/><stop offset="1" stop-color="#83a6b9"/></linearGradient><linearGradient id="folder" x1="0" y1="0" x2=".5" y2="1"><stop stop-color="#e0d9a5"/><stop offset=".47" stop-color="#c4c28f"/><stop offset="1" stop-color="#a3a77d"/></linearGradient></defs>';
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" ' +
      (view === "0 0 180 110"
        ? 'aria-hidden="true"'
        : 'role="group" aria-label="可抽阅的个人档案"') +
      ' viewBox="' +
      view +
      '" class="desk-art">' +
      defs +
      body +
      "</svg>"
    )
      .replace(
        /id="(shadow|sage|purple|paper|gold|blue|folder|clip[0-9]+)"/g,
        (_, v) => 'id="' + id + v + '"',
      )
      .replace(/url\(#(.*?)\)/g, (_, v) => "url(#" + id + v + ")")
      .replace(/x2="\.(\d)"/g, (_, v) => 'x2="' + v + '0%"')
      .replace(/x2="1"/g, 'x2="100%"')
      .replace(/y2="1"/g, 'y2="100%"');
  }
  const star = (x, y, r) =>
    '<path d="M' +
    x +
    " " +
    (y - r) +
    "q1 " +
    (r - 1) +
    " " +
    r +
    " " +
    r +
    "q-" +
    (r - 1) +
    " 1 -" +
    r +
    " " +
    r +
    "q-1 -" +
    (r - 1) +
    " -" +
    r +
    " -" +
    r +
    "q" +
    (r - 1) +
    " -1 " +
    r +
    " -" +
    r +
    '" />';
  const folder =
    '<g transform="translate(15 4) rotate(-8 69 53)" filter="url(#shadow)"><path d="M24 36q0-5 6-5h21l6 7h56q5 0 5 5v45H25z" fill="#849d79" stroke="#6c8a62"/><g transform="rotate(5 71 55)"><rect x="34" y="27" width="73" height="53" rx="3" fill="#d5dccc" stroke="#a2b29c"/><rect x="40" y="18" width="68" height="61" rx="3" fill="url(#paper)" stroke="#bec9ad"/><path d="M48 28h34M48 34h23" stroke="#a3b49b" stroke-width="2"/></g><path d="M20 43q-1-5 5-5h23l6 8h63q4 0 3 5l-8 38H29q-4 0-5-4z" fill="url(#sage)" stroke="#88a471"/><path d="M28 82h79" stroke="#d0e1b4"/><rect x="35" y="58" width="24" height="12" rx="2" fill="#eef0d9"/><path d="M39 62h16M39 66h10" stroke="#8b9b79"/></g>';
  const cards =
    '<g filter="url(#shadow)"><g transform="rotate(-19 78 56)"><rect x="48" y="19" width="46" height="68" rx="5" fill="#b6aaca" stroke="#90859f"/><rect x="52" y="23" width="38" height="60" rx="3" stroke="#e2d9e6" fill="none"/></g><g transform="rotate(-3 82 53)"><rect x="60" y="15" width="46" height="70" rx="5" fill="#9e8db3" stroke="#847198"/><rect x="64" y="19" width="38" height="62" rx="3" fill="none" stroke="#e9dcde"/></g><g transform="rotate(13 95 58)"><rect x="73" y="16" width="49" height="73" rx="5" fill="url(#purple)" stroke="#756586"/><rect x="77" y="20" width="41" height="65" rx="3" fill="none" stroke="#ddc9ad"/><path d="m97 27 15 25-15 25-14-25z" fill="none" stroke="#c6ad91" stroke-width=".6"/><g fill="#f0ddbc">' +
    star(97, 52, 13) +
    star(97, 28, 2.5) +
    star(97, 76, 2.5) +
    '</g><circle cx="97" cy="52" r="16" stroke="#dec8a4" fill="none" stroke-width=".7"/></g></g>';
  const resume =
    '<g transform="rotate(-8 84 55)" filter="url(#shadow)"><rect x="48" y="20" width="75" height="76" rx="4" fill="#c8ba9a" transform="rotate(8 80 55)"/><rect x="47" y="15" width="72" height="78" rx="3" fill="url(#paper)" stroke="#c2b99e"/><rect x="56" y="25" width="13" height="13" rx="2" fill="#d8c6a0"/><g stroke="#aaa38e" stroke-width="2.5"><path d="M75 27h27M75 33h19M56 48h49M56 55h39M56 63h42M56 70h30"/></g></g><g transform="rotate(31 118 64)" filter="url(#shadow)"><rect x="115" y="36" width="7" height="48" rx="1.7" fill="url(#gold)" stroke="#b08f5d"/><path d="m115 83 3.5 9 3.5-9" fill="#d8c9a3"/><path d="m117.2 89 1.3 3 1.3-3" fill="#394437"/><path d="M117 40v37" stroke="#efdaa8"/></g>';
  const mic =
    '<g filter="url(#shadow)"><g transform="rotate(9 100 54)"><path d="M78 28h46a8 8 0 0 1 8 8v26a8 8 0 0 1-8 8h-4l-1 12-15-12H78a8 8 0 0 1-8-8V36a8 8 0 0 1 8-8" fill="#dae7e9" stroke="#9db8c5"/></g><g transform="rotate(-8 80 53)"><path d="M45 28q0-5 7-5h49q8 0 8 8v34q0 7-8 7H78L61 85l1-13h-9q-8 0-8-8z" fill="url(#blue)" stroke="#809faf"/><g fill="#eef6f7"><circle cx="62" cy="48" r="3.6"/><circle cx="76" cy="48" r="3.6"/><circle cx="90" cy="48" r="3.6"/></g></g></g>';
  const icons = { library: folder, match: cards, resume, interview: mic };
  window.DeskArt = {
    card: (key) => scene(icons[key] || folder),
    hero(materials) {
      const pages = [
        {
          x: 110,
          y: 38,
          rotation: -5,
          shade: "#e6e9da",
          title: "PROJECT NOTES",
        },
        { x: 98, y: 33, rotation: -12, shade: "#d7cbdc", title: "EXPERIENCE" },
        {
          x: 76,
          y: 37,
          rotation: -17,
          shade: "#f7f4de",
          title: "CURRICULUM VITAE",
        },
      ];
      const pg = pages
        .map(
          (p, i) =>
            '<g class="art-sheet" tabindex="0" role="button" aria-label="预览资料 ' +
            App.esc(materials[i]?.name || p.title) +
            '" data-sheet="' +
            i +
            '"><title>' +
            App.esc(materials[i]?.name || p.title) +
            '</title><g transform="rotate(' +
            p.rotation +
            ' 210 160)"><rect x="' +
            p.x +
            '" y="' +
            p.y +
            '" width="164" height="141" rx="4" fill="' +
            p.shade +
            '" stroke="#929c85"/><g transform="translate(' +
            p.x +
            " " +
            p.y +
            ')"><path d="M14 16h46" stroke="#6c796c" stroke-width="2"/><text x="14" y="32" font-size="7" letter-spacing="1" fill="#516156">' +
            p.title +
            '</text><path d="M14 42h118M14 48h84M14 63h123M14 68h116M14 73h104" stroke="#a5ac99"/><circle cx="138" cy="23" r="10" fill="none" stroke="#8e9b86"/><path d="m134 23 3 3 5-6" fill="none" stroke="#8e9b86"/></g></g></g>',
        )
        .join("");
      return scene(
        '<g transform="translate(18 -4) rotate(-6 193 126)" filter="url(#shadow)"><path d="M45 63q0-6 7-6h58l10 11h173q7 0 7 6l-4 119H53z" fill="#819171" stroke="#a8b599"/><path d="M54 184h237l16-90H77z" fill="#596c51"/><clipPath id="clip' +
          seq +
          '"><rect x="0" y="-80" width="360" height="263"/></clipPath><g clip-path="url(#clip' +
          seq +
          ')">' +
          pg +
          '</g><g class="folio-front"><path d="M35 89q-1-5 6-5h59q3 0 6 3l8 8h176q7 0 5 7l-20 94q-1 5-7 5H62q-6 0-7-5z" fill="url(#folder)" stroke="#d7d3aa" stroke-width="1.5"/><path d="M62 193h205" stroke="#e7e0b6" opacity=".7"/><rect x="66" y="118" width="76" height="45" rx="2" fill="#efe9c9" stroke="#a9ac88"/><text x="73" y="131" fill="#455345" font-size="6" letter-spacing="1.3">CAREER ARCHIVE</text><path d="M73 137h61" stroke="#a0a586"/><text x="73" y="151" font-weight="600" fill="#4c5846" font-size="10">个人档案</text><path d="M252 177h12m-13 4h12m-13 4h11" stroke="#7f896b" stroke-width="1.5"/></g><path d="m289 103 8 1-18 87-5 5z" fill="#758468"/></g>',
        "0 0 350 218",
      );
    },
  };
})();
