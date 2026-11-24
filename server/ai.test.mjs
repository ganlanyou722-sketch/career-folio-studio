import test from "node:test";
import assert from "node:assert/strict";
import { createAI } from "./ai.mjs";

const env = {
  CV_MODEL_ENDPOINT: "https://model.example.test/v1/chat/completions",
  CV_MODEL_NAME: "fixture",
  CV_MODEL_KEY: "test-key",
  CV_MODEL_VISION: "1",
};
const reply = body => new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(body)}}]}));
const jd = { role:"产品运营", text:"协助汇总试点反馈", requirements:["协助汇总试点反馈"] };
const blocks = [{id:"a", text:"团队试点期间，协助梳理20条反馈。"}, {id:"b",text:"参与撰写复盘。"}, {id:"c",text:"整理试用记录。"}];

test("reads current skills, validates evidence, then checks the surviving edits", async () => {
  const requests = [];
  const ai = createAI(env, async (_url, options) => {
    const message = JSON.parse(options.body).messages;
    requests.push(message);
    if (requests.length === 2) return reply({supported:["a"]});
    return reply({
      edits: [
        {id:"a", text:"协助梳理20条反馈，供团队试点复盘。", requirement:jd.text, evidence:"20条反馈", reason:"和反馈职责相关"},
        {id:"b", text:"主导撰写复盘。", requirement:jd.text, evidence:"撰写复盘", reason:"越界"},
        {id:"c", text:"归纳试用记录并跟进上线。", requirement:jd.text, evidence:"不存在的来源", reason:"越界"},
      ], questions:["你是否负责反馈分类？"],
    });
  });
  const result = await ai.tailor({jd,blocks});
  assert.match(requests[0][0].content, /中文简历内容优化/);
  assert.match(requests[0][0].content, /三个内容版本的取材/);
  assert.deepEqual(JSON.parse(requests[1][1].content).map(x => x.id), ["a"]);
  assert.equal(result.edits[0].evidence, "20条反馈");
  assert.equal(result.edits[0].original, blocks[0].text);
  assert.match(result.skillRevision, /^[\da-f]{12}$/);
});

test("checks availability and enforces invite, known structure and evidence", async () => {
  const ai = createAI({ ...env, CV_INVITE_CODE: "invite" }, async () => reply({ edits: [
    {id:"a", text:"协助梳理20条反馈，供团队试点复盘。", requirement:"未写到的资格", evidence:"试点", reason:"无依据"}
  ] }));
  assert.equal(ai.status().inviteRequired, true);
  assert.throws(() => ai.authorize("invalid"), {status:401});
  ai.authorize("invite");
  await assert.rejects(ai.tailor({jd,blocks:[]}), {status:400});
  assert.deepEqual((await ai.tailor({jd,blocks})).edits, []);
  assert.equal(createAI({}).status().available, false);
});

function buildPDF() {
  const stream = "BT /F1 16 Tf 30 220 Td (Evidence fixture resume) Tj ET";
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 300] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Length " + stream.length + " >>\nstream\n" + stream + "\nendstream"];
  let pdf = "%PDF-1.4\n";
  const offsets = [];
  objects.forEach((object, i) => {
    offsets.push(pdf.length);
    pdf += (i + 1) + " 0 obj\n" + object + "\nendobj\n";
  });
  return Buffer.from(pdf + "xref\n0 6\n0000000000 65535 f \n" +
    offsets.map(value => String(value).padStart(10, "0") + " 00000 n \n").join("") +
    "trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n" + pdf.length + "\n%%EOF\n");
}
test("PDF extraction reads real bytes even before the model is configured", async () => {
  const ai = createAI({});
  const result = await ai.readDocument({ name:"resume.pdf", data:buildPDF().toString("base64") });
  assert.match(result.text, /Evidence fixture resume/);
  await assert.rejects(ai.readDocument({name:"invalid.pdf",data:"YWJj"}), {status:415});
});

test("image transcription requires explicit vision setup and sends the uploaded image", async () => {
  const png = "89504e470d0a1a0a";
  const data = Buffer.from(png, "hex").toString("base64");
  const document = {name:"JD.png",data};
  await assert.rejects(createAI({}).readDocument(document), {status:422});
  const ai = createAI(env, async (_url, options) => {
    const input = JSON.parse(options.body).messages[1].content;
    assert.equal(input[1].image_url.url, "data:image/png;base64," + data);
    return reply({text:"每周至少三天\n熟悉 SQL 优先"});
  });
  assert.deepEqual(await ai.readDocument(document), {text:"每周至少三天\n熟悉 SQL 优先"});
});
