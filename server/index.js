/**
 * 履历间 v2 · 证据服务
 * 运行：node server/index.js [--port 4399]
 * 作用：把证据引擎（与前端同一份规则）暴露成 HTTP 接口，并顺带提供静态站点。
 * 纯 Node 内置模块，无第三方依赖；部署到 GitHub Pages 时前端自动降级为本地计算。
 */
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const engine = require("../web/shared/evidence-core.js");

const ROOT = path.resolve(__dirname, "..", "web");
const PORT = Number(
  (process.argv.find((a) => a.startsWith("--port=")) || "").split("=")[1] ||
    process.env.PORT ||
    4399,
);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

const routes = {
  "GET /api/health": () => ({
    ok: true,
    service: "career-folio-evidence",
    version: 3,
    engine: "shared/evidence-core.js",
    endpoints: [
      "POST /api/risk/scan",
      "POST /api/jd/parse",
      "POST /api/match",
      "POST /api/resume/audit",
      "POST /api/interview/diagnose",
      "POST /api/library/audit",
      "POST /api/ledger",
      "POST /api/radar",
      "POST /api/interview/review",
    ],
    rules: engine.RISK_RULES.length,
  }),
  "POST /api/risk/scan": (body) => engine.scanRisk(body.text || ""),
  "POST /api/jd/parse": (body) => engine.parseJD(body.text || ""),
  "POST /api/match": (body) => engine.matchAll(body.requirements || [], body.experiences || []),
  "POST /api/resume/audit": (body) =>
    engine.auditResume(body.blocks || [], body.requirements || [], body.experiences || []),
  "POST /api/interview/diagnose": (body) =>
    engine.diagnoseAnswer(body.question || "", body.answer || ""),
  "POST /api/library/audit": (body) =>
    engine.libraryAudit(body.materials || [], body.experiences || []),
  "POST /api/ledger": (body) => engine.buildLedger(body || {}),
  "POST /api/radar": (body) =>
    engine.radarDims({
      blocks: body.blocks || [],
      requirements: body.requirements || [],
      materials: body.materials || [],
    }),
  "POST /api/interview/review": (body) => engine.reviewAnswer(body || {}),
};

function send(res, code, payload, type = "application/json; charset=utf-8") {
  const body = type.includes("json") ? JSON.stringify(payload) : payload;
  res.writeHead(code, {
    "content-type": type,
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "cache-control": "no-store",
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 2e6) reject(new Error("body too large"));
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("invalid json"));
      }
    });
    req.on("error", reject);
  });
}

function serveStatic(req, res) {
  const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  const target = path.join(ROOT, urlPath === "/" ? "index.html" : urlPath);
  if (!target.startsWith(ROOT)) return send(res, 403, { ok: false, error: "forbidden" });
  fs.stat(target, (err, stat) => {
    if (err || !stat.isFile()) return send(res, 404, { ok: false, error: "not found" });
    res.writeHead(200, {
      "content-type": MIME[path.extname(target)] || "application/octet-stream",
      "cache-control": "no-store",
    });
    fs.createReadStream(target).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  const pathname = (req.url || "/").split("?")[0];
  if (req.method === "OPTIONS") return send(res, 204, {});
  const handler = routes[req.method + " " + pathname];
  if (handler) {
    try {
      const body = req.method === "POST" ? await readBody(req) : {};
      return send(res, 200, { ok: true, data: handler(body) });
    } catch (error) {
      return send(res, 400, { ok: false, error: String(error.message || error) });
    }
  }
  if (pathname.startsWith("/api/")) return send(res, 404, { ok: false, error: "unknown endpoint" });
  serveStatic(req, res);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("履历间 v2 证据服务已启动");
  console.log("  站点  http://127.0.0.1:" + PORT + "/");
  console.log("  健康  http://127.0.0.1:" + PORT + "/api/health");
  console.log("  规则  " + engine.RISK_RULES.length + " 条风险词库 + JD/简历/面试四类分析");
});
