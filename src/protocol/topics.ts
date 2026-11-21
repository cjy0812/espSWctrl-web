/**
 * MQTT topic 构造。
 *
 * ⚠️ 历史踩坑：topic 曾写成 `/psw/pc01/status`（开头多一个 `/`），与固件
 * 订阅的 topic 不匹配，消息发不出去。这里对产出做断言，并配单测覆盖。
 *
 * 固件 topic 前缀：psw/<device_id>/{cmd,state,status,ack}（src/consts.rs、src/mqtt.rs）
 */

import { DEVICE_ID_PATTERN } from '@/config/defaults'

export type TopicKind = 'cmd' | 'state' | 'status' | 'ack'

export function assertValidDeviceId(deviceId: string): void {
  if (!DEVICE_ID_PATTERN.test(deviceId)) {
    throw new Error(`device_id 不合法：${deviceId}（只允许 ASCII 字母数字与 _-，最长 32）`)
  }
}

/** 构造 topic。产出永远以 `psw/` 开头，绝不带前导斜杠。 */
export function topic(kind: TopicKind, deviceId: string): string {
  assertValidDeviceId(deviceId)
  const t = `psw/${deviceId}/${kind}`
  if (t.startsWith('/')) {
    // 理论上到不了这里；保留作为回归防线。
    throw new Error(`topic 出现前导斜杠：${t}`)
  }
  return t
}

export function topics(deviceId: string): Record<TopicKind, string> {
  return {
    cmd: topic('cmd', deviceId),
    state: topic('state', deviceId),
    status: topic('status', deviceId),
    ack: topic('ack', deviceId),
  }
}
