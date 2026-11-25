# 在腾讯云上发布履历间

用腾讯云 **CloudBase 云托管**运行仓库根目录的 Dockerfile。一个服务同时提供网页、文档解析和 AI 接口。

## 1. 创建服务

打开[腾讯云开发控制台](https://tcb.cloud.tencent.com/)，进入准备使用的云开发环境。选择 **云托管 → 新建服务**。

| 控制台选项 | 填写内容 |
| --- | --- |
| 服务名 | `career-folio-ai` |
| 代码来源 | Git 仓库部署，选择 `ganlanyou722-sketch/career-folio-studio` 和包含 AI 改动的分支。PR 合并前使用 `feature/skill-driven-ai-resume` |
| 上传代码包 | 控制台也支持上传部署 ZIP，确保压缩包打开后可以直接看到 `Dockerfile` |
| 目标目录和 Dockerfile | 仓库根目录与 `Dockerfile` |
| 容器监听端口 | `4399` |
| 访问类型 | WEB／公网 |
| 高级选项 | 启动命令沿用镜像默认配置。若可设置 HTTP 健康检查，将路径设为 `/api/health` |

首次部署后可用云托管的默认域名查看服务是否启动。使用默认域名做开发验证时，以控制台提示的访问方式和有效期为准。给他人持续分享网页时，在 **HTTP 网关**接入已备案的 HTTPS 自定义域名，把根路径 `/` 路由到此云托管服务，并保留 `/api/…` 等子路径。

[部署方式与配置](https://docs.cloudbase.net/run/deploy/deploy/introduce) · [自定义域名](https://docs.cloudbase.net/service/custom-domain) · [默认域名限制](https://docs.cloudbase.net/service/alias)

## 2. 填运行环境变量

进入服务的 **服务设置 → 环境变量**。填写并发布该版本。

| 变量名 | 填写内容 |
| --- | --- |
| `DEEPSEEK_API_KEY` | 你已有的 DeepSeek 密钥 |
| `CV_INVITE_CODE` | 为本次试用设置一个独立的随机体验码 |
| `PUBLIC_ORIGIN` | 体验者访问的完整 HTTPS 站点地址，例如 `https://folio.example.com`，只填域名和协议 |

云托管容器可先启动并通过健康检查。公网地址和体验码填齐后，服务才接收上传与 AI 请求。模型和 API 地址使用项目现有 DeepSeek 默认值。开发和生产可使用不同云环境及体验码。

## 3. 验证并分享

1. 打开站点的 `/api/health`，确认服务正常。查看 `/api/ai/status`，确认 `available` 为 `true`。
2. 用无痕窗口和虚构材料走一遍「上传简历 → 核对 JD → 生成建议 → 另存副本」，检查体验码有效、页面可加载，真实模型可以返回建议。
3. 将 HTTPS 地址和体验码发给测试者。DeepSeek 调用按模型账户用量计费，云托管费用以腾讯云控制台为准。

`available` 是本地配置状态。真实密钥权限和余额通过实际调用验证。处理一次模型任务的时间预算为 45 秒，适配云托管文档所列的 60 秒请求限制。[云托管使用限制](https://docs.cloudbase.net/run/limitation)
