# 架构

> 按需查阅：改协议、状态机、连接层或 UI 编排前读这份。

## 分层（单向依赖）

```
views/components (Naive UI)
  → composables/usePowerController
    → stores (Pinia: connection / device / command / log)
      → mqtt/MqttService  →  broker (MQTT over WebSocket)
protocol/（独立于 UI，被 stores 与 composables 使用）
```

## 模块职责

- **`mqtt/mqttService.ts`** —— 封装 mqtt.js 浏览器入口。靠 `vite.config.ts` 的 `resolve.conditions:['browser']` 命中 `exports.browser`（`dist/mqtt.esm.js`），否则会拉 Node 内置模块。**关掉库自带重连**（`reconnectPeriod: 0`），自管指数退避 1s→30s。密码只进连接参数，不进日志/错误。
- **`protocol/topics.ts`** —— 拼 `psw/<device_id>/<kind>`，**禁止前导 `/`**（历史踩坑），带断言与单测。
- **`protocol/payloads.ts`** —— `buildCmdPayload` + 严格解析（`parseCmd/Ack/State/Status`，非法即 `null`）。
- **`protocol/ack.ts`** —— ack 结果枚举 + 中文 label / 排障提示（含固件文档漏掉的 `error`）。
- **`protocol/requestTracker.ts`** —— **单飞窗口**：`pending` 与 `unknown` 都阻止新指令；状态机 `pending → ok / failed / unknown`。超时与断线标记 **unknown（结果未知）**，不是 failed；迟到 ack 仍归因；支持人工确认。
- **`stores/connectionStore.ts`** —— 连接生命周期、订阅三个具体 topic（不用 `#`）、把 message 分发到 device / command；记录 `actualClientId` 供诊断。
- **`stores/deviceStore.ts`** —— 四态 `unknown / online / offline / stale`（**stale ≠ offline**）；客户端自身断线只标 stale，不当设备离线。
- **`stores/commandStore.ts`** —— 包装 RequestTracker，`shallowRef` + `refresh()` 触发更新。
- **`stores/logStore.ts`** —— 写入前经 `maskText` + `maskSensitive` 脱敏。
- **`config/storage.ts`** —— 凭据三态 `memory / session / local`（默认 session），`local` 仅用户主动勾选；URL 预填只收 host/port/path/device/protocol，**不收凭据**。
- **`composables/usePowerController.ts`** —— 编排：`press()`、超时扫描（1s tick）、stale 判定、人工确认、重新订阅刷新状态。

## 协议事实（源码级，决定 UI 不能怎么做）

- Topic：`psw/<device_id>/{cmd,state,status,ack}`。
- 下行**只有 `press` / `press_long`**，无 on/off —— 电源键是「按一下翻转」语义，UI 不做幂等开机/关机按钮。
- **ack 的 `nonce` 恒为空串**（固件 `src/mqtt.rs`）→ 无法严格关联请求，只能靠单飞窗口。
- `ts` 由浏览器生成、设备用 SNTP 判时间窗 → 时钟偏差会收到 `expired`，UI 单独提示。
- **长按 ≥4000ms 触发主板强制断电**；固件 `press_long` 固定 3000ms（余量 1000ms）。
- `state`/`status` 为 retained；离线靠 LWT 遗嘱 `{"online":false}`；QoS 1 + clean session。
- QoS1 重投递由固件 nonce 环去重（先 `nonce_remember` 再返回 Ok），**不会重复按键**。
- 协议无配置类指令：脉冲宽度 / ttl / keepalive / DDNS 等只能串口写 NVS。

## broker 接入（实测）

- 设备用 8883（MQTTS）；**浏览器只能用 8084 WSS**，path 必须 `/mqtt`，握手必须带 `Sec-WebSocket-Protocol: mqtt`（mqtt.js 已处理；缺失 EMQX 返回 400）。
- 证书 `*.ala.asia-southeast1.emqxsl.com`，浏览器可正常校验。
- **ACL 按 client id 匹配**：必须用 `pc01-controller`（`DEFAULT_CLIENT_ID`），改成随机值会订阅失败。
- 认证账号目前与设备共用（ACL 不看 username）——账号隔离是未决项。
- 脚本环境变量：`MQTT_USER` / `MQTT_PASS` / `MQTT_HOST` / `MQTT_PORT` / `MQTT_PATH` / `MQTT_CLIENT_ID` / `MQTT_DEVICE_ID`。
