/* 版本 6：页面沿用版本 1，唯一变化是把证据内核接到页面已有的计算点上。
   - 不改 DOM、不加面板、不改按钮：只暴露内核算子，供模块在原有槽位里调用。
   - 内核与 server/index.js 用的是同一份 shared/evidence-core.js，接口 9 个，规则 13 条。 */
(function () {
  "use strict";
  var CORE = window.EvidenceCore || null;
  if (!CORE) {
    console.warn("[v6] 未找到证据内核，页面按版本 1 的本地规则运行");
    return;
  }

  /* 模块读取的领域词表以内核为准（版本 2 起补的电商、内容、投放等 9 组在这里生效），
     内核缺失时模块自动回落到版本 1 自带的 14 组。 */
  window.FolioEvidence = {
    core: CORE,
    domains: CORE.DOMAINS,
    scanRisk: CORE.scanRisk,
    parseJD: CORE.parseJD,
    matchAll: CORE.matchAll,
    auditResume: CORE.auditResume,
    buildLedger: CORE.buildLedger,
    radarDims: CORE.radarDims,
    reviewAnswer: CORE.reviewAnswer,
    levels: CORE.LEVELS,
    rules: CORE.RISK_RULES,
    tiers: CORE.SOURCE_TIERS,
    questions: CORE.QUESTION_BANK,
    version: "6"
  };

  /* 服务端可用时以前后端同一份规则计算；连不上就用页面内的同一份内核，结果口径一致。 */
  window.FolioEvidence.call = function (name, payload) {
    var path = "/api/" + name;
    return fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload || {})
    })
      .then(function (r) { return r.json(); })
      .then(function (d) { return d && d.ok ? d.data : null; })
      .catch(function () { return null; });
  };
})();

