import { describe, expect, it } from 'vitest'

import { maskSensitive, maskText } from '../mask'

describe('maskSensitive', () => {
  it('脱敏 password 等敏感字段的值', () => {
    const input = { username: 'u1', password: 'secret', nested: { apiKey: 'k' } }
    expect(maskSensitive(input)).toEqual({
      username: 'u1',
      password: '***',
      nested: { apiKey: '***' },
    })
  })

  it('不误伤正常字段', () => {
    expect(maskSensitive({ host: 'example.com', port: 8084 })).toEqual({
      host: 'example.com',
      port: 8084,
    })
  })

  it('处理数组与循环引用', () => {
    const arr = [{ token: 't1' }, { token: 't2' }]
    expect(maskSensitive(arr)).toEqual([{ token: '***' }, { token: '***' }])

    const cyclic: Record<string, unknown> = { name: 'x' }
    cyclic.self = cyclic
    expect(maskSensitive(cyclic)).toEqual({ name: 'x', self: '[Circular]' })
  })
})

describe('maskText', () => {
  it('替换 password=value 形式', () => {
    expect(maskText('password=abc123 host=x')).toBe('password=*** host=x')
    expect(maskText('{"password":"abc","user":"u"}')).toBe('{"password":"***","user":"u"}')
  })

  it('普通文本不受影响', () => {
    expect(maskText('已连接 broker')).toBe('已连接 broker')
  })
})
