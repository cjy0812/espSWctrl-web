/**
 * 连接配置的持久化。
 *
 * 凭据存储三态（P0-1）：
 *  - memory：仅内存，刷新即失（最安全）
 *  - session：sessionStorage，关闭标签页即失 —— **默认**
 *  - local：localStorage，仅用户主动勾选「记住密码」才启用
 *
 * URL 预填只接受非敏感字段（host/port/path/device/protocol），
 * 刻意不接受 username/password —— 避免凭据进入历史记录与日志。
 */

import type { MqttProtocol } from '@/mqtt/types'
import {
  DEFAULT_BROKER_HOST,
  DEFAULT_BROKER_PATH,
  DEFAULT_BROKER_PORT,
  DEFAULT_CLIENT_ID,
  DEFAULT_CMD_TTL,
  DEFAULT_CONNECT_TIMEOUT_MS,
  DEFAULT_DEVICE_ID,
  DEFAULT_KEEPALIVE,
  DEFAULT_PROTOCOL,
} from './defaults'

export type CredentialStorage = 'memory' | 'session' | 'local'

const STORAGE_KEY = 'espSWctrl-web:config:v1'

export interface PersistedConfig {
  host: string
  port: number
  path: string
  protocol: MqttProtocol
  username: string
  password: string
  clientId: string
  keepalive: number
  clean: boolean
  connectTimeoutMs: number
  deviceId: string
  ttl: number
  credentialStorage: CredentialStorage
}

export function defaultConfig(): PersistedConfig {
  return {
    host: DEFAULT_BROKER_HOST,
    port: DEFAULT_BROKER_PORT,
    path: DEFAULT_BROKER_PATH,
    protocol: DEFAULT_PROTOCOL,
    username: '',
    password: '',
    clientId: DEFAULT_CLIENT_ID,
    keepalive: DEFAULT_KEEPALIVE,
    clean: true,
    connectTimeoutMs: DEFAULT_CONNECT_TIMEOUT_MS,
    deviceId: DEFAULT_DEVICE_ID,
    ttl: DEFAULT_CMD_TTL,
    credentialStorage: 'session',
  }
}

function toProtocol(v: unknown): MqttProtocol {
  return v === 'ws' ? 'ws' : 'wss'
}

function toPort(v: unknown, fallback: number): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isInteger(n) && n > 0 && n <= 65535 ? n : fallback
}

function toNonNegativeInt(v: unknown, fallback: number): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback
}

/** 把任意（可能过期的/被篡改的）持久化数据规整成合法配置。 */
export function normalizeConfig(raw: unknown): PersistedConfig {
  const d = defaultConfig()
  if (raw === null || typeof raw !== 'object') return d
  const o = raw as Record<string, unknown>
  const storage = o.credentialStorage
  return {
    host: typeof o.host === 'string' ? o.host.trim() : d.host,
    port: toPort(o.port, d.port),
    path: typeof o.path === 'string' && o.path.startsWith('/') ? o.path : d.path,
    protocol: toProtocol(o.protocol),
    username: typeof o.username === 'string' ? o.username : '',
    password: typeof o.password === 'string' ? o.password : '',
    clientId: typeof o.clientId === 'string' ? o.clientId : '',
    keepalive: toPort(o.keepalive, d.keepalive),
    clean: o.clean !== false,
    connectTimeoutMs: toPort(o.connectTimeoutMs, d.connectTimeoutMs),
    deviceId: typeof o.deviceId === 'string' && o.deviceId !== '' ? o.deviceId : d.deviceId,
    ttl: toNonNegativeInt(o.ttl, d.ttl),
    credentialStorage:
      storage === 'memory' || storage === 'session' || storage === 'local'
        ? storage
        : d.credentialStorage,
  }
}

function readRaw(store: Storage | null): unknown {
  if (!store) return null
  try {
    const text = store.getItem(STORAGE_KEY)
    return text ? (JSON.parse(text) as unknown) : null
  } catch {
    return null
  }
}

function getStore(kind: Exclude<CredentialStorage, 'memory'>): Storage | null {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}

/** memory 态：模块级变量，刷新即失。 */
let memoryConfig: PersistedConfig | null = null

export function getMemoryConfig(): PersistedConfig | null {
  return memoryConfig
}

/**
 * 读取持久化配置。优先级：local（用户明确「记住」）→ session。
 * memory 态不落 web storage，刷新后需重新填写。
 */
export function loadPersisted(): PersistedConfig | null {
  const local = normalizeConfig(readRaw(getStore('local')))
  const hasLocal = readRaw(getStore('local')) !== null
  if (hasLocal) return local
  const sessionRaw = readRaw(getStore('session'))
  if (sessionRaw !== null) return normalizeConfig(sessionRaw)
  return null
}

export function savePersisted(cfg: PersistedConfig): void {
  memoryConfig = cfg
  if (cfg.credentialStorage === 'memory') {
    // 仅内存：绝不落 web storage。
    return
  }
  const store = getStore(cfg.credentialStorage)
  if (!store) {
    // 隐私模式等场景下 web storage 不可用：退化为仅内存，不静默持久化。
    return
  }
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(cfg))
  } catch {
    // 写入失败（配额/隐私模式）不抛错，配置退回内存态。
  }
}

export function clearPersisted(): void {
  memoryConfig = null
  for (const kind of ['local', 'session'] as const) {
    const store = getStore(kind)
    try {
      store?.removeItem(STORAGE_KEY)
    } catch {
      /* 忽略 */
    }
  }
}

/**
 * 从 URL 读取非敏感覆盖项：?host=&port=&path=&device=&protocol=。
 * 不接受 username/password。
 */
export function applyUrlOverrides(
  cfg: PersistedConfig,
  search = window.location.search,
): PersistedConfig {
  const params = new URLSearchParams(search)
  const next = { ...cfg }
  const host = params.get('host')
  if (host) next.host = host.trim()
  const port = params.get('port')
  if (port) next.port = toPort(Number(port), next.port)
  const path = params.get('path')
  if (path?.startsWith('/')) next.path = path
  const device = params.get('device')
  if (device) next.deviceId = device
  const protocol = params.get('protocol')
  if (protocol === 'ws' || protocol === 'wss') next.protocol = protocol
  return next
}

/** 读取最终配置：持久化 + URL 覆盖。无任何持久化时返回默认值。 */
export function resolveConfig(): PersistedConfig {
  const persisted = loadPersisted()
  const base = persisted ?? defaultConfig()
  if (persisted === null) {
    // 无持久化配置时，memory 态也要应用 URL 覆盖，便于分享链接。
    memoryConfig = base
  }
  return applyUrlOverrides(base)
}
