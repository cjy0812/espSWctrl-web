# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目

ESP32-C3「电源键控制器」的 Web 客户端。浏览器经 **MQTT over WebSocket** 直连 EMQX，查看设备/PC 状态并模拟短按电源键。固件仓库是同级 `../espSWctrl`（Rust），两端**只通过 MQTT 协议解耦**。

## 命令

包管理器固定 **pnpm**（`packageManager: pnpm@12.14.0`），不要用 npm/yarn。

```bash
pnpm dev                     # 本地开发（端口常被占，自动顺延，看输出）
pnpm build                   # vite build
pnpm typecheck               # vue-tsc --noEmit
pnpm test:unit               # vitest run
pnpm test:unit src/protocol/requestTracker.test.ts   # 单个测试文件
pnpm lint                    # biome check .
pnpm format                  # biome format --write .

# 真机探测（凭据走环境变量，不写文件、不入库）
$env:MQTT_USER='...'; $env:MQTT_PASS='...'
pnpm mqtt:probe                     # 只读：连接 + 三 topic 订阅 + retained
pnpm mqtt:probe -- --allow-press    # 真按一次（需用户授权）
pnpm mqtt:send press                # 端到端发 press 并等 ack
pnpm mqtt:send --cmd on             # 无损验证 publish ACL（设备回 unknown-cmd，不按键）
```

## 硬约束（用户明确要求）

- **UI 只用 Naive UI，禁止自定义 CSS**：不写样式文件、不写 `style` 属性、不写 scoped style。按需引入（`unplugin-vue-components` + `NaiveUiResolver`），模板直接用 `n-xxx`。
- **不改固件仓库**（`../espSWctrl`），**不扩展固件 MQTT 协议**。
- **完成标准**：`typecheck` + `lint` + `test:unit` + `build` 全绿。
- **进度只写 `README.md` 的「开发计划清单」**（唯一进度台账）。
- **真机按电源键必须先取得用户单独授权**（会真实翻转 PC 电源）。

## 文档索引（按需 Read，不要 @import）

细节不在这里展开，避免每会话全量加载：

- **`docs/architecture.md`** —— 分层与各模块职责、协议事实、broker 接入细节。**改协议 / 状态机 / 连接层 / UI 编排前读。**
- **`docs/decisions.md`** —— 设计决策的理由、实测结论、踩坑、未决项。**怀疑某设计或排障前读。**
- **`docs/plan.md`** —— 阶段、验收、未决项。排期或更新进度前读。
- **`README.md`** —— 使用说明 + 开发计划清单（进度台账）。

协议与 broker 的关键事实（只有 press/press_long、ack nonce 恒空、ACL 按 client id、8084 WSS + `/mqtt`）见 `docs/architecture.md`，不要在代码里凭猜测改动。

## 本机环境坑

- 有 HTTP 代理 `127.0.0.1:7890` 且 `NO_PROXY` 为空：`curl` 必须 `--noproxy '*'`，否则 502；`Invoke-WebRequest` 走代理；Node 的 `tls`/`WebSocket` 直连不受影响。
- **内存长期紧张**（约 8 GB 总量，Chrome 常占 1 GB+）：`build` / `dev` 可能 OOM，后台进程会被系统回收。**被回收后不要自行重启**，先请用户释放内存。
- 5173 常被残留 vite 进程占用，`pnpm dev` 自动顺延端口（看启动输出）。

## 约定文件

- 固件仓库 `../espSWctrl` 有 `AGENTS.md`（单一规则源）与 `CLAUDE.md`；**本仓库只受本文件与 `README.md` 约束**，不要套用固件仓库的 `cargo-build.cmd` / `check-portability.py` 等门禁。
- 项目文档在 `docs/`；`.claude/` 只放 Claude Code 官方支持的配置（本仓库当前为空）。
