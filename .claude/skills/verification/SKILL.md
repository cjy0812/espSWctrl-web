---
name: verification
description: Plan and perform regression checks for code changes in this Vue and MQTT controller repository. Use before committing, opening a pull request, reviewing changes, or declaring a task complete.
---

# 变更验证工作流

1. 阅读 `AGENTS.md`，检查当前分支、工作区状态、变更范围和相关测试。
2. 从 diff 列出受影响行为、调用方、边界条件和潜在外部副作用；检查是否意外触碰固件、协议、凭据或部署配置。
3. 按顺序执行：
   - `pnpm install --frozen-lockfile`（依赖/锁文件变更或环境未安装时）
   - `pnpm typecheck`
   - `pnpm lint`
   - `pnpm test:unit`
   - `pnpm build`
4. 对状态机至少核对成功、失败、超时、断线、迟到事件和人工恢复路径；对 MQTT 操作确认没有自动重试或真实设备写入。
5. 查看命令退出码和完整输出；如失败，定位根因并修复后重跑。不能通过跳过测试或放宽规则掩盖失败。
6. 最后执行 `git diff --check`，审查最终 diff 与秘密扫描结果；PR 中文说明实际执行的命令及结果。
7. 不把真机按键、生产 broker 写入或部署纳入自动化验证；需要时单独取得用户明确授权。
