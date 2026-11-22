---
name: mqtt-protocol
description: Safely investigate or change this project's MQTT topics, payloads, acknowledgements, request tracking, or broker connection behavior. Use when debugging device communication or modifying protocol-related code.
---

# MQTT 协议工作流

1. 阅读 `AGENTS.md`、`docs/architecture.md`、`docs/decisions.md`，再读涉及的固件源码（只读，不修改）。
2. 以固件实现为事实来源，核对 topic、字段、类型、QoS、retain、时间窗、nonce 与错误码。不要根据注释或旧聊天猜测。
3. 牢记当前协议限制：
   - topic 为 `psw/<device_id>/{cmd,state,status,ack}`，无前导斜杠；
   - 命令只可使用已验证的 `press`；不得擅自开放 `press_long` 或 on/off；
   - ack nonce 为空，无法关联并发请求；
   - `pending` 和 `unknown` 均占用单飞窗口；
   - 超时、断线、publish 不确定均不能自动重试或假定未执行。
4. 先写协议纯函数/状态机测试，再修改实现；覆盖迟到 ack、重复/孤立 ack、断线和人工确认。
5. 不用真实 broker 做写入验证。只读探测也不得读取或输出秘密；任何真实按键必须取得用户本次明确授权。
6. 变更后运行 `pnpm typecheck`、`pnpm lint`、`pnpm test:unit`、`pnpm build`，并更新架构/决策文档中的事实。
