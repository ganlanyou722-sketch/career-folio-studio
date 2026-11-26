# 好好投 · 中文求职工作台

**第一份简历写得出，换个岗位改得准。**

正在找第一份实习？从课程项目、竞赛和校园实践里，找出高价值的经历，写成第一份简历。

同时看中几个岗位？上传原稿和岗位描述，让 AI 帮你找出每个岗位最值得突出的经历，再有针对性地调顺序、改措辞。离心仪岗位更进一步~

> **在线体验** [打开好好投](https://career-folio-ai-354091-10-1540952470.sh.run.tcloudbase.com)。材料和简历稿保留在当前浏览器，AI 改写需输入体验码。

本地开发需要 Node.js 22.15 或更新版本。在仓库根目录运行以下命令，并访问 `http://127.0.0.1:4399`。

```sh
npm ci
npm start
```

## 当前工作台

正式工作台和腾讯云发布使用 `main` 分支。浏览器入口在 [web/index.html](web/index.html)，Node 服务在 [server/index.js](server/index.js)。岗位匹配和服务端分析共用 [证据规则](web/shared/evidence-core.js)，文档解析与模型调用在 [server](server/)。

## 代码与技能位置

| 工作台 | 前端代码 | 可替换的技能包 |
| --- | --- | --- |
| 个人经历台 | [web/modules/experience](web/modules/experience/) | [skills/experience](skills/experience/) |
| 岗位匹配台 | [web/modules/match](web/modules/match/) | [skills/match](skills/match/) |
| 简历优化台与版本仓库 | [web/modules/resume](web/modules/resume/) | [skills/resume](skills/resume/) |
| 面试打磨台 | [web/modules/interview](web/modules/interview/) | [skills/interview](skills/interview/) |

方向与任务选择在 [web/modules/start](web/modules/start/)。工作台导航、本机数据读写、共用视图和插画在 [web/shared](web/shared/)。PPTX 导出组件及第三方许可在 [web/vendor](web/vendor/)。页面关系与事实追溯见[原始 PRD](docs/PRD-v1.0.md)。

## 协作时怎样换 skill

每项技能独占一个目录。2026-11-24 更新收录了经历事实归档、岗位证据匹配、简历内容优化和中文产品经理简历排版四套规则。面试打磨台可使用匹配结果中的交接数据，独立的面试 skill 仍预留。各包的适用范围和验收样例见[更新说明与接入验收](00-更新说明与接入验收.md)。

- **调整已有方法**可修改包内的 `SKILL.md` 和配套资源。保留模块及 frontmatter 中的 `name`，现有调用方下次读取时就能拿到新内容。
- **增加平行方案**可在同一个模块下新建另一个包，例如 `skills/resume/finance-analyst-cv/SKILL.md`。为它设置独立的 `name`，两种方法可以共存。
- **提交前核对**可以用下列命令检查包名和资源链接。读取器每次从目录发现包，无需手工维护清单。

```sh
node tools/skills.mjs list
node tools/skills.mjs show resume chinese-product-manager-cv
node tools/skills.mjs check
node --test tools/skills.test.mjs
```

调用接口和新增包示例见 [skills/README.md](skills/README.md)。已发布的修改统一从 `main` 读取。

## 当前可用的交互

资料支持拖入归档、悬停抽页、原文核对与经历关联。多个 JD 以塔罗暗纹牌呈现，分析后按偏好和经历证据排序。简历可编辑、撤销、预览文字改写，点击定稿后会保存带喷雾动效的版本快照。PPTX 可编辑，PDF 通过浏览器打印保存。面试准备可以绑定指定岗位和简历修订。

前端内置标明来源的演示数据。资料库原件保存在当前浏览器的 IndexedDB，工作稿和选项保存在 localStorage。

## 用自己的简历和 JD 生成建议

本地启用 AI 时，将 [.env.example](.env.example) 复制为 `.env`，填写 `DEEPSEEK_API_KEY` 后启动服务。

默认调用 DeepSeek 官方 Chat Completions 的 `deepseek-flash`，覆盖文字改写、事实复核和截图转录。可设置 `CV_MODEL_NAME=deepseek-v4-pro` 将文字改写和复核切换到 V4 Pro，截图仍交给 Flash。使用其他兼容服务时，填写其完整 `CV_MODEL_ENDPOINT`、`CV_MODEL_NAME` 和该服务自己的 `CV_MODEL_KEY`。使用 DeepSeek 以外的地址时，服务不会发送 `DEEPSEEK_API_KEY`。[DeepSeek 模型与价格](https://api-docs.deepseek.com/quick_start/pricing/)

1. 在简历优化台导入 PDF、DOCX、TXT 或图片，核对提取的原文，再创建可编辑底稿。PDF 有文字层时直接提取文字，扫描页与截图走视觉识别。导入后的版式采用工作台的 A4 画布，复杂文档的分栏顺序需要核对。
2. 在岗位匹配台上传或粘贴目标 JD。要转录图片，先勾选视觉识别。核对公司、岗位与要求，点击「据此去优化简历」。没有底稿时，填写简历后会回到同一个 JD。
3. 选择指定的工作稿或归档版本，查看原文、建议、对应 JD 要求、证据和理由。取消勾选不采纳的建议后保存岗位副本，可继续编辑或导出。原稿可在简历仓库通过「切换工作稿」找回。

每次生成都从磁盘读取最新的岗位匹配、简历内容与排版 skill 及配套规则。岗位副本保留底稿 ID、修订和 skill 内容指纹，已有的排版对象沿用所选底稿。姓名、联系方式栏、样式和历史版本无需提交给改写接口。模型接收所选正文和 JD；图片转录时会接收图片。服务在请求中处理材料，简历版本保存在使用者的浏览器。

### 分享给体验者

这个项目默认使用腾讯云 CloudBase 云托管。控制台可直接拉取 Git 仓库，也可上传基于仓库根目录打包的 ZIP。容器端口为 `4399`，使用 `/api/health` 检查服务。控制台字段、环境变量和公网域名配置见 [腾讯云部署说明](docs/cloudbase-deploy.md)。
