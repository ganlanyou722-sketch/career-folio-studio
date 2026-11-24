/** Hosts the workbench and its same-origin evidence and AI endpoints. */
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const engine = require("../web/shared/evidence-core.js");

const HOST = process.env.HOST || "127.0.0.1";
const publicOrigin = process.env.PUBLIC_ORIGIN?.trim();
if (!["127.0.0.1", "::1", "localhost"].includes(HOST) &&
    (!process.env.CV_INVITE_CODE?.trim() || !publicOrigin || !publicOrigin.startsWith("https://"))) {
  throw new Error("对于外部部署，请设置 HTTPS PUBLIC_ORIGIN 和 CV_INVITE_CODE。");
}

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
    version: 6,
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
    "x-content-type-options": "nosniff",
    "cache-control": "no-store",
  });
  res.end(body);
}

function readBody(req, maximum = 2_000_000) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maximum) {
        chunks.length = 0;
        reject(Object.assign(new Error("提交内容过大，请缩小文件范围。"), { status: 413 }));
      } else {
        chunks.push(chunk);
      }
    });
    req.on("end", () => {
      if (size > maximum) return;
      try {
        resolve(size ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {});
      } catch {
        reject(Object.assign(new Error("请求格式无效。"), { status: 400 }));
      }
    });
    req.on("error", reject);
  });
}

function serveStatic(req, res) {
  let urlPath;
  try { urlPath = decodeURIComponent((req.url || "/").split("?")[0]); }
  catch { return send(res, 400, { ok: false, error: "invalid path" }); }
  const target = path.resolve(ROOT, "." + (urlPath === "/" ? "/index.html" : urlPath));
  if (!target.startsWith(ROOT + path.sep)) return send(res, 403, { ok: false, error: "forbidden" });
  fs.stat(target, (err, stat) => {
    if (err || !stat.isFile()) return send(res, 404, { ok: false, error: "not found" });
    res.writeHead(200, {
      "content-type": MIME[path.extname(target)] || "application/octet-stream",
      "cache-control": "no-store",
    });
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(target).on("error", () => res.destroy()).pipe(res);
  });
}

const aiService = import("./ai.mjs").then(({createAI}) => createAI());
let active = 0;

function sameOrigin(req) {
  if (req.headers["sec-fetch-site"] === "cross-site") return false;
  if (publicOrigin) return req.headers.origin === publicOrigin;
  return req.headers.origin === "http://" + req.headers.host;
}

async function serveAI(req, res, pathname) {
  const ai = await aiService;
  if (pathname === "/api/ai/status" && req.method === "GET") return send(res, 200, { ok: true, data: ai.status() });
  if (req.method !== "POST" || !sameOrigin(req) || !req.headers["content-type"]?.startsWith("application/json")) {
    return send(res, 403, { ok: false, error: "请从工作台页面发起请求。" });
  }
  const extract = pathname === "/api/ai/extract";
  if (!extract && pathname !== "/api/ai/tailor") return send(res, 404, { ok: false, error: "接口不存在。" });
  ai.authorize(req.headers["x-folio-invite"]);
  if (active >= 3) return send(res, 429, { ok: false, error: "当前处理人数较多，请稍后重试。" });
  active++;
  try {
    const body = await readBody(req, extract ? 11_200_000 : 210_000);
    const result = await (extract ? ai.readDocument(body) : ai.tailor(body));
    return send(res, 200, { ok: true, data: result });
  } finally {
    active--;
  }
}

const server = http.createServer(async (req, res) => {
  const pathname = (req.url || "/").split("?")[0];
  if (pathname.startsWith("/api/ai/")) {
    try { return await serveAI(req, res, pathname); }
    catch (error) {
      return send(res, error.status || 500, {
        ok: false, error: error.status ? error.message : "处理材料时遇到问题，可以重试。",
      });
    }
  }
  if (pathname.startsWith("/api/")) {
    res.setHeader("access-control-allow-origin", "*");
    res.setHeader("access-control-allow-headers", "content-type");
    res.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
    if (req.method === "OPTIONS") return send(res, 204, {});
  }
  const handler = routes[req.method + " " + pathname];
  if (handler) {
    try {
      const body = req.method === "POST" ? await readBody(req) : {};
      return send(res, 200, { ok: true, data: handler(body) });
    } catch (error) {
      return send(res, error.status || 400, { ok: false, error: String(error.message || error) });
    }
  }
  if (pathname.startsWith("/api/")) return send(res, 404, { ok: false, error: "unknown endpoint" });
  if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, { ok: false, error: "method not allowed" });
  serveStatic(req, res);
});

server.listen(PORT, HOST, () => console.log("履历间运行于 " + HOST + ":" + PORT));
