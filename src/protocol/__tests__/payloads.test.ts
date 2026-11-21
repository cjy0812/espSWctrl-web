import { describe, expect, it } from 'vitest'

import {
  buildCmdPayload,
  encodePayload,
  parseAck,
  parseCmd,
  parseState,
  parseStatus,
} from '../payloads'

function enc(s: string): Uint8Array {
  return new TextEncoder().encode(s)
}

describe('buildCmdPayload', () => {
  it('生成 cmd/nonce/ts 三个必需字段', () => {
    const p = buildCmdPayload('press')
    expect(p.cmd).toBe('press')
    expect(typeof p.nonce).toBe('string')
    expect(p.nonce.length).toBeGreaterThan(0)
    expect(p.ts).toBeGreaterThan(0)
    expect(p.ttl).toBeUndefined()
  })

  it('接受显式 nonce/ts/ttl', () => {
    const p = buildCmdPayload('press', { nonce: 'abc', ts: 1234, ttl: 60 })
    expect(p).toEqual({ cmd: 'press', nonce: 'abc', ts: 1234, ttl: 60 })
  })

  it('nonce 每次不同', () => {
    const a = buildCmdPayload('press')
    const b = buildCmdPayload('press')
    expect(a.nonce).not.toBe(b.nonce)
  })
})

describe('parseCmd', () => {
  it('解析合法报文', () => {
    const raw = enc('{"cmd":"press","nonce":"n1","ts":1700000000}')
    expect(parseCmd(raw)).toEqual({ cmd: 'press', nonce: 'n1', ts: 1700000000 })
  })

  it('接受浮点 ts（固件截断取整）', () => {
    const raw = enc('{"cmd":"press","nonce":"n1","ts":1700000000.9}')
    expect(parseCmd(raw)?.ts).toBe(1700000000)
  })

  it('拒绝未知指令', () => {
    expect(parseCmd(enc('{"cmd":"on","nonce":"n1","ts":1}'))).toBeNull()
  })

  it('拒绝空 nonce / 非数字 ts / 非对象', () => {
    expect(parseCmd(enc('{"cmd":"press","nonce":"","ts":1}'))).toBeNull()
    expect(parseCmd(enc('{"cmd":"press","nonce":"n","ts":"1"}'))).toBeNull()
    expect(parseCmd(enc('[1,2]'))).toBeNull()
    expect(parseCmd(enc('not json'))).toBeNull()
  })
})

describe('parseAck', () => {
  it('解析固件实际格式（nonce 恒为空串）', () => {
    expect(parseAck(enc('{"nonce":"","result":"ok"}'))).toEqual({ nonce: '', result: 'ok' })
  })

  it('缺少 nonce 字段时补空串', () => {
    expect(parseAck(enc('{"result":"busy"}'))).toEqual({ nonce: '', result: 'busy' })
  })

  it('拒绝无 result 的报文', () => {
    expect(parseAck(enc('{"nonce":""}'))).toBeNull()
    expect(parseAck(enc('garbage'))).toBeNull()
  })
})

describe('parseState / parseStatus', () => {
  it('解析 state', () => {
    expect(parseState(enc('{"pc":"on"}'))).toEqual({ pc: 'on' })
    expect(parseState(enc('{"pc":"off"}'))).toEqual({ pc: 'off' })
    expect(parseState(enc('{"pc":"weird"}'))).toBeNull()
  })

  it('解析 status', () => {
    expect(parseStatus(enc('{"online":true}'))).toEqual({ online: true })
    expect(parseStatus(enc('{"online":false}'))).toEqual({ online: false })
    expect(parseStatus(enc('{"online":"true"}'))).toBeNull()
  })
})

describe('encodePayload', () => {
  it('可序列化', () => {
    const p = buildCmdPayload('press', { nonce: 'n', ts: 5, ttl: 30 })
    expect(JSON.parse(encodePayload(p))).toEqual(p)
  })
})
