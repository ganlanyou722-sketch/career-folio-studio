(() => {
  "use strict";
  const app = () => window.App;
  const esc = value => app().esc(value);
  const button = (id, label, primary = false) =>
    '<button type="button" class="btn' + (primary ? ' primary' : '') + '" data-ai="' + id + '">' + label + '</button>';
  const gate = '<label class="ai-invite" hidden>体验码<input type="password" autocomplete="off" maxlength="160" placeholder="输入邀请人给你的体验码"></label>';
  const statusLine = '<p class="ai-status" role="status" aria-live="polite"></p>';
  let service;
  function getStatus() {
    if (!service) {
      service = fetch("/api/ai/status", { signal: AbortSignal.timeout(3500) })
        .then(r => r.ok && r.headers.get("content-type")?.includes("application/json") ? r.json() : null)
        .then(body => body?.data || null).catch(() => null);
    }
    return service;
  }
  function storedInvite() {
    try { return sessionStorage.getItem("folio.ai.invite") || ""; } catch { return ""; }
  }
  function bindGate(root, info) {
    const label = root.querySelector(".ai-invite");
    if (!label || !info?.inviteRequired) return;
    label.hidden = false;
    label.querySelector("input").value = storedInvite();
  }
  async function request(action, payload, root, signal) {
    const info = await getStatus();
    if (!info) throw new Error("当前是静态体验版。请打开已启用文件解析和 AI 的工作台，或先粘贴原文。");
    if (info.setupRequired) throw new Error("请由管理员先在腾讯云配置站点地址和体验码。");
    const code = root.querySelector(".ai-invite input")?.value.trim() || storedInvite();
    if (info.inviteRequired && !code) throw new Error("请先输入体验码。");
    const timeout = AbortSignal.timeout(100000);
    const response = await fetch("/api/ai/" + action, {
      method: "POST", signal: signal ? AbortSignal.any([timeout, signal]) : timeout,
      headers: { "content-type": "application/json", ...(code ? { "x-folio-invite": code } : {}) },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || "处理失败，请重试。");
    if (code) try { sessionStorage.setItem("folio.ai.invite", code); } catch {}
    return data.data;
  }
  async function readFile(file, root, signal) {
    if (!file.size || file.size > 8 * 1024 * 1024) throw new Error("请选择 8 MB 以内的非空文件。");
    if (/\.(txt|md)$/i.test(file.name)) return file.text();
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1]);
      reader.onerror = () => reject(new Error("文件读取失败，可以粘贴原文。"));
      reader.readAsDataURL(file);
    });
    return (await request("extract", { name: file.name, data: base64 }, root, signal)).text;
  }
  function sources(A) {
    const all = [A.get("resumeDraft", null), ...Object.values(A.get("resumeDrafts", {})),
      ...Object.values(A.get("resumeTailoredDrafts", {})), ...A.get("resumeVersions", [])];
    return [...new Map(all.filter(d => d && !d.sample && d.blocks?.some(b => b.type === "body" && b.text.trim()))
      .map(d => [(d.draftId || d.id) + "@" + d.revision, d])).values()];
  }
  function textBlocks(blocks) {
    let heading = "";
    return blocks.flatMap(b => {
      if (["section","heading"].includes(b.type)) heading = b.text;
      if (b.type !== "body" || !b.text.trim()) return [];
      // Strip contact lines that text import did not classify as contact fields.
      const text = b.text.split("\n").filter(line => !/\b[^\s@]+@[^\s@]+\.[A-Za-z]{2,}\b|(?:联系电话|手机号|联系方式|微信|邮箱)\s*[:：]|(?:^|\D)1[3-9]\d{9}(?:$|\D)/.test(line)).join("\n");
      return text.trim() ? [{ id: b.id, text, heading }] : [];
    });
  }
  function choose(job) {
    const A = app(), all = sources(A);
    const target = { id: job.id, revision: job.revision, role: job.role, company: job.company,
      text: job.text, requirements: job.requirements || [], bonus: job.bonus || [], direction: job.direction };
    const title = "据此去优化简历";
    if (!all.length) {
      A.modal(title, '<p>先导入一份简历底稿。导入后会回到「' + esc(job.role) + '」的优化流程。</p>' +
        '<div class="ai-actions">' + button("import","导入我的简历",true) + '</div>', (root, close) => {
          root.querySelector("button[data-ai]").onclick = () => {
            A.set("resumeAfterImport", { id: job.id, revision: job.revision });
            A.set("resumeIntent", "import");
            close();
            A.go("resume");
          };
        });
      return;
    }
    A.modal(title, '<div class="ai-studio"><p><strong>' + esc(job.company + " · " + job.role) +
      '</strong> · JD v' + esc(job.revision) + '</p><label>选择底稿和修订<select data-source></select></label>' + gate +
      '<p class="ai-note">点击生成后，工作台会将选中的正文和 JD 发给模型服务。姓名和联系方式栏保留在浏览器。</p>' +
      statusLine + '<div data-review></div><div class="ai-actions">' + button("generate", "生成 AI 建议", true) +
      button("save", "保存岗位副本", true) + '</div></div>', (root, close) => {
      const picker = root.querySelector("select"), status = root.querySelector(".ai-status");
      const review = root.querySelector("[data-review]"), generate = root.querySelector('[data-ai="generate"]');
      const save = root.querySelector('[data-ai="save"]');
      let result, selected;
      const cancel = new AbortController();
      const observer = new MutationObserver(() => {
        if (!root.isConnected) { observer.disconnect(); cancel.abort(); }
      });
      observer.observe(document.querySelector("#overlay"), {childList:true});
      save.hidden = true;
      all.forEach((doc, index) => {
        picker.add(new Option((doc.title || "未命名简历") + " · v" + doc.revision + (doc.draftId ? " · 归档" : " · 工作稿"), index));
      });
      getStatus().then(info => {
        bindGate(root, info);
        if (info?.setupRequired) status.textContent = "请先在腾讯云配置站点地址和体验码。";
        else if (!info?.available) status.textContent = "当前页面的 AI 服务尚未就绪。";
      });
      picker.onchange = () => { result = null; review.replaceChildren(); save.hidden = true; status.textContent = ""; };
      generate.onclick = async () => {
        result = null;
        review.replaceChildren();
        save.hidden = true;
        generate.disabled = picker.disabled = true;
        status.textContent = "正在按技能规则改写并复核原文事实…";
        const src = structuredClone(all[Number(picker.value)]);
        try {
          const blocks = textBlocks(src.blocks);
          if (!blocks.length) throw new Error("所选底稿没有可提交的正文。");
          const response = await request("tailor", { jd: target, blocks }, root, cancel.signal);
          if (!root.isConnected) return;
          selected = src;
          result = response;
          // Only apply an edit when its checked text is exactly the saved block.
          const source = new Map(src.blocks.map(b => [b.id, b.text]));
          result.edits = response.edits.filter(edit => source.get(edit.id) === edit.original);
          status.textContent = result.edits.length ? "有 " + result.edits.length + " 条建议可供核对。" : "当前岗位未找到能安全改写的正文。你仍可保存一个岗位副本。";
          review.innerHTML = result.edits.map((edit, i) =>
            '<article class="ai-edit"><label><input type="checkbox" data-edit="' + i + '" checked>采纳这条建议</label>' +
            '<dl><dt>原文</dt><dd>' + esc(edit.original) + '</dd><dt>建议</dt><dd>' + esc(edit.text) +
            '</dd><dt>JD 原句</dt><dd>' + esc(edit.requirement) + '</dd><dt>简历证据</dt><dd>' +
            esc(edit.evidence) + '</dd><dt>修改理由</dt><dd>' + esc(edit.reason) + '</dd></dl></article>').join("") +
            (result.questions.length ? '<section><h3>可以继续核对</h3><ul>' +
              result.questions.map(q => '<li>' + esc(q) + '</li>').join("") + '</ul></section>' : "");
          save.hidden = false;
        } catch (error) {
          if (root.isConnected) status.textContent = error.name === "TimeoutError" ? "模型响应超时，可重新生成。" : error.message;
        } finally { generate.disabled = picker.disabled = false; }
      };
      save.onclick = () => {
        if (!result) return;
        const latest = window.MatchData.jobs().find(j => j.id === job.id);
        if (latest?.revision !== job.revision) {
          status.textContent = "岗位已更新，请用最新修订重新生成建议。";
          return;
        }
        const edits = [...review.querySelectorAll("[data-edit]:checked")].map(input => result.edits[Number(input.dataset.edit)]);
        if (!window.saveTailoredResume(selected, target, edits, result.skillRevision)) {
          status.textContent = "本地存储空间不足，岗位副本尚未打开。";
          return;
        }
        close();
        A.go("resume");
        A.toast(edits.length ? "已套用 " + edits.length + " 条建议并打开岗位副本" : "岗位副本已打开");
      };
    });
  }
  window.FolioAI = { choose, readFile, getStatus, bindGate, gate, statusLine };
})();
