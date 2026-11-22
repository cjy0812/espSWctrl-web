# 实施计划

> 本文件是**工作计划**（阶段、验收、未决），不是 Claude Code 原生计划文件
> （原生 plan mode 的计划在 `~/.claude/plans/`）。
> 长期事实与决策见 `docs/architecture.md` 与 `docs/decisions.md`；指令入口见 `CLAUDE.md`。

## Context

espSWctrl 目前只能通过串口控制台操作设备（按键要发 MQTT、改配置要写 NVS）。目标：独立的 Vue 3 Web 客户端，先做「看状态 + 按电源键」，再补日志与参数展示。

**独立仓库**：固件仓库规则体系（`cargo-build.cmd`、`check-portability.py`、`docs/README.md` 职责表）都锚定在 `../espSWctrl`；前端混入只会增加门禁与文档成本。两端只靠 MQTT 协议解耦。

## 已确认决策

| 项 | 决定 |
|---|---|
| 仓库 | `G:\GitHub\ESP32\espSWctrl-web`（公开） |
| UI | **Naive UI 按需引入，禁止自定义 CSS** |
| 连接 | 浏览器 MQTT over WebSocket 直连；凭据默认 sessionStorage |
| client id | 固定 `pc01-controller`（ACL 按 client id 授权） |
| 功能优先级 | 状态 + 短按 > 日志 > 参数只读 |
| 长按 | MVP 不开放 |
| 部署 | Cloudflare Pages（未开始） |

**边界**：不改固件仓库；不扩展固件 MQTT 协议。

## 分阶段与状态

### 阶段 0（完成）

脚手架、`storage.ts`、`mqttService.ts`、连接 UI、`scripts/probe-broker.mjs`、`scripts/send-test.mjs`。

**已实测验收**（2026-11-22）：
- 三 topic 订阅各 `granted=1`，收到 retained `{"pc":"on"}` / `{"online":true}`。
- 发布 ACL 通：`pnpm mqtt:send --cmd on` 收到 `{"nonce":"","result":"unknown-cmd"}`（未按键）。

### 阶段 1（代码完成，待真机验收）

`protocol/`（topics / payloads / ack / requestTracker）、4 个 store、`usePowerController`、Naive UI 组件、33 个单测；门禁全绿。

- [ ] **待办**：真机短按 → ack ok → PC 状态翻转（**需用户单独授权**）。

### 阶段 2（进行中）

- [x] ack 中文文案映射
- [x] 深色主题切换
- [ ] 长按二次确认（需先确认 4000ms 阈值口径）
- [ ] 视觉增强（可后置）
- [ ] **UI 布局重构**（用户 2026-11-22 反馈对布局层次与导航不满意；可能有外部接手）

  现状问题：所有卡片挤在一个 `n-card` 里、顶部 `n-tabs` 导航不顺手。
  候选方向（可再与用户确认后动手）：
  - **A. 顶部 Tab + 多卡片**：保留 Tab，内容区拆成独立卡片，桌面两栏 / 移动单列（改动最小）。
  - **B. 侧边栏 + 内容**：桌面左侧边栏导航（状态/日志/参数），移动端收起为底部 Tab。
  - **C. 仪表盘单页**：首屏即 PC 状态 + 大按钮，日志/参数/诊断折叠在下方（最少点击，单屏信息少）。

  约束：只用 Naive UI，禁止自定义 CSS（不写样式文件 / 不写 `style`）。

### 阶段 3（未开始）

Cloudflare Pages + CSP + GitHub Actions + 推送 GitHub。

## 未决项

1. 真机按键验收授权。
2. broker 建独立认证用户（账号隔离；当前认证与设备共用，ACL 只看 client id）。
3. 主板 4000ms 强制断电阈值口径 → 决定长按是否开放。
4. UI 布局重构方向。
5. EMQX 同 client_id 互踢：若旧控制端在线会冲突。

## 验收命令

见 `CLAUDE.md` 的「命令」与「硬约束」。
