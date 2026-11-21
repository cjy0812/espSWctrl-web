import { defineStore } from 'pinia'
import { ref } from 'vue'
import { DEFAULT_CLIENT_ID } from '@/config/defaults'
import {
  clearPersisted,
  type PersistedConfig,
  resolveConfig,
  savePersisted,
} from '@/config/storage'
import { MqttService } from '@/mqtt/mqttService'
import type { BrokerConfig, MqttConnectionState } from '@/mqtt/types'
import { parseAck, parseState, parseStatus } from '@/protocol/payloads'
import { type TopicKind, topic } from '@/protocol/topics'
import { useCommandStore } from './commandStore'
import { useDeviceStore } from './deviceStore'
import { useLogStore } from './logStore'

export const useConnectionStore = defineStore('connection', () => {
  const logStore = useLogStore()
  const deviceStore = useDeviceStore()
  const commandStore = useCommandStore()

  const config = ref<PersistedConfig>(resolveConfig())
  const state = ref<MqttConnectionState>('idle')
  const detail = ref('')
  const errorMessage = ref('')
  const reconnectAttempt = ref(0)
  const connectedAt = ref<number | null>(null)
  const subscribedTopics = ref<string[]>([])
  const lastAck = ref<{ at: number; result: string } | null>(null)
  /** 实际使用的 clientId（未指定时随机生成） */
  const actualClientId = ref('')

  let service: MqttService | null = null

  function setConfig(patch: Partial<PersistedConfig>): void {
    config.value = { ...config.value, ...patch }
  }

  function handleMessage(topicName: string, payload: Uint8Array): void {
    const t = topic('state', config.value.deviceId)
    const s = topic('status', config.value.deviceId)
    const a = topic('ack', config.value.deviceId)

    if (topicName === t) {
      const parsed = parseState(payload)
      if (parsed) {
        deviceStore.handleState(parsed)
        logStore.push({ kind: 'state', text: `PC 状态：${parsed.pc === 'on' ? '开机' : '关机'}` })
      }
      return
    }
    if (topicName === s) {
      const parsed = parseStatus(payload)
      if (parsed) {
        deviceStore.handleStatus(parsed)
        logStore.push({
          kind: 'status',
          text: `设备${parsed.online ? '在线' : '离线（遗嘱）'}`,
        })
      }
      return
    }
    if (topicName === a) {
      const parsed = parseAck(payload)
      if (parsed) {
        lastAck.value = { at: Date.now(), result: parsed.result }
        commandStore.handleAck(parsed.result, parsed.nonce)
      }
      return
    }
    logStore.push({ kind: 'system', text: `收到未预期 topic：${topicName}` })
  }

  function connect(): void {
    errorMessage.value = ''
    if (!config.value.host.trim()) {
      errorMessage.value = '请填写 broker 主机名'
      return
    }
    if (!config.value.deviceId.trim()) {
      errorMessage.value = '请填写 device_id'
      return
    }
    disconnect()

    const c = config.value
    const clientId = c.clientId.trim() || DEFAULT_CLIENT_ID
    actualClientId.value = clientId
    const broker: BrokerConfig = {
      host: c.host.trim(),
      port: c.port,
      path: c.path,
      protocol: c.protocol,
      username: c.username.trim(),
      password: c.password,
      clientId,
      keepalive: c.keepalive,
      clean: c.clean,
      connectTimeoutMs: c.connectTimeoutMs,
      deviceId: c.deviceId.trim(),
    }
    savePersisted(c)

    service = new MqttService(broker, {
      onState: (next, d) => {
        state.value = next
        detail.value = d ?? ''
        if (next === 'connected') {
          connectedAt.value = Date.now()
          void subscribeAll()
        }
        if (next === 'error') errorMessage.value = d ?? '连接错误'
        if (next === 'reconnecting') reconnectAttempt.value = service?.getReconnectAttempt() ?? 0
        if (next === 'disconnected') {
          commandStore.handleDisconnect()
          deviceStore.markClientDisconnected()
        }
      },
      onMessage: (t, p) => handleMessage(t, p),
      onError: (err, ctx) => {
        errorMessage.value = `${ctx}: ${err.message}`
        logStore.push({ kind: 'error', text: `${ctx}: ${err.message}` })
      },
      onLog: (entry) => logStore.push(entry),
    })
    service.connect()
  }

  async function subscribeAll(): Promise<void> {
    if (!service) return
    const kinds: TopicKind[] = ['state', 'status', 'ack']
    const ok: string[] = []
    for (const kind of kinds) {
      try {
        await service.subscribe(topic(kind, config.value.deviceId.trim()))
        ok.push(topic(kind, config.value.deviceId.trim()))
      } catch (e) {
        logStore.push({
          kind: 'error',
          text: `订阅 ${kind} 失败：${e instanceof Error ? e.message : String(e)}`,
        })
      }
    }
    subscribedTopics.value = ok
    if (ok.length === kinds.length) {
      state.value = 'subscribed'
      logStore.push({ kind: 'system', text: '三个 topic 订阅完成' })
    }
  }

  function disconnect(): void {
    service?.disconnect()
    service = null
    state.value = 'idle'
    detail.value = ''
    subscribedTopics.value = []
    connectedAt.value = null
    reconnectAttempt.value = 0
  }

  /** 发布一条 QoS1 非 retained 消息。 */
  async function publish(target: string, payload: string): Promise<void> {
    if (!service) throw new Error('MQTT 未连接')
    await service.publish(target, payload, { qos: 1, retain: false })
  }

  function resetConfig(): void {
    disconnect()
    clearPersisted()
    config.value = resolveConfig()
  }

  return {
    config,
    state,
    detail,
    errorMessage,
    reconnectAttempt,
    connectedAt,
    subscribedTopics,
    lastAck,
    actualClientId,
    setConfig,
    connect,
    disconnect,
    resetConfig,
    publish,
    subscribeAll,
  }
})
