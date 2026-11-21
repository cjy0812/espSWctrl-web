# espSWctrl-web

ESP32-C3「电源键控制器」的 Web 客户端。浏览器通过 **MQTT over WebSocket** 直连 broker，实现：查看设备/PC 状态、模拟短按电源键、查看日志与连接诊断。

固件仓库：[`espSWctrl`](https://github.com/cjy0812/espSWctrl)

---

## ⚠️ 安全须知（先读）

1. **client id 是权限关键**：实测（2026-11-22）broker ACL **按 client id 匹配** —— `pc01-controller` 拥有控制端权限（订阅 `psw/<id>/{state,status,ack}` + 发布 `psw/<id>/cmd`），而设备的 `pc01-esp32` 只有 Publish 权限。前端默认 client id 即 `pc01-controller`（`DEFAULT_CLIENT_ID`），**改成随机值会失去订阅权限**。
   - 认证账号：目前使用 `esp32_pc01`（与设备同一账号，因为 ACL 只看 client id）。建议后续在 broker 建独立认证用户给前端，实现真正的账号隔离；在建成之前，请勿把前端凭据透露给不可信方。
   - 若既有 Windows/Android 控制端仍在线，同 client id 会互踢（EMQX 同 client_id 只允许一个连接）。
2. **凭据存储**：默认凭据保存在 **sessionStorage**（关闭标签页即失效），也可选「仅本次会话（内存）」。**localStorage 持久化只在用户主动勾选「记住密码」时启用**。
3. **XSS 风险**：本项目是公开部署的纯前端，MQTT 凭据存在于浏览器侧。一旦站点被注入恶意脚本，存储的凭据可能被盗。缓解措施：必须 HTTPS 托管 + CSP（`connect-src 'self' wss:`）；不将任何 broker 数据渲染为 HTML（禁用 `v-html`）；提供「清除凭据」。
4. **日志脱敏**：密码、token 等字段在日志、异常对象、导出 JSON 中都会被替换为 `***`。
5. **长按风险**：主板 **≥4000ms** 的电源键脉冲会触发强制断电。固件把长按固定在 3000ms（余量 1000ms），Web 端 MVP **不开放长按**。

---

## 开发计划清单

> 本清单是本仓库唯一进度台账。完成一项勾一项，并在行尾追加证据。

### 阶段 0：探测确认 + 脚手架

- [x] 仓库与构建配置（pnpm 12 / Vite 8 / TS 5.9 / Biome 2.6） ——（2026-11-22，`pnpm install` + `pnpm build` 通过）
- [x] `src/config/storage.ts`：凭据三态存储（memory / session / local）+ URL 预填 + 脱敏
- [x] `src/mqtt/types.ts`、`mqttService.ts`、`useMqtt.ts` —— 自管指数退避重连，密码不进日志
- [x] 连接设置抽屉与顶部连接状态条（`ConnectionSettingsDrawer.vue` / `ConnectionBar.vue`）
- [x] `scripts/probe-broker.mjs`：三个具体 topic 分别订阅（不用 `#`），打印 SUBACK 与 retained
- [x] `scripts/send-test.mjs`：命令行发 press 做端到端
- [x] 探测脚本可用：mqtt.js 成功完成 WSS + MQTT 握手（CONNACK rc=0） ——（2026-11-22，用设备账号实测；订阅如预期被 ACL 拒绝）
- [x] **验收：三 topic 各 `granted=1` 且收到 retained** ——（2026-11-22，`pnpm mqtt:probe` 用 client id `pc01-controller` 实测：订阅 3/3，`state={"pc":"on"}`、`status={"online":true}`）
- [x] **验收：publish ACL + ack 通道** ——（2026-11-22，`pnpm mqtt:send --cmd on` 收到 `{"nonce":"","result":"unknown-cmd"}`，未按键）

### 阶段 1：MVP 最小可用

- [x] `src/protocol/`：topics / payloads / ack / requestTracker（单飞窗口 + 「结果未知」状态）
- [x] `src/stores/`：connection / device / command / log
- [x] `src/composables/usePowerController.ts`（含超时扫描与 stale 判定）
- [x] `DeviceStatusCard`、`PowerButton`（**仅短按**）、`LogTimeline`、`DiagnosticsPanel`、`MainView`
- [x] 设备状态四态模型（unknown / online / offline / stale）
- [x] 结果未知的人工确认流程（已执行 / 未执行）
- [x] 单元测试 33 个（payloads / topics / requestTracker / mask） ——（2026-11-22，`pnpm test:unit` 全绿）
- [x] 门禁：`pnpm typecheck` + `pnpm lint` + `pnpm build` 全绿
- [ ] **验收：真机短按 → ack ok → PC 状态翻转** —— 待授权执行（会真实翻转电源）

### 阶段 2：完善

- [ ] 长按二次确认（需先核实 4000ms 阈值口径）
- [ ] 完整错误文案映射（`protocol/ack.ts` 已备文案，UI 尚未全部呈现）
- [ ] 深色主题切换控件（token 已就绪）
- [ ] 视觉增强（Mica / 窗口式布局，可后置）

### 阶段 3：部署

- [ ] Cloudflare Pages（HTTPS）+ `base` 配置
- [ ] CSP 头
- [ ] GitHub Actions：typecheck + test + build
- [ ] 验收：线上强制 WSS；构建产物与仓库不含凭据

---

## 常用命令

```bash
pnpm install
pnpm dev            # 本地开发
pnpm typecheck      # vue-tsc --noEmit
pnpm test:unit      # vitest run
pnpm build          # vite build
pnpm lint           # biome check .

# MQTT 探测（凭据走环境变量，不写入文件）
$env:MQTT_USER='...'; $env:MQTT_PASS='...'
pnpm mqtt:probe                  # 只读：连接 + 三 topic 订阅 + retained
pnpm mqtt:probe -- --allow-press # 额外发一次 press（会真实按键）
pnpm mqtt:send press             # 端到端发 press 并等 ack
```

`.env.example` 列出了脚本需要的环境变量。

## 协议要点（与固件一致）

- Topic：`psw/<device_id>/{cmd,state,status,ack}`，**无前导斜杠**（历史踩坑：曾多发一个 `/`）
- 下行：`{"cmd":"press","nonce":"<唯一>","ts":<unix秒>,"ttl":<秒>}`，**只有 `press`**（`press_long` MVP 不开放）
- 上行：`{"pc":"on"|"off"}`、`{"online":bool}`、`{"nonce":"","result":"<结果>"}`
- ack 的 `nonce` **恒为空串** → 客户端无法做严格请求关联，采用「单飞窗口」；超时/断线标记为**结果未知**而非失败
- `state`/`status` 为 retained；离线靠 LWT 遗嘱 `{"online":false}`

---

## 未决项

1. **账号隔离（建议）**：ACL 按 client id 授权，前端已用 `pc01-controller`。但认证目前与设备共用 `esp32_pc01`。建议在 EMQX 建独立认证用户（如 `pc01_controller`）给前端，然后把 ACL 的 `pc01-controller` 规则同时绑定到新用户名。
2. **device_id 实际值**：固件默认 `pc01`，需从设备 NVS 确认。
3. **主板 4000ms 强制断电阈值口径**：决定阶段 2 是否开放长按。
4. **EMQX 并发连接限制**：前端与既有控制端共用 `pc01-controller` 时，同 client_id 会互踢；前端默认随机 client_id 规避。
