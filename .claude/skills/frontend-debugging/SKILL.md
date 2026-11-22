---
name: frontend-debugging
description: Diagnose and fix Vue 3, TypeScript, Pinia, Naive UI, or browser-side behavior in this repository. Use when a screen, interaction, state update, or connection workflow behaves incorrectly.
---

# 前端缺陷排查工作流

1. 阅读 `AGENTS.md` 与 `CLAUDE.md`；涉及状态或协议时再读对应架构/决策文档。
2. 从用户可观察症状定位组件入口，沿调用链追踪 computed/ref、Pinia store、composable、MQTT service；不要只改 UI 表象。
3. 明确状态转换和副作用：连接状态、组件生命周期、定时器、异步 publish/subscribe、断线重连、重复点击。
4. 优先在纯逻辑层复现问题并补 Vitest 回归测试；UI 状态必须由响应式状态派生，不能只靠非响应式 getter。
5. 保持 Naive UI 组件体系，不添加自定义 CSS 或 `style`。不要引入新依赖解决可由现有 Vue/Pinia 能力解决的问题。
6. 检查加载/禁用状态、空值、异常提示、移动布局和键盘可用性；不要让错误提示暗示设备动作必然未发生。
7. 运行四项门禁并检查完整 diff；未实际运行的验证不得标成通过。
