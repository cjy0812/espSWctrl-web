# Cloudflare Workers 部署

本项目使用现有 Worker `espswctrl-web` 托管 Vite 生成的静态资源，不创建 Pages 项目，也不在仓库中保存 broker 凭据。

## 资源配置

- Worker：`espswctrl-web`
- 自定义域名：`esp32.canghaizhifeng.eu.org`
- 构建命令：`pnpm build`
- 静态资源目录：`dist`
- SPA fallback：`single-page-application`
- 安全响应头：`public/_headers`

## GitHub Actions 自动部署

`Web CI` 在 main 上成功后，`Deploy Cloudflare Worker` 会检出同一提交、安装锁定依赖、构建并通过 Wrangler 发布到已有 Worker。

在 GitHub 仓库 Settings → Secrets and variables → Actions 中配置：

1. Repository secret：`CLOUDFLARE_API_TOKEN`，创建一个仅具备目标账户 Workers Scripts:Edit（Workers Scripts Write）权限的 API Token。
2. Repository variable：`CLOUDFLARE_ACCOUNT_ID`，填 Cloudflare 账户 ID。

不要把 Token 放进仓库、工作流明文或聊天。首次配置后，可在 Actions 中手动运行 `Deploy Cloudflare Worker`；后续 main CI 成功会自动部署。

## GitHub Actions 凭据

部署工作流只需要更新已经存在的 Worker，不需要创建 Worker。建议创建一个 API Token，并把权限限制到目标资源：

- Account / Workers：对单个 Worker `espswctrl-web` 授予 **Editor**（旧权限界面对应 Workers Scripts:Edit / Write）。
- API Token 的资源范围只选当前 Cloudflare 账户和该 Worker，不要使用 Global API Key。
- Repository secret `CLOUDFLARE_API_TOKEN`：保存该 Token。
- Repository variable `CLOUDFLARE_ACCOUNT_ID`：值为 Cloudflare Account ID。

参考 Cloudflare 的 [Workers roles and permissions](https://developers.cloudflare.com/workers/authorization/workers/)：部署已有 Worker 需要该 Worker 的 Editor；若由部署命令同时修改 Custom Domain/Route，还需要对应 Zone 的 Workers Routes Write。本仓库工作流不在部署步骤里改域名绑定，因此 Token 不必为此额外扩大权限。

## 本地部署

安装依赖后执行：

```sh
pnpm build
pnpm dlx wrangler@4.167.0 deploy --config wrangler.jsonc
```

Wrangler 从环境变量 `CLOUDFLARE_API_TOKEN` 与 `CLOUDFLARE_ACCOUNT_ID` 读取认证信息。

## 安全说明

- CSP 限制脚本来源为同源，允许 MQTT over WebSocket（`wss:`），并禁止对象、嵌入式 frame。
- Naive UI/Vue 使用运行时内联样式，因此 `style-src` 保留 `'unsafe-inline'`；脚本策略不允许内联脚本。
- `connect-src` 允许同源和 WSS，不允许明文 WS。
- 前端 MQTT 凭据仍由浏览器端按应用现有策略存储；任何 broker 账号都不写入构建环境或仓库。
- 自动部署只在 Web CI 成功后运行，不会调用 MQTT 探测脚本，也不会发送电源按键命令。
