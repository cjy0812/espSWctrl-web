#!/usr/bin/env node
/**
 * Broker 只读探测（阶段 0 验收用）。
 *
 * 默认只做：连接 → 订阅三个具体 topic → 打印 SUBACK → 打印 retained 消息。
 * 绝不主动发 press 指令。
 *
 * 用法：
 *   $env:MQTT_USER='...'; $env:MQTT_PASS='...'; pnpm mqtt:probe
 *   pnpm mqtt:probe -- --allow-press      # 额外发一次 press（端到端，会真实按键）
 *   pnpm mqtt:probe -- --duplicate-test   # 额外做重复 nonce 测试（会真实按两次）
 *
 * 凭据只从环境变量读取，不写入文件、不打印。
 */

import mqtt from 'mqtt'

const argv = process.argv.slice(2)
const allowPress = argv.includes('--allow-press')
const duplicateTest = argv.includes('--duplicate-test')

const host = process.env.MQTT_HOST ?? ''
const port = Number(process.env.MQTT_PORT ?? 8084)
const path = process.env.MQTT_PATH ?? '/mqtt'
const username = process.env.MQTT_USER ?? ''
const password = process.env.MQTT_PASS ?? ''
const deviceId = process.env.MQTT_DEVICE_ID ?? 'pc01'

function fail(msg) {
  console.error(`✗ ${msg}`)
  process.exit(1)
}

if (!host) fail('缺少 MQTT_HOST（见 .env.example）')
if (!username) fail('缺少 MQTT_USER')
if (!password) fail('缺少 MQTT_PASS')

const topics = {
  state: `psw/${deviceId}/state`,
  status: `psw/${deviceId}/status`,
  ack: `psw/${deviceId}/ack`,
}

console.log('=== MQTT over WebSocket 探测 ===')
console.log(`broker   : wss://${host}:${port}${path}`)
console.log(`username : ${username}`)
console.log(`device_id: ${deviceId}`)
console.log(`topic    : ${Object.values(topics).join(' / ')}`)
console.log('')

const url = `wss://${host}:${port}${path.startsWith('/') ? path : `/${path}`}`
const clientId = `probe-${Math.random().toString(36).slice(2, 8)}`

const client = mqtt.connect(url, {
  clientId,
  username,
  password,
  keepalive: 30,
  clean: true,
  connectTimeout: 10000,
  reconnectPeriod: 0,
  protocolId: 'MQTT',
  protocolVersion: 4,
})

const retained = []
let subscribedCount = 0
let connackOk = false
const subscribeResults = []

const timer = setTimeout(() => {
  console.log('')
  console.log('=== 探测结束（超时） ===')
  finish()
}, 12000)

client.on('connect', () => {
  connackOk = true
  console.log('✓ CONNACK 已接受（return code 0）')
  // 三个 topic 分别订阅，逐个记录 granted
  for (const [name, topic] of Object.entries(topics)) {
    client.subscribe(topic, { qos: 1 }, (err, granted) => {
      subscribedCount += 1
      if (err) {
        subscribeResults.push({ name, topic, ok: false, error: err.message })
        console.log(`✗ 订阅 ${name} 失败：${err.message}`)
      } else {
        const codes = (granted ?? []).map((g) => g.qos)
        const ok = codes.every((c) => c === 1)
        subscribeResults.push({ name, topic, ok, codes })
        console.log(`${ok ? '✓' : '✗'} 订阅 ${name}（${topic}）granted=${JSON.stringify(codes)}`)
      }
      if (subscribedCount === Object.keys(topics).length) {
        console.log('')
        console.log('订阅阶段完成，等待 retained 消息…')
      }
    })
  }
})

client.on('message', (topic, payload) => {
  const text = payload.toString()
  retained.push({ topic, text })
  console.log(`← retained/消息 ${topic}  ${text}`)
})

client.on('error', (err) => {
  console.error(`✗ MQTT 错误：${err.message}`)
})

function finish() {
  clearTimeout(timer)
  console.log('')
  console.log('=== 结果汇总 ===')
  console.log(`CONNACK 接受 : ${connackOk ? '是' : '否'}`)
  console.log(
    `订阅成功     : ${subscribeResults.filter((r) => r.ok).length}/${Object.keys(topics).length}`,
  )
  console.log(`收到消息     : ${retained.length} 条`)
  const state = retained.find((r) => r.topic === topics.state)
  const status = retained.find((r) => r.topic === topics.status)
  console.log(`retained state : ${state ? state.text : '（未收到）'}`)
  console.log(`retained status: ${status ? status.text : '（未收到）'}`)
  try {
    client.end(true)
  } catch {
    /* 忽略 */
  }
  const pass = connackOk && subscribeResults.length === 3 && subscribeResults.every((r) => r.ok)
  console.log(pass ? '\n结论：通过' : '\n结论：未完全通过（见上方失败项）')
  process.exit(pass ? 0 : 2)
}

if (allowPress || duplicateTest) {
  console.log('')
  console.log(`⚠ 已启用发指令模式：将向 psw/${deviceId}/cmd 发布 press`)
}

client.on('connect', () => {
  if (!allowPress && !duplicateTest) return
  const nonce = `probe-${Date.now()}`
  const payload = JSON.stringify({ cmd: 'press', nonce, ts: Math.floor(Date.now() / 1000) })
  client.publish(topics.cmd, payload, { qos: 1 }, (err) => {
    console.log(err ? `✗ 发布失败：${err.message}` : `→ 已发布 press（nonce=${nonce}）`)
  })
  if (duplicateTest) {
    client.publish(topics.cmd, payload, { qos: 1 }, (err) => {
      console.log(
        err ? `✗ 重复发布失败：${err.message}` : '→ 已用同一 nonce 重复发布（预期收到 replay）',
      )
    })
  }
})
