#!/usr/bin/env node
/**
 * 端到端发送测试：向 psw/<device_id>/cmd 发一条指令并等待 ack。
 *
 * 用法：
 *   $env:MQTT_USER='...'; $env:MQTT_PASS='...'; pnpm mqtt:send press
 *
 * 注意：press_long 在 MVP 阶段不开放，本脚本也只支持 press。
 * 固件 ack 的 nonce 恒为空串，无法用 ack 关联请求，所以这里只做「收到 ack 即打印」。
 */

import mqtt from 'mqtt'

const cmd = process.argv[2] === 'press_long' ? 'press_long' : 'press'

const host = process.env.MQTT_HOST ?? ''
const port = Number(process.env.MQTT_PORT ?? 8084)
const path = process.env.MQTT_PATH ?? '/mqtt'
const username = process.env.MQTT_USER ?? ''
const password = process.env.MQTT_PASS ?? ''
const deviceId = process.env.MQTT_DEVICE_ID ?? 'pc01'

if (!host || !username || !password) {
  console.error('✗ 缺少 MQTT_HOST / MQTT_USER / MQTT_PASS（见 .env.example）')
  process.exit(1)
}

const url = `wss://${host}:${port}${path.startsWith('/') ? path : `/${path}`}`
const cmdTopic = `psw/${deviceId}/cmd`
const ackTopic = `psw/${deviceId}/ack`
const stateTopic = `psw/${deviceId}/state`

const payload = JSON.stringify({
  cmd,
  nonce: `send-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  ts: Math.floor(Date.now() / 1000),
})

console.log(`发送 ${cmd} → ${cmdTopic}`)
console.log(`payload: ${payload}`)

const client = mqtt.connect(url, {
  clientId: `sendtest-${Math.random().toString(36).slice(2, 8)}`,
  username,
  password,
  keepalive: 30,
  clean: true,
  connectTimeout: 10000,
  reconnectPeriod: 0,
  protocolId: 'MQTT',
  protocolVersion: 4,
})

let gotAck = false

let finished = false
function finish() {
  if (finished) return
  finished = true
  clearTimeout(timer)
  console.log(gotAck ? '已收到 ack，结束。' : '超时：未收到 ack。')
  try {
    client.end(true)
  } catch {
    /* 忽略 */
  }
  process.exit(gotAck ? 0 : 2)
}
const timer = setTimeout(finish, 10000)

client.on('connect', () => {
  client.subscribe([ackTopic, stateTopic], { qos: 1 }, (err) => {
    if (err) {
      console.error(`✗ 订阅失败：${err.message}`)
      return
    }
    client.publish(cmdTopic, payload, { qos: 1 }, (pubErr) => {
      console.log(pubErr ? `✗ 发布失败：${pubErr.message}` : '→ 已发布，等待 ack…')
    })
  })
})

client.on('message', (topic, payloadBuf) => {
  const text = payloadBuf.toString()
  if (topic === ackTopic) {
    gotAck = true
    console.log(`← ack: ${text}`)
    finish()
  } else {
    console.log(`← ${topic}: ${text}`)
  }
})

client.on('error', (err) => {
  console.error(`✗ MQTT 错误：${err.message}`)
})
