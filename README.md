# 履历间 · 中文求职工作台

一个桌面优先的求职前端。四个工作台围绕同一份经历材料，串起资料整理、岗位比较、简历编辑与面试准备。

直接在浏览器打开 [web/index.html](web/index.html) 即可体验。也可以在仓库根目录运行下列命令，再访问 `http://127.0.0.1:4398`。

```sh
python -m http.server 4398 --bind 127.0.0.1 --directory web
```

## 版本 1 / 2 / 3 / 4：四个版本随时互切

同一份站点保留四个版本，切换不重装、不丢数据。

| 版本 | 入口 | 有什么 |
| --- | --- | --- |
| 版本 4（默认，三卡版） | [web/index.html](web/index.html) | 一屏三个入口：贴 JD 出风险台账、贴简历出缺口清单、贴回答出改写稿 |
| 版本 3（证据链） | [web/__v3__/index.html](web/__v3__/index.html) | 三条链路挂在原工作台的四个面板上，信息更全，入口更深 |
| 版本 2（证据版） | [web/__v2__/index.html](web/__v2__/index.html) | 四个工作台上的第一层核验面板：经历体检、岗位核验、投递自检、回答诊断 |
| 版本 1（原始版） | [web/__v1__/index.html](web/__v1__/index.html) | 与第一版完全一致的界面，未改动任何逻辑 |

- 版本 4 顶部是 `V1 | V2 | V3 | V4` 分段切换，点哪个到哪个。
- 三个旧版本都冻结成了快照，右下角有版本坞，可以直接跳回版本 4 或相邻版本。
- 四个版本共用同一份浏览器存储（`folio.v1.*`），切换后材料、经历、JD、简历稿、复盘记录都还在。

### 版本 4 做了什么：三个入口对应三个痛点

版本 3 的问题是「能力都在，但入口太深」：岗位核验要先在工作台里选好目标岗位，才有台账。版本 4 把这件事拆平，一屏三张卡，每张卡都是一个「贴一段文字 → 出结果」的动作，不需要登录、不需要预填、不需要先选岗位。

| 入口 | 对应痛点 | 输入 | 结果呈现 |
| --- | --- | --- | --- |
| 01 看清对方 | 看不清对方 | JD 原文（可加公司材料） | 一句结论（先问清 / 可以谈 / 没看到条款）、证据覆盖率、L1/L2/L3 着色信号清单、每条原句 + 当面问法、一页式风险卡片 |
| 02 说清自己 | 说不清自己 | JD + 简历段落 | JD 覆盖度、逐条对照表（要求 / 对应段落 / 判定）、五维雷达（每维附依据）、按优先级排的缺口清单 |
| 03 留下证据 | 留不下证据 | 题目 + 口述回答 | 当前分与改写后预估分、S/T/A/R 四格、缺格提示、STAR 改写稿、追问预测、核实等级、可导出的证据台账 |

三个入口都能一键用示例跑一遍，也可以直接把示例链接发给别人：

- 示例 · 识坑核验 `?demo=check`
- 示例 · 简历对照 `?demo=align`
- 示例 · 面试复盘 `?demo=proof`

### 版本 3 做了什么

三条链路都遵循同一句话：**结论必须能指回原文**。

| 链路 | 输入 | 产出 | 面板上的指标 |
| --- | --- | --- | --- |
| 岗位反向尽调 | JD + 公司材料 | 证据台账、L1/L2/L3 风险分级、可当面问的话术、一页式风险卡片 | 证据覆盖率、风险命中数、误伤率（待标注样本）、报告采纳率（待测） |
| 简历–JD 证据对照 | JD + 简历稿 + 材料库 | 逐条对照表、匹配雷达（每维附依据）、按优先级排的缺口清单、对齐建议 | JD 覆盖度、证据缺口数、无出处段落数、建议采纳率（待测） |
| 面试复盘证据链 | 题目 + 口述回答 | 逐题诊断卡、STAR 改写稿、追问预测、核实等级分布 | 当前分 / 改写后预估分、缺格数、面经可溯源比例 |

口径说明：识别准确率、误伤率、采纳率这些指标必须在真实标注样本上测算，界面里标"待测"的地方就是还没算，不做预填。改写后的分数标的是"预估"，不冒充实测。

### 连服务端运行

证据计算有两种跑法：只起静态服务时在前端本地算；起 Node 服务则前后端共用同一份规则。

```sh
node server/index.js          # 默认 127.0.0.1:4399
```

```sh
curl -s http://127.0.0.1:4399/api/health
curl -s -X POST http://127.0.0.1:4399/api/risk/scan -H "content-type: application/json" -d '{"text":"接受大小周，试用期不缴社保，入职需缴纳培训费 2000 元"}'
```

接口包括 `/api/health`、`/api/risk/scan`、`/api/jd/parse`、`/api/match`、`/api/resume/audit`、`/api/interview/diagnose`、`/api/library/audit`，以及版本 3 新增的 `/api/ledger`、`/api/radar`、`/api/interview/review`。前端启动时会探活，连不上服务端就自动回落到本地计算，所以纯静态部署也有完整功能。

## 代码与技能位置

| 工作台 | 前端代码 | 可替换的技能包 |
| --- | --- | --- |
| 个人经历台 | [web/modules/experience](web/modules/experience/) | [skills/experience](skills/experience/) |
| 岗位匹配台 | [web/modules/match](web/modules/match/) | [skills/match](skills/match/) |
| 简历优化台与版本仓库 | [web/modules/resume](web/modules/resume/) | [skills/resume](skills/resume/) |
| 面试打磨台 | [web/modules/interview](web/modules/interview/) | [skills/interview](skills/interview/) |

方向与任务选择在 [web/modules/start](web/modules/start/)。工作台导航、本机数据读写、共用视图和插画在 [web/shared](web/shared/)。PPTX 导出组件及第三方许可在 [web/vendor](web/vendor/)。页面关系、事实追溯和版本要求见[原始 PRD](docs/PRD-v1.0.md)。

## 协作时怎样换 skill

每项技能独占一个目录。仓库已包含 [chinese-product-manager-cv](skills/resume/chinese-product-manager-cv/SKILL.md)，其余三个插槽可直接放入新包。

- **调整已有方法**可修改包内的 `SKILL.md` 和配套资源。保留模块及 frontmatter 中的 `name`，现有调用方下次读取时就能拿到新内容。
- **增加平行方案**可在同一个模块下新建另一个包，例如 `skills/resume/finance-analyst-cv/SKILL.md`。为它设置独立的 `name`，两种方法可以共存。
- **提交前核对**可以用下列命令检查包名和资源链接。读取器每次从目录发现包，无需手工维护清单。

```sh
node tools/skills.mjs list
node tools/skills.mjs show resume chinese-product-manager-cv
node tools/skills.mjs check
node --test tools/skills.test.mjs
```

调用接口和新增包示例见 [skills/README.md](skills/README.md)。团队成员可用各自的分支提交 skill 修改，在 Pull Request 中附上一组虚构输入和预期变化，方便其他人复核。

## 当前可用的交互

资料支持拖入归档、悬停抽页、原文核对与经历关联。多个 JD 以塔罗暗纹牌呈现，分析后按偏好和经历证据排序。简历可编辑、撤销、预览文字改写，点击定稿后会保存带喷雾动效的版本快照。PPTX 可编辑，PDF 通过浏览器打印保存。面试准备可以绑定指定岗位和简历修订。

版本 2 在四个工作台上各加了一层核验面板，原则是「每条结论都能指回原文」：

- **经历体检**：材料已核对率、经历挂原件率、可量化率，逐条列出待核对材料与缺数字的经历。
- **岗位核验**：13 条风险规则分 L1/L2/L3，命中处引用 JD 原句并给出可以当面问的问法，再按证据强弱排出优先补的缺口。
- **投递自检**：JD 覆盖率、无出处段落、缺数字段落与未覆盖清单，可一键复制成自检报告。
- **回答诊断**：粘贴口述回答，按 STAR 四格拆解、判定有无量化、给分并预测三条追问；结果只留本机。

前端内置标明来源的演示数据。上传原件保存在当前浏览器的 IndexedDB，工作稿和选项保存在 localStorage。匹配和文字预览目前使用浏览器本地规则。服务端可通过 [tools/skills.mjs](tools/skills.mjs) 的 `loadSkill(module, name)` 读取技能内容，再交给选定的模型。替换 skill 会更新读取结果，模型调用尚待接入。
