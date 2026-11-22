# 决策与实测记录

> 按需查阅：想知道「为什么这么做」、或怀疑某设计时读这份。

## 关键决策（含理由）

| 决策 | 理由 |
|---|---|
| UI 只用 **Naive UI**，禁止自定义 CSS | 用户 2026-11-22 明确要求（此前手写 Fluent 样式与 token 被否） |
| client id 固定 **`pc01-controller`** | 实测 ACL 按 client id 授权；随机值会失去订阅权限 |
| 凭据默认 **sessionStorage** | 用户要求；localStorage 仅主动勾选「记住密码」 |
| **单飞窗口** + 结果未知 | ack 的 nonce 恒空，无法关联请求；未解决上一条不许发新指令 |
| 超时/断线 = **unknown**，不是 failed | 指令可能已执行，误报失败会导致重复按键 |
| MVP **不做 `press_long`** | ≥4000ms 会触发主板强制断电，需先核实阈值口径 |
| 不引入组件库的轮子（vue-mqtt 等） | `vue-mqtt` 停更且 Vue2；`mqtt-vue-hook` 停更；`vue3-mqtt`/`mqtt-vue` 不存在 |
| TS 固定 **~5.9**，不追 TS 7 | TS 7 是原生移植版，与 vue-tsc 的兼容性未实测 |

## 实测结论

- 浏览器 MQTT 必须走 **8084 WSS + `/mqtt` + `mqtt` 子协议**；8083/443/1883 未开放。
- **ACL 按 client id 匹配**：用设备账号密码 + client id `pc01-controller` 实测订阅 3/3，retained `state={"pc":"on"}`、`status={"online":true}`。
- publish ACL 通：发 `{"cmd":"on"}` → 回 `{"nonce":"","result":"unknown-cmd"}`（**不按键**，可当无损验证手法）。
- 固件 QoS1 去重在 `Ok` 之前 `nonce_remember`，重投递不会重复执行。

## 踩过的坑

- **代理污染**：本机 `127.0.0.1:7890` 代理，`NO_PROXY` 为空。curl 要 `--noproxy '*'`；`Invoke-WebRequest` 会 502；Node 的 `tls`/`WebSocket` 直连不受影响。
- **topic 前导斜杠**：曾写成 `/psw/pc01/...` 导致不匹配，`topics.ts` 有断言与单测。
- **内存**：约 8 GB 总量、Chrome 常占 1 GB+，`build`/`dev` 会 OOM；后台进程会被系统回收，**被回收后不要自行重启**，先请用户释放内存。
- **端口**：5173 常被残留 vite 占用，`pnpm dev` 自动顺延，看启动输出。

## 未决项

1. 真机按键验收授权。
2. broker 建独立认证用户（账号隔离）。
3. 主板 4000ms 强制断电阈值口径 → 决定长按开放。
4. UI 布局重构方向（用户对当前布局/导航不满意）。
5. 部署（Cloudflare Pages / CSP / CI）与推送 GitHub。
