import { EventEmitter } from 'node:events'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MqttClient } from 'mqtt'
import mqtt from 'mqtt'

import { MqttService } from './mqttService'
import type { BrokerConfig, MqttServiceEvents } from './types'

vi.mock('mqtt', () => ({
  default: {
    connect: vi.fn(),
  },
}))

class FakeMqttClient extends EventEmitter {
  end(): void {}
  async subscribeAsync(): Promise<{ topic: string; qos: 1 }[]> {
    return []
  }
  async publishAsync(): Promise<void> {}
}

function setup() {
  const clients: FakeMqttClient[] = []
  vi.mocked(mqtt.connect).mockImplementation(() => {
    const client = new FakeMqttClient()
    clients.push(client)
    return client as unknown as MqttClient
  })

  const cfg: BrokerConfig = {
    host: 'broker.example',
    port: 8084,
    path: '/mqtt',
    protocol: 'wss',
    username: '',
    password: '',
    clientId: 'controller',
    keepalive: 30,
    clean: true,
    connectTimeoutMs: 10_000,
    deviceId: 'pc01',
  }
  const events: MqttServiceEvents = {
    onState: vi.fn(),
    onMessage: vi.fn(),
    onError: vi.fn(),
    onLog: vi.fn(),
  }
  return { service: new MqttService(cfg, events), clients }
}

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('MqttService 重连退避', () => {
  it('连续断线时递增退避，成功连接后重置计数', async () => {
    vi.useFakeTimers()
    const { service, clients } = setup()

    service.connect()
    expect(mqtt.connect).toHaveBeenCalledTimes(1)

    clients[0]?.emit('close')
    expect(service.getReconnectAttempt()).toBe(1)
    await vi.advanceTimersByTimeAsync(999)
    expect(mqtt.connect).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(mqtt.connect).toHaveBeenCalledTimes(2)

    clients[1]?.emit('close')
    expect(service.getReconnectAttempt()).toBe(2)
    await vi.advanceTimersByTimeAsync(1999)
    expect(mqtt.connect).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(1)
    expect(mqtt.connect).toHaveBeenCalledTimes(3)

    clients[2]?.emit('connect')
    expect(service.getReconnectAttempt()).toBe(0)
    service.disconnect()
  })
})
