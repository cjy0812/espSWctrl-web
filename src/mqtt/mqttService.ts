/**
 * MQTT over WebSocket 连接封装。
 *
 * - 关掉 mqtt.js 自带重连（reconnectPeriod:0），自管指数退避，
 *   这样 UI 才能准确显示「重连中(第 N 次)」。
 * - 密码只用于连接参数，绝不进入日志/错误对象（见 utils/mask.ts）。
 */

import type { IClientOptions, MqttClient } from 'mqtt'
import mqtt from 'mqtt'

import { RECONNECT_BASE_MS, RECONNECT_MAX_MS } from '@/config/defaults'
import type { BrokerConfig, MqttConnectionState, MqttServiceEvents, PublishOptions } from './types'

type StateListener = (state: MqttConnectionState, detail: string) => void

export class MqttService {
  private client: MqttClient | null = null
  private readonly cfg: BrokerConfig
  private readonly events: MqttServiceEvents
  private state: MqttConnectionState = 'idle'
  private stateDetail = ''
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempt = 0
  private manualClose = false
  private readonly stateListeners = new Set<StateListener>()

  constructor(cfg: BrokerConfig, events: MqttServiceEvents) {
    this.cfg = cfg
    this.events = events
  }

  getState(): MqttConnectionState {
    return this.state
  }

  getStateDetail(): string {
    return this.stateDetail
  }

  getReconnectAttempt(): number {
    return this.reconnectAttempt
  }

  /** 订阅状态变化（供 Vue composable 镜像成 ref）。 */
  onState(listener: StateListener): () => void {
    this.stateListeners.add(listener)
    return () => {
      this.stateListeners.delete(listener)
    }
  }

  private setState(state: MqttConnectionState, detail = ''): void {
    this.state = state
    this.stateDetail = detail
    this.events.onState(state, detail)
    for (const l of this.stateListeners) l(state, detail)
  }

  private buildUrl(): string {
    const path = this.cfg.path.startsWith('/') ? this.cfg.path : `/${this.cfg.path}`
    return `${this.cfg.protocol}://${this.cfg.host}:${this.cfg.port}${path}`
  }

  /** 用户主动连接：重置退避计数。内部自动重连不调用此入口。 */
  connect(): void {
    this.manualClose = false
    this.clearReconnect()
    this.reconnectAttempt = 0
    this.openConnection()
  }

  /** 建立一次连接。由初次连接和退避定时器共用，避免重置退避计数。 */
  private openConnection(): void {
    this.setState('connecting')
    this.events.onLog({
      kind: 'conn',
      text: `正在连接 ${this.cfg.host}:${this.cfg.port}${this.cfg.path}`,
    })

    const opts: IClientOptions = {
      clientId: this.cfg.clientId,
      username: this.cfg.username || undefined,
      password: this.cfg.password || undefined,
      keepalive: this.cfg.keepalive,
      clean: this.cfg.clean,
      connectTimeout: this.cfg.connectTimeoutMs,
      reconnectPeriod: 0,
      // MQTT 3.1.1（与固件一致）
      protocolId: 'MQTT',
      protocolVersion: 4,
    }

    try {
      this.client = mqtt.connect(this.buildUrl(), opts)
    } catch (err) {
      this.setState('error', '创建连接失败')
      this.events.onError(err instanceof Error ? err : new Error(String(err)), 'connect')
      this.scheduleReconnect()
      return
    }

    this.client.on('connect', () => {
      this.reconnectAttempt = 0
      this.setState('connected')
      this.events.onLog({ kind: 'conn', text: 'MQTT 已连接（CONNACK 接受）' })
    })
    this.client.on('message', (topic: string, payload: Buffer) => {
      this.events.onMessage(topic, new Uint8Array(payload))
    })
    this.client.on('error', (err: Error) => {
      this.setState('error', err.message)
      this.events.onError(err, 'mqtt-error')
      this.events.onLog({ kind: 'error', text: `MQTT 错误：${err.message}` })
    })
    this.client.on('close', () => {
      if (this.manualClose) {
        this.setState('disconnected')
        return
      }
      this.setState('disconnected')
      this.scheduleReconnect()
    })
  }

  private scheduleReconnect(): void {
    if (this.manualClose || this.reconnectTimer) return
    const delay = Math.min(RECONNECT_BASE_MS * 2 ** this.reconnectAttempt, RECONNECT_MAX_MS)
    this.reconnectAttempt += 1
    this.setState(
      'reconnecting',
      `第 ${this.reconnectAttempt} 次，${Math.round(delay / 1000)}s 后重试`,
    )
    this.events.onLog({
      kind: 'conn',
      text: `连接断开，第 ${this.reconnectAttempt} 次重连（${Math.round(delay / 1000)}s 后）`,
    })
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.openConnection()
    }, delay)
  }

  private clearReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  async subscribe(topic: string, qos: 0 | 1 = 1): Promise<void> {
    if (!this.client) throw new Error('MQTT 未连接')
    const granted = await this.client.subscribeAsync(topic, { qos })
    const codes = granted.map((g) => g.qos)
    const failed = codes.some((c) => c === 0x80 || c === undefined)
    this.events.onLog({
      kind: 'sub',
      text: failed ? `订阅 ${topic} 被拒（ACL）` : `已订阅 ${topic}`,
      meta: { topic, codes },
    })
    if (failed) {
      throw new Error(`订阅被拒（ACL）：${topic}`)
    }
  }

  async publish(topic: string, payload: string, opts?: PublishOptions): Promise<void> {
    if (!this.client) throw new Error('MQTT 未连接')
    await this.client.publishAsync(topic, payload, {
      qos: opts?.qos ?? 1,
      retain: opts?.retain ?? false,
    })
  }

  disconnect(): void {
    this.manualClose = true
    this.clearReconnect()
    const client = this.client
    this.client = null
    if (client) {
      try {
        client.end(true)
      } catch {
        /* 忽略 */
      }
    }
    this.setState('disconnected')
  }
}
