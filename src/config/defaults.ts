/**
 * 默认连接参数。
 *
 * 刻意不硬编码 broker 域名：host 默认空字符串，必须由用户填写。
 * 这样公开仓库不含 broker 地址，也避免把某台设备写死在代码里。
 */

export const DEFAULT_BROKER_HOST = ''
export const DEFAULT_BROKER_PORT = 8084
export const DEFAULT_BROKER_PATH = '/mqtt'
export const DEFAULT_PROTOCOL: 'wss' | 'ws' = 'wss'

/** 固件 consts.rs:DEFAULT_DEV_ID */
export const DEFAULT_DEVICE_ID = 'pc01'

/** MQTT keepalive（秒） */
export const DEFAULT_KEEPALIVE = 30

/** 指令时间窗（秒），与固件 CMD_TTL_DEFAULT 一致 */
export const DEFAULT_CMD_TTL = 30

export const DEFAULT_CONNECT_TIMEOUT_MS = 10_000

/** 指数退避重连：起点 / 上限 */
export const RECONNECT_BASE_MS = 1_000
export const RECONNECT_MAX_MS = 30_000

/** 设备 ID 规则：ASCII 字母数字与 _-，最长 32（固件 cfg.rs 约束） */
export const DEVICE_ID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/
