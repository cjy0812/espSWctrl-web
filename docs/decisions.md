# 决策与实测记录

> 按需查阅：想知道「为什么这么做」、或怀疑某设计时读这份。

## 关键决策（含理由）

| 决策 | 理由 |
|---|---|
| UI 只用 **Naive UI**，禁止自定义 CSS | 用户 2026-11-22 明确要求 |
| client id 固定 **`pc01-controller`** | 实测 ACL 按 client id 授权；随机值会失去订阅权限 |
| 凭据默认 **sessionStorage** | 用户要求；localStorage 仅主动勾选「记住密码」 |
| **单飞窗口** + 结果未知 | ack 的 nonce 恒空，无法关联请求；pending / unknown 均占用窗口，防止重复翻转与 ack 误归因 |
| 超时/断线 = **unknown**，不是 failed | 指令可能已执行，误报失败会导致重复按键 |
| MVP **不做 `press_long`** | ≥4000ms 会触发主板强制断电 |
| 不引入组件库的轮子（vue-mqtt 等） | 现有 mqtt.js 封装满足需求，避免引入停更或不必要依赖 |
| TS 固定 **~5.9** | 与当前 vue-tsc 工具链匹配 |

## 实测结论

- 浏览器 MQTT 必须走 **8084 WSS + `/mqtt` + `mqtt` 子协议**；其他端口未开放。
- **ACL 按 client id 匹配**：用设备账号密码 + client id `pc01-controller` 实测订阅 3/3，retained 状态正常。
- publish ACL 通：发 `{"cmd":"on"}` → 回 `{"nonce":"","result":"unknown-cmd"}`（**不按键**，可当无损验证手法）。
- 固件 QoS1 去重在 `Ok` 之前 `nonce_remember`，重投递不会重复执行。

## 踩过的坑

- **代理污染**：本机 `127.0.0.1:7890` 代理，curl 要 `--noproxy '*'`；Node 的 `tls`/`WebSocket` 直连不受影响。
- **topic 前导斜杠**：曾写成 `/psw/pc01/...` 导致不匹配，`topics.ts` 有断言与单测。
- **内存**：本机内存紧张时 build/dev 可能 OOM；进程异常退出先检查资源，不要无限重启。
- **端口**：5173 常被残留 vite 进程占用，`pnpm dev` 自动顺延。

## 未决项

1. 真机按键验收授权。
2. broker 建独立认证用户（账号隔离）。
3. UI 布局重构方向（用户对当前布局/导航不满意，需先确认方向）。
4. 部署（Cloudflare Pages / CSP / CI）。
