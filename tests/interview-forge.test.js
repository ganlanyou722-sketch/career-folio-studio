/**
 * interview-forge 单元测试（node:test，无第三方依赖）
 * 运行：node --test tests/interview-forge.test.js
 */
const test = require("node:test");
const assert = require("node:assert");
const F = require("../web/shared/interview-forge.js");

const REQS = [
  "负责用户反馈的归纳与试用组织，输出迭代建议",
  "熟悉数据分析，能用指标验证结果",
  "有跨部门协作经验，能推动落地上线",
  "加分项：有内容运营经验",
];

const FACTS = [
  {
    id: "e1",
    title: "校园二手交易小程序",
    role: "产品负责人",
    action: "组织 3 轮用户访谈，归纳 27 条反馈，砍掉两个功能，推动开发上线",
    result: "试用留存从 12% 提升到 34%，覆盖 420 名学生",
    reflection: "如果重来，我会先做小范围灰度再全量",
    sourceId: "m1",
  },
  {
    id: "e2",
    title: "暑期运营实习",
    action: "负责社群日常答疑，整理 FAQ",
    result: "",
    sourceId: "m2",
  },
];

function packOf(extra) {
  return F.buildQuestionPack(
    Object.assign({ role: "产品运营实习生", company: "云序科技", requirements: REQS, facts: FACTS }, extra || {}),
  );
}

test("题库：五类配额 10 题，缺口语义另计", () => {
  const pack = packOf();
  assert.equal(pack.meta.baseCount, 10);
  assert.ok(pack.questions.length >= 10);
  const cats = {};
  pack.questions.filter((q) => !q.unsupported).forEach((q) => (cats[q.category] = (cats[q.category] || 0) + 1));
  assert.deepEqual(cats, { fact: 2, depth: 3, collab: 2, result: 2, transfer: 1 });
});

test("题库：must-have 覆盖率结构性 100%，gap 题标 unsupported", () => {
  const pack = packOf();
  assert.equal(pack.coverage.rate, 1);
  const unsupported = pack.questions.filter((q) => q.unsupported);
  assert.ok(unsupported.length >= 1, "至少一条必备要求没有事实支撑");
  unsupported.forEach((q) => {
    assert.equal(q.category, "fact");
    assert.ok(q.jdLink.requirement.length > 0);
  });
});

test("题库：同输入两次生成完全一致（跨轮可比较）", () => {
  const a = JSON.stringify(packOf());
  const b = JSON.stringify(packOf());
  assert.equal(a, b);
});

test("题库：每题七字段齐全", () => {
  const pack = packOf();
  pack.questions.forEach((q) => {
    assert.ok(q.question && q.whyAsked, "题面与为什么问");
    assert.ok(q.jdLink && typeof q.jdLink.requirement === "string");
    assert.ok(q.answerSkeleton && q.answerSkeleton.s30 && q.answerSkeleton.s120, "答案骸架");
    assert.ok(q.bars.L1 && q.bars.L4, "BARS 四档");
    assert.equal(q.probes.length, 2, "两层追问");
    assert.ok(q.redFlags.length >= 2, "红旗答案");
    assert.ok(q.evidenceTokens.length > 0, "必答信息点");
  });
});

test("题库：无事实时不崩，给出补事实缺口", () => {
  const pack = F.buildQuestionPack({ role: "运营", requirements: REQS, facts: [] });
  assert.ok(pack.questions.length >= 10);
  assert.ok(pack.gaps.some((g) => g.type === "need_fact"));
});

test("故事线：缺字段写【待补】，不编事实", () => {
  const g = F.compileGoldenCase({ fact: FACTS[1], role: "产品运营实习生", requirements: REQS });
  assert.equal(g.ok, true);
  const missing = g.checks.missingSlots;
  assert.ok(missing.length >= 2);
  g.segments.forEach((s) => {
    if (s.missing.length) assert.ok(s.text.includes("【待补"), s.key + " 缺格必须用占位符");
  });
  assert.equal(g.status, "needs_work");
});

test("故事线：完整事实可判定为 ready，且证据锚点可核", () => {
  const complete = Object.assign({}, FACTS[0], { attribution: "需求梳理与访谈由我独立完成，开发由两位同学负责" });
  const g = F.compileGoldenCase({ fact: complete, role: "产品运营实习生", requirements: REQS });
  assert.equal(g.ok, true);
  assert.equal(g.status, "ready");
  assert.ok(g.checks.metrics >= 2, "至少两个数字");
  assert.ok(g.checks.speakSec <= 180, "总时长不超过 180 秒");
  g.segments.filter((s) => s.evidence).forEach((s) => assert.equal(s.evidenceOk, true));
  assert.ok(g.elevator.chars <= g.elevator.budgetChars);
  assert.ok(g.jdLinks.some((x) => x.strength === "direct"));
});

test("故事线：超预算给裁剪提示", () => {
  const long = {
    id: "e3",
    title: "长动作项目",
    scene: "当时团队只有三个人，预算被砍了一半，时间只有两周",
    action: "我先做了需求梳理和方案对比，然后把两个候选方案的成本、风险和上线时间逐项列出来跟三位同事对齐，接着推动跨部门的评审会、修改排期、跟进开发和测试、处理上线当天出现的两个问题、补写操作文档并安排一次交接说明，同时在评审会上逐条说明为什么砍掉第三个方案、它的成本高在哪里、以后什么条件下可以重新启用、如果客户坚持要加回来需要付出多少额外人力，最后整理了一版复盘记录并同步给团队，并且把每个方案的验收标准、谁来验收、验收不通过怎么回滚都写清楚，再和财务确认预算口径，和法务确认合同条款，和客服确认上线后的答疑话术，逐项过了一遍之后才定稿",
    result: "上线后转化率从 1.2% 到 3.4%",
  };
  const g = F.compileGoldenCase({ fact: long, role: "运营", requirements: REQS });
  assert.ok(g.checks.overSegments.length >= 1);
  assert.ok(g.segments.some((s) => s.overBudget && s.trimHint.includes("先删形容词")));
});

test("客观指标：填充词率与语速", () => {
  const m = F.objectiveMetrics("呢然后我就是说，我们做了一个事情，那个结果还不错", 10, 180);
  assert.ok(m.fillerCount >= 4);
  assert.ok(m.fillerRate > 0.03);
  assert.ok(m.tooShort);
});

test("打分：引用必须是逐字稿子串，对不上该维度计 0", () => {
  const pack = packOf();
  const q = pack.questions[0];
  const answer = "我在校园二手交易小程序里独立负责需求梳理，组织了 3 轮访谈，结果留存从 12% 提升到 34%。";
  const r = F.scoreAnswer({ question: q, answer, elapsedSec: 55 });
  r.evidence.forEach((e) => {
    if (e.verified) assert.ok(answer.includes(e.quote), "引用必须能在原文里找到");
    else assert.equal(r.dims[e.dim], 0, "无引用不给分");
  });
  assert.ok(r.score >= 0 && r.score <= 100);
  assert.ok(r.fixes.length > 0 && r.fixes.length <= 3);
});

test("打分：同一答案重复评，分数完全一致（极差 0 ≤ 5）", () => {
  const pack = packOf();
  const q = pack.questions.find((x) => x.category === "result");
  const answer = "结果是留存从 12% 到 34%，覆盖 420 名学生。我个人的贡献是设计了访谈提纲并归纳了 27 条反馈。";
  const a = F.scoreAnswer({ question: q, answer, elapsedSec: 60 });
  const b = F.scoreAnswer({ question: q, answer, elapsedSec: 60 });
  assert.equal(Math.abs(a.score - b.score), 0);
  assert.ok(a.dims.metric > 0.5, "有两个数字应拿到量化分");
});

test("教练：含糊回答触发追问，追问层数不超过 2", () => {
  const pack = packOf();
  const s = F.createCoachSession({ pack });
  const vague = "我们做了很多工作，我们一直在推进，我们最后也拿到了结果。";
  let r1 = s.submit(vague, { elapsedSec: 40 });
  assert.equal(r1.kind, "probe");
  assert.ok(r1.probe && r1.probe.question);
  assert.ok(r1.probe.question !== "还有呢");
  let again = "我们还是一起做的，我们都很努力，我们配合得不错。";
  let r2 = s.submit(again, { elapsedSec: 30 });
  let r3 = s.submit(again, { elapsedSec: 30 });
  assert.ok(["advance", "finish"].includes(r3.kind), "第三答不能再追问");
  assert.ok(s.current().followUpsLeft >= 0);
});

test("教练：答得扎实则直接推进，最终产出评分卡", () => {
  const pack = packOf();
  const s = F.createCoachSession({ pack, options: { maxFollowUps: 2 } });
  const good = "我在校园二手交易小程序里独立负责需求梳理，组织了 3 轮用户访谈，归纳 27 条反馈，砍掉两个功能；结果试用留存从 12% 提升到 34%，覆盖 420 名学生。";
  let out = s.submit(good, { elapsedSec: 70 });
  let guard = 0;
  while (out.kind !== "finish" && guard++ < 40) {
    if (out.kind === "probe") out = s.submit(good, { elapsedSec: 60 });
    else if (out.kind === "advance") out = s.submit(good, { elapsedSec: 60 });
    else break;
  }
  assert.equal(out.kind, "finish");
  assert.ok(out.scorecard.answered > 0);
  assert.ok(out.scorecard.overall > 0);
  assert.ok(out.scorecard.topFixes.length <= 3);
  assert.ok(out.scorecard.barsMix.L3 + out.scorecard.barsMix.L4 > 0);
});

test("教练：时长预算用完强制收尾", () => {
  const pack = packOf();
  const s = F.createCoachSession({ pack, options: { sessionBudgetSec: 120 } });
  const out = s.submit("我做了一个事情，结果还行。", { elapsedSec: 200 });
  assert.equal(out.kind, "finish");
  assert.ok(out.reason.includes("预算"));
});

test("闭环：改写不新增数字，只删填充词与重排", () => {
  const g = F.compileGoldenCase({ fact: FACTS[0], role: "运营", requirements: REQS });
  const pack = packOf();
  const s = F.createCoachSession({ pack });
  const out = s.finish();
  const im = F.improveScript({ goldenCase: g, scorecard: out.scorecard });
  assert.equal(im.ok, true);
  assert.equal(im.numbersAfter, im.numbersBefore, "不得新增数字");
  assert.ok(im.afterChars <= im.beforeChars);
  assert.ok(im.script.length > 0);
});
