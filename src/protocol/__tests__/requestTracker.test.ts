import { describe, expect, it, vi } from 'vitest'

import { RequestTracker } from '../requestTracker'

function makeTracker(start = 0) {
  let now = start
  const tracker = new RequestTracker({ ackTimeoutMs: 1000, now: () => now })
  return {
    tracker,
    advance(ms: number) {
      now += ms
    },
    now: () => now,
  }
}

describe('单飞窗口', () => {
  it('pending 期间 canSend 为 false', () => {
    const { tracker } = makeTracker()
    expect(tracker.canSend).toBe(true)
    tracker.add('press', 'n1', 1, 30)
    expect(tracker.canSend).toBe(false)
  })

  it('重复 add 抛错', () => {
    const { tracker } = makeTracker()
    tracker.add('press', 'n1', 1, 30)
    expect(() => tracker.add('press', 'n2', 1, 30)).toThrow(/单飞/)
  })

  it('unknown 期间继续锁定窗口，直到人工确认', () => {
    const { tracker } = makeTracker()
    const req = tracker.add('press', 'n1', 1, 30)
    tracker.handleDisconnect()

    expect(tracker.canSend).toBe(false)
    expect(() => tracker.add('press', 'n2', 2, 30)).toThrow(/未解决/)
    expect(tracker.resolveUnknown(req.id, false)?.status).toBe('failed')
    expect(tracker.canSend).toBe(true)
    expect(tracker.add('press', 'n2', 2, 30).status).toBe('pending')
  })
})

describe('超时与迟到回执', () => {
  it('超时后标记为 unknown 并继续锁定发送窗口', () => {
    let now = 0
    const onTimeout = vi.fn()
    const t = new RequestTracker({ ackTimeoutMs: 1000, now: () => now, onTimeout })
    t.add('press', 'n1', 1, 30)
    expect(t.canSend).toBe(false)

    now = 1500
    const timedOut = t.tick()
    expect(timedOut).toHaveLength(1)
    expect(timedOut[0]?.status).toBe('unknown')
    expect(timedOut[0]?.unknownReason).toBe('timeout')
    expect(t.canSend).toBe(false)
    expect(onTimeout).toHaveBeenCalledTimes(1)
  })

  it('超时 → unknown，随后迟到 ack 归因并释放窗口', () => {
    let now = 0
    const onLateAck = vi.fn()
    const t = new RequestTracker({ ackTimeoutMs: 1000, now: () => now, onLateAck })
    t.add('press', 'n1', 1, 30)

    now = 1500
    const timedOut = t.tick()
    expect(timedOut).toHaveLength(1)
    expect(timedOut[0]?.status).toBe('unknown')
    expect(t.canSend).toBe(false)

    const resolved = t.handleAck('ok')
    expect(resolved?.status).toBe('ok')
    expect(resolved?.late).toBe(true)
    expect(t.canSend).toBe(true)
    expect(onLateAck).toHaveBeenCalledTimes(1)
  })

  it('正常 ack 不触发 onLateAck', () => {
    const now = 0
    const onLateAck = vi.fn()
    const t = new RequestTracker({ ackTimeoutMs: 1000, now: () => now, onLateAck })
    t.add('press', 'n1', 1, 30)
    const r = t.handleAck('ok')
    expect(r?.status).toBe('ok')
    expect(r?.late).toBeUndefined()
    expect(onLateAck).not.toHaveBeenCalled()
  })
})

describe('handleAck 归因', () => {
  it('无在途请求时返回 null（orphan）', () => {
    const { tracker } = makeTracker()
    expect(tracker.handleAck('ok')).toBeNull()
  })

  it('优先按 nonce 精确匹配', () => {
    const now = 0
    const t = new RequestTracker({ ackTimeoutMs: 1000, now: () => now })
    const a = t.add('press', 'aaa', 1, 30)
    const resolved = t.handleAck('ok', 'aaa')
    expect(resolved?.id).toBe(a.id)
  })

  it('nonce 不匹配时归因给唯一在途请求', () => {
    const now = 0
    const t = new RequestTracker({ ackTimeoutMs: 1000, now: () => now })
    t.add('press', 'aaa', 1, 30)
    expect(t.handleAck('busy', 'other')?.status).toBe('failed')
  })
})

describe('断线与人工确认', () => {
  it('断线把 pending 标为 unknown 并锁定发送窗口', () => {
    const { tracker } = makeTracker()
    tracker.add('press', 'n1', 1, 30)
    const affected = tracker.handleDisconnect()
    expect(affected).toHaveLength(1)
    expect(affected[0]?.unknownReason).toBe('disconnect')
    expect(tracker.needsConfirmation).toBe(true)
    expect(tracker.canSend).toBe(false)
  })

  it('人工确认可标记为已执行/未执行并释放窗口', () => {
    const { tracker } = makeTracker()
    const req = tracker.add('press', 'n1', 1, 30)
    tracker.handleDisconnect()
    const r = tracker.resolveUnknown(req.id, true)
    expect(r?.status).toBe('ok')
    expect(r?.ackResult).toBe('ok-manual')
    expect(tracker.needsConfirmation).toBe(false)
    expect(tracker.canSend).toBe(true)
  })

  it('人工确认只能作用于 unknown 状态', () => {
    const { tracker } = makeTracker()
    const req = tracker.add('press', 'n1', 1, 30)
    expect(tracker.resolveUnknown(req.id, true)).toBeNull()
  })
})

describe('历史记录上限', () => {
  it('保留最近 100 条已解决记录', () => {
    const { tracker } = makeTracker()
    for (let i = 0; i < 105; i += 1) {
      tracker.add('press', `n${i}`, i, 30)
      tracker.handleAck('ok')
      tracker.trim(100)
    }

    expect(tracker.all).toHaveLength(100)
    expect(tracker.all[0]?.nonce).toBe('n5')
    expect(tracker.all.at(-1)?.nonce).toBe('n104')
  })

  it('裁剪历史时保留未解决请求', () => {
    const { tracker } = makeTracker()
    for (let i = 0; i < 100; i += 1) {
      tracker.add('press', `n${i}`, i, 30)
      tracker.handleAck('ok')
    }
    const pending = tracker.add('press', 'active', 101, 30)

    tracker.trim(100)

    expect(tracker.all).toHaveLength(100)
    expect(tracker.all.some((request) => request.id === pending.id)).toBe(true)
    expect(tracker.canSend).toBe(false)
  })
})
