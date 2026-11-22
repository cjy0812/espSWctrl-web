# CLAUDE.md

本文件是 Claude Code 的轻量入口。开始任务时先阅读仓库根目录的 `AGENTS.md`，再按任务需要查阅下方文档；不要把所有细节常驻上下文。

## 项目

ESP32-C3「电源键控制器」Web 客户端：Vue 3 + TypeScript + Pinia + Naive UI，浏览器经 MQTT over WebSocket 连接 broker。固件仓库是同级 `../espSWctrl`，两端只通过 MQTT 协议解耦。

## 必须先读

- **`AGENTS.md`**：仓库级硬约束、开发与验证流程（单一规则入口）。
- **`README.md`**：功能、安全边界、当前进度。
- 按任务读取：
  - `docs/architecture.md`：改协议、状态机、连接层或 UI 编排前。
  - `docs/decisions.md`：怀疑设计、排障或修改安全行为前。
  - `docs/plan.md`：排期或更新工作进度前。

## 常用命令

包管理器固定 pnpm（版本见 `package.json`），不要混用 npm/yarn。

```bash
pnpm install --frozen-lockfile
pnpm dev
pnpm typecheck
pnpm lint
pnpm test:unit
pnpm build
```

## 任务入口

按需使用项目 Skills（位于 `.claude/skills/`）：

- `mqtt-protocol`：协议、topic、payload、ack 与请求状态机。
- `frontend-debugging`：Vue/Pinia/Naive UI 功能缺陷定位与修复。
- `verification`：变更影响分析、自动化验证与交付检查。

Skills 是可复用工作流，不替代 `AGENTS.md` 中的强制规则。
