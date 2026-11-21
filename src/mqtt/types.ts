/** MQTT 连接与日志的类型定义（与 Vue store 解耦，mqtt 层不依赖 Pinia）。 */

export type MqttProtocol = 'wss' | 'ws'

export type MqttConnectionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'subscribed'
  | 'reconnecting'
  | 'disconnected'
  | 'error'

export interface BrokerConfig {
  host: string
  port: number
  path: string
  protocol: MqttProtocol
  username: string
  password: string
  /** 默认随机 web-xxxxxxxx；可手动指定 */
  clientId: string
  keepalive: number
  clean: boolean
  connectTimeoutMs: number
  deviceId: string
}

export type LogKind = 'conn' | 'sub' | 'send' | 'ack' | 'state' | 'status' | 'error' | 'system'

/** 日志条目（id/at 由 logStore 生成，这里只描述内容） */
export interface LogEntryInput {
  kind: LogKind
  text: string
  meta?: unknown
}

export interface MqttServiceEvents {
  onState(state: MqttConnectionState, detail?: string): void
  onMessage(topic: string, payload: Uint8Array): void
  onError(error: Error, context: string): void
  onLog(entry: LogEntryInput): void
}

export interface PublishOptions {
  qos?: 0 | 1
  retain?: boolean
}
