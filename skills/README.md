# 工作台技能

每个工作台都有独立的技能目录。一个目录可以容纳多套写作或分析方法，在调用时按模块和技能名选择。

| 模块 | 职责 | 已收录 |
| --- | --- | --- |
| `experience` | 材料核对、经历整理与事实提取 | [经历事实归档](experience/experience-evidence-cn/SKILL.md) |
| `match` | 解析 JD、匹配证据与岗位比较 | [岗位证据匹配](match/job-evidence-match-cn/SKILL.md) |
| `resume` | 简历起稿、定向改写与版式 | [简历内容优化](resume/resume-content-cn/SKILL.md)、[中文产品经理排版 v1.1](resume/chinese-product-manager-cv/SKILL.md) |
| `interview` | 面试问题、追问、STAR 案例与反问 | 独立 skill 待添加，可参考[上游交接样例](match/job-evidence-match-cn/examples/match.json) |

## 加入一个技能

1. 在对应模块下新建一个包目录，例如 `skills/interview/star-case/`。
2. 在此目录创建 `SKILL.md`，写入名称、用途和实际操作说明。
3. 将配套规范、样例或脚本放在同一包里，在说明中使用相对链接。
4. 从仓库根目录运行 `node tools/skills.mjs check` 和 `node tools/skills.mjs list interview`，确认名称和引用。

```markdown
---
name: star-case
description: 根据用户确认的经历组织面试案例与追问。
---

# STAR 案例

先核实个人承担的工作，再从已确认事实中提取行动与结果。
```

模块下的每个非隐藏子目录代表一个独立包。模块内的 `name` 必须唯一，调用时使用其精确值。修改说明、增加或替换技能包后，下次调用会重新读取目录。

## 从命令行或服务端读取

```sh
node tools/skills.mjs list
node tools/skills.mjs list resume
node tools/skills.mjs show resume chinese-product-manager-cv
node tools/skills.mjs check
node --test tools/skills.test.mjs
```

```js
import { listSkills, loadSkill } from './tools/skills.mjs';

const candidates = listSkills('resume');
const skill = loadSkill('resume', 'chinese-product-manager-cv');
// skill.content 是完整 SKILL.md，skill.directory 是配套文件的根目录。
```

读取器仅使用 Node.js 内置模块。调用方负责选择模型、传入当前用户确认的材料并执行生成。现有产品经理技能所附 PDF 排版脚本另需 Python、ReportLab 和约定字体，详见[制作与检查](resume/chinese-product-manager-cv/references/build-and-check.md)。

## 检查范围

`check` 读取每个包的 `name`、`description` 和所有 Markdown 文件，检查重复名称以及普通行内链接、图片与链接引用定义的包内文件目标。路径相对于写出链接的文档，资源名含空格或括号时请用尖括号包裹。代码块中的命令、示例输入的路径和资源具体内容由该技能的制作流程检查。外部网页和页内锚点不发起请求。frontmatter 的两个必需字段支持单行文本、引号文本、`|` 与 `>` 多行文本。
