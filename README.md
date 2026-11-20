<div align="center">

# 履历间 · Career Folio Studio

**把散落的求职材料整理成可追溯到原件的「事实」，再用同一份事实出多个岗位的简历、准备面试。**

[**打开在线工作台 →**](https://chase1960.github.io/career-folio-studio/)　·　纯静态　·　无需注册　·　数据只留在你的浏览器

</div>

---

## 在线体验

**https://chase1960.github.io/career-folio-studio/**

> 发布说明：对外访问地址为上方链接（镜像仓库 chase1960/career-folio-studio，Pages 已开启）。主库 ganlanyou722-sketch/career-folio-studio 的 Pages 开启后，同路径地址同样生效。


打开即用。首次进入会载入一套示例数据（产品实习生、校园服务大赛、课程研究），可以随意试；点左下角「个人工作空间」里的清空入口即可回到空白。

所有资料只保存在**这台设备的浏览器**（`localStorage` + `IndexedDB`），不会上传，也不会跨设备同步。清缓存、换浏览器会丢，正式使用前请先导出留存。

## 它解决什么问题

求职真正难的不是「写」，而是三件反复消耗人的事：

- **材料散**：实习周报、竞赛 PPT、课程报告、旧简历各存一份，写的时候只记得做过、说不清自己做了什么。
- **比较慢**：同时投十几个岗位，每份 JD 措辞不同，靠肉眼判断「我够不够」既慢又讲不出理由。
- **复用到最后失忆**：每投一个岗就改一版，改到不知道哪版发给了谁，面试时对不上号。

履历间的做法不是「帮你写」，而是**先建账、再出稿**：原件和事实进经历台，岗位要求进匹配台，两者对上之后才在优化台出稿，导出与面试都绑定某个具体修订。

## 界面一览

| 工作台总览 | 个人经历台 |
|---|---|
| ![工作台总览](docs/preview/home.png) | ![个人经历台](docs/preview/library.png) |

| 岗位匹配台 | 简历优化台 |
|---|---|
| ![岗位匹配台](docs/preview/match.png) | ![简历优化台](docs/preview/resume.png) |

| 面试打磨台 | 简历仓库 |
|---|---|
| ![面试打磨台](docs/preview/interview.png) | ![简历仓库](docs/preview/versions.png) |

## 四个工作台

| 工作台 | 用户在这里做什么 | 留下什么 |
|---|---|---|
| **个人经历台** | 上传 PDF／PPTX／DOCX／图片原件，摘录原文，逐条核对「这是不是我做过的」 | 材料、原文摘录、经历与事实状态 |
| **岗位匹配台** | 粘贴或上传 JD，逐条确认必需项与加分项，比多个岗位的适配度 | 岗位、要求、匹配结论与依据 |
| **简历优化台** | 在 A4 画布上出稿；右侧打磨表达、追问结果，定稿后归档 | 工作稿、不可变修订版本 |
| **面试打磨台** | 绑定某个投递版本，准备预测问题、STAR 案例与反问 | 面试包 |

一条典型的完整路径：**选方向 → 收材料 → 比岗位 → 出稿 → 定稿 → 准备面试**。每一段都能单独进入，不必按顺序走完。

## 当前实现边界（请先读这一段）

这是 **v1 原型**，界面与数据合同已经跑通，能力边界如下：

- **纯前端**：没有后端、没有账号体系、没有云同步。仓库里没有模型调用。
- **匹配与文字整理是本地规则**：匹配用 14 组关键词域做子串比对（整句命中算「直接支持」，命中同义词算「部分支持」），覆盖率 =（直接 + 0.5×部分）÷ 明确要求数；「文字打磨」是正则去口头词与分条。换一种说法就可能失配，也不判断内容与岗位是否相关。
- **材料解析有限**：只有 TXT 会读正文；PDF／DOCX／PPTX 保存原件并靠手动摘录；JD 截图依赖浏览器 `TextDetector`，多数环境不可用，需要手动粘贴原文。
- **导出**：PDF 走浏览器打印（在打印对话框里选「另存为 PDF」）；PPTX 由 pptxgenjs 生成，每段文字都是可编辑文本框，但投递场景仍建议用 PDF。
- **公司动向**：需要手动录入标题、链接与日期，没有联网检索。

这些不是隐藏项，而是这一版真实能做到的边界；功能规划见 [`docs/PRD-v1.0.md`](docs/PRD-v1.0.md)。

## 本地运行

站点是纯静态的，没有构建步骤、没有依赖安装：

```bash
git clone https://github.com/ganlanyou722-sketch/career-folio-studio.git
cd career-folio-studio
python -m http.server 8000 --directory web
# 浏览器打开 http://127.0.0.1:8000/index.html
```

也可以直接双击 `web/index.html`。建议用本地服务器，`localStorage` 与 `IndexedDB` 的行为更接近线上。

## 目录结构

```
web/                    前端：index.html + shared/ + modules/ + vendor/
  modules/{experience,match,resume,interview,start}/   四个工作台 + 方向台
  shared/               shell、路由、存储、插画、任务视图
docs/
  PRD-v1.0.md           产品需求文档（12 章，含验收清单）
  preview/              界面截图
skills/                 可替换的方法论包
  resume/chinese-product-manager-cv/  写作框架 + 版式规范 + ReportLab 排版脚本
tools/skills.mjs        技能包读取器与校验（list / show / check）
```

方法论不只写在文档里：`skills/` 下的每个包都是独立目录，带 `SKILL.md`、规范与脚本，可以按模块替换。

```bash
node tools/skills.mjs list
node tools/skills.mjs check
node --test tools/skills.test.mjs
```

## 部署

`web/` 会被 GitHub Actions 构建并发布到 Pages：

```bash
# 仓库 Settings → Pages → Source 选择「GitHub Actions」
# 之后每次推送到 main，.github/workflows/deploy-pages.yml 会自动发布
```

## 协作约定

- 以 `main` 为发布分支，功能改动走 `feat/xxx` 分支 + PR，避免互相覆盖
- 提交前在本地跑一遍页面，确认四个工作台都能打开
- 修改 `skills/` 下的包后运行 `node tools/skills.mjs check`

## 说明

示例数据中的人名、公司、奖项均为虚构，仅用于演示结构。简历内容请务必使用自己的真实经历；产品在设计上不接受编造：每条事实都有来源引用与「材料明确／本人确认／待核实」状态，团队成果与个人动作分别记录。
