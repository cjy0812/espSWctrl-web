import { describe, expect, it } from 'vitest'

import { assertValidDeviceId, topic, topics } from '../topics'

describe('topic', () => {
  it('产出 psw/<id>/<kind>，无前导斜杠', () => {
    expect(topic('cmd', 'pc01')).toBe('psw/pc01/cmd')
    expect(topic('state', 'pc01')).toBe('psw/pc01/state')
    expect(topic('status', 'pc01')).toBe('psw/pc01/status')
    expect(topic('ack', 'pc01')).toBe('psw/pc01/ack')
  })

  it('产出不以 / 开头（历史踩坑回归）', () => {
    for (const kind of ['cmd', 'state', 'status', 'ack'] as const) {
      expect(topic(kind, 'pc01').startsWith('/')).toBe(false)
    }
  })

  it('拒绝非法 device_id', () => {
    expect(() => topic('cmd', '')).toThrow()
    expect(() => topic('cmd', 'a/b')).toThrow()
    expect(() => topic('cmd', 'x'.repeat(33))).toThrow()
    expect(assertValidDeviceId('pc-01_A')).toBeUndefined()
  })

  it('topics() 一次给出全部', () => {
    expect(topics('pc01')).toEqual({
      cmd: 'psw/pc01/cmd',
      state: 'psw/pc01/state',
      status: 'psw/pc01/status',
      ack: 'psw/pc01/ack',
    })
  })
})
