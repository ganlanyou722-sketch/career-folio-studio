# 面试工坊 · Interview Forge（V7）

「面试打磨台」4.2 小节的落地代码：把简历事实编译成**项目题库 → 三分钟故事线 → 数字教练对练 → 改法回写口述稿**，一个闭环。

只依赖仓库里已有的 `web/shared/evidence-core.js` 与 `window.FolioViews`，不引入第三方库，不调用外部模型。纯规则先跑通闭环，模型只作为可选增强。

## 为什么这样做

V6 的面试页有三个结构性缺口，直接影响「练了有没有用」：

1. 题目：`interviewQuestions()` 硬编码 3 条模板，靠岗位正则挑一个焦点词，与事实、量化项无绑定。
2. 故事：`整理口述稿` 只是把四个 STAR 输入框的文本用句号拼接，没有时长预算、没有岗位关联、没有证据锚点。
3. 练习：作答只落在 textarea 存本机草稿；`EvidenceCore.reviewAnswer` 早就能给分，但页面从未调用。

所以 V7 的规则是：**题目从事实 × 岗位推出来；故事线只重排事实、不新增事实；打分必须引用原话，引用对不上就不给分。**

## 文件

| 文件 | 作用 |
|-|-|
| `web/shared/interview-forge.js` | 引擎（纯函数，UMD）：题库、故事线、客观指标、打分、教练状态机、口述稿改写 |
| `web/modules/interview/coach.js` | 「模拟面试」页签的前端：题目侧栏、作答、实时指标、追问、评分卡、回写口述稿 |
| `web/modules/interview/index.js` | 原页面，新增第 5 个页签与一处分发（其余未改） |
| `server/index.js` | 新增 4 个接口，版本号 6 → 7 |
| `tests/interview-forge.test.js` | 15 条 `node:test` 用例，无第三方依赖 |

## 引擎接口

```js
const F = InterviewForge;

F.buildQuestionPack({ role, company, requirements, facts });
F.compileGoldenCase({ fact, role, requirements, durationSec });
F.objectiveMetrics(answer, elapsedSec, budgetSec);
F.scoreAnswer({ question, answer, elapsedSec, budgetSec });
F.createCoachSession({ pack, options });
F.improveScript({ goldenCase, scorecard });
F.verifyQuote(quote, source);
```

### buildQuestionPack

- 五类配额：事实核验 2、深度追问 3、协作冲突 2、结果量化 2、迁移假设 1，共 10 题（`meta.baseCount`）。
- must-have 要求若没有任何事实支撑，另出「缺口题」，`unsupported: true`，另计（`meta.gapCount`）。
- 每题固定七个字段：`question / whyAsked / jdLink / factLink / answerSkeleton(30/60/120) / bars(L1–L4) / probes(两层) / redFlags / evidenceTokens`。
- 同输入两次生成完全一致（事实按相关度、再按 id 排序），因此跨轮分数可比。
- `coverage.rate` 是 must-have 覆盖率，结构性为 100%；`gaps` 给出 `need_fact` / `need_jd` / `need_metric` 三类补料任务。

### compileGoldenCase

- 五段：0–15 钩子、15–45 背景、45–90 动作与取舍、90–150 结果与归因、150–180 反思与迁移。
- 每段按 `4.5 字/秒` 折算字符预算（180 秒共 810 字），超预算标 `overBudget` 并给裁剪提示。
- 字段缺失写 `【待补：…】`，同时进 `checks.missingSlots` 与 `tasks`，可转成补事实任务；**不生成用户没说过的事实**。
- `segments[i].evidence` 指向具体字段与原文片段，`evidenceOk` 用 `verifyQuote` 校验。
- `jdLinks` 给出每段与哪条岗位要求关联、强度是 `direct / partial / none`。
- `status`：`ready` 需同时满足「不超预算 + 无缺格 + 至少 2 个数字」。

### scoreAnswer

五个维度，权重 22/20/20/18/20：

| 维度 | 计算 |
|-|-|
| 事实准确 | 必答信息点在答案里的覆盖率（`evidenceTokens`），「我们」≥3 次且「我」≤1 次时判归属不清 |
| 结构完整 | STAR 四要素覆盖（S/T/A/R） |
| 量化密度 | 0 个数字 0；1 个 0.6；≥2 个 1 |
| 岗位关联 | 答案对 `jdLink.requirement` 关键词的命中 |
| 表达收敛 | 填充词率、超时、语速（3.2–5.2 字/秒）、过短或过长扣分 |

强制规则：**每个维度必须能摘出一句原文作为引用，`verifyQuote` 不通过则该维度计 0**，`confidence` 降为 `low`。分数落 BARS 档（≥82 L4，68–81 L3，52–67 L2，其余 L1），档位给出下一轮练什么。

### createCoachSession

- 五态：提问 → 作答 → 判定 → 追问或推进 → 收尾。
- 硬预算写进状态机：`maxFollowUps=2`、`answerBudgetSec=180`、`sessionBudgetSec=2700`、`maxRounds=24`，超预算强制收尾。
- 追问三条触发（优先级从高到低）：证据缺位（覆盖率低于阈值）、归属不清、结果无量化或缺基线、缺目标与取舍。
- 每次追问返回 `{gap, gapText, question, level}`，界面显示「在考哪一格」，而不是笼统的「还有呢」。
- `submit()` 返回 `probe / advance / finish / reject` 四种；`finish()` 产出评分卡：总分、五维均值、BARS 分布、追问次数、平均用时、Top3 改法。

### improveScript

- 只做删填充词、拆长句、标缺格，**不新增任何数字或事实**（测试断言 `numbersAfter === numbersBefore`）。
- 输出 `script` 供写回 STAR 案例页的「口述稿」，并带 `scriptV` 版本号，可与上一版对照。

## 服务端接口

```
GET  /api/health                 # 版本 7，列出全部端点
POST /api/interview/questions    # buildQuestionPack
POST /api/interview/story        # compileGoldenCase
POST /api/interview/coach        # scoreAnswer（单题即时评分）
POST /api/interview/script       # improveScript
```

前端在无服务端时（GitHub Pages）直接用同一份引擎本地计算，口径一致。

## 验收对应

| 4.2 验收标准 | 对应用例 |
|-|-|
| must-have 覆盖率 100% | 题库覆盖率结构性 100% 用例 |
| 10 题生成快且两次结果一致 | 同输入两次生成完全一致 用例 |
| 超预算段数为 0，缺格全部【待补】 | 故事线 ready / 待补 / 超预算 三条用例 |
| 同答案重复评极差 ≤5 | 重复评分数完全一致 用例 |
| 证据引用 100% 可在逐字稿找到 | 引用必须是子串、对不上计 0 用例 |
| 追问 100% 归到三类缺口之一 | 含糊回答触发追问、追问 ≤2 层 用例 |
| 改写不新增事实 | 改写不新增数字 用例 |

## 本地运行

```bash
node --test tests/interview-forge.test.js   # 15 条用例
node server/index.js --port=4399            # 起站点与接口
```

页面：`http://127.0.0.1:4399/` → 面试打磨台 → 第 5 个页签「模拟面试」。

## 可选增强（不在本版范围）

- 语音：接 Web Speech 或第三方 ASR，把 `elapsedSec` 换成真实时长，`fillerRate` 就能落到真停顿上。
- 模型：仅用于「把事实改写成更顺的口语」这一层；`scoreAnswer` 保持规则制，避免分数漂移。
- 双评：教练与压力面试官两个 prompt 各打一次分，差异超过 10 分时进人工复核队列。
