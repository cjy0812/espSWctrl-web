/**
 * 请求状态机 —— 应对「ack 的 nonce 恒为空、无法严格关联请求」这一固件现实。
 *
 * 设计要点（P0-2）：
 * - 单飞窗口：有在途请求时禁止发新指令（canSend = pending 为空）。
 * - 超时/断线 → 状态标记为 `unknown`（结果未知），**不是 failed**。
 * - 迟到的 ack 仍可安全归因：因为任一时刻最多只有一个可追溯请求。
 * - 支持人工确认：结果未知时由用户标记为已执行/未执行。
 * - 不自动重试；重试必须换新 nonce（由调用方保证）。
 */

import type { DeviceCommand } from './payloads'

export type RequestStatus = 'pending' | 'ok' | 'failed' | 'unknown'

export interface TrackedRequest {
  id: string
  cmd: DeviceCommand
  nonce: string
  ts: number
  ttl: number
  status: RequestStatus
  createdAt: number
  /** 收到 ack 的时间（ms） */
  ackAt?: number
  ackResult?: string
  /** 是否是一次「迟到回执」（超时后才收到 ack） */
  late?: boolean
  /** 结果未知的原因 */
  unknownReason?: 'timeout' | 'disconnect'
}

export interface RequestTrackerOptions {
  /** ack 超时（ms），默认 8000 */
  ackTimeoutMs?: number
  /** 可注入时钟，便于测试 */
  now?: () => number
  onTimeout?: (req: TrackedRequest) => void
  onLateAck?: (req: TrackedRequest) => void
}

let seq = 0

function nextId(): string {
  seq += 1
  return `req-${Date.now().toString(36)}-${seq}`
}

export class RequestTracker {
  private readonly ackTimeoutMs: number
  private readonly now: () => number
  private readonly onTimeout: ((req: TrackedRequest) => void) | undefined
  private readonly onLateAck: ((req: TrackedRequest) => void) | undefined
  private requests: TrackedRequest[] = []

  constructor(opts: RequestTrackerOptions = {}) {
    this.ackTimeoutMs = opts.ackTimeoutMs ?? 8_000
    this.now = opts.now ?? (() => Date.now())
    this.onTimeout = opts.onTimeout
    this.onLateAck = opts.onLateAck
  }

  /** 全部历史（含 pending/unknown），按添加顺序。 */
  get all(): readonly TrackedRequest[] {
    return this.requests
  }

  get pending(): readonly TrackedRequest[] {
    return this.requests.filter((r) => r.status === 'pending')
  }

  get unknown(): readonly TrackedRequest[] {
    return this.requests.filter((r) => r.status === 'unknown')
  }

  get latest(): TrackedRequest | null {
    const last = this.requests[this.requests.length - 1]
    return last ?? null
  }

  /** 单飞窗口：没有待解决请求时才允许发送。 */
  get canSend(): boolean {
    return this.pending.length === 0
  }

  /** 是否还有「结果未知」的请求需要人工确认。 */
  get needsConfirmation(): boolean {
    return this.unknown.length > 0
  }

  add(cmd: DeviceCommand, nonce: string, ts: number, ttl: number): TrackedRequest {
    if (!this.canSend) {
      throw new Error('已有在途请求，禁止并发发送（单飞窗口）')
    }
    const req: TrackedRequest = {
      id: nextId(),
      cmd,
      nonce,
      ts,
      ttl,
      status: 'pending',
      createdAt: this.now(),
    }
    this.requests.push(req)
    return req
  }

  private findById(id: string): TrackedRequest | undefined {
    return this.requests.find((r) => r.id === id)
  }

  /**
   * 处理一条 ack。
   * 优先按 nonce 精确匹配（为未来固件回填 nonce 预留），否则归因给唯一的
   * pending / unknown 请求；没有可归因对象时返回 null（orphan）。
   */
  handleAck(result: string, nonce?: string): TrackedRequest | null {
    let req: TrackedRequest | undefined
    if (nonce) {
      req = this.requests.find(
        (r) => r.nonce === nonce && r.status !== 'ok' && r.status !== 'failed',
      )
    }
    if (!req) {
      const traceable = this.requests.filter(
        (r) => r.status === 'pending' || r.status === 'unknown',
      )
      if (traceable.length === 1) req = traceable[0]
    }
    if (!req) return null

    const wasUnknown = req.status === 'unknown'
    req.ackResult = result
    req.ackAt = this.now()
    req.status = result === 'ok' ? 'ok' : 'failed'
    if (wasUnknown) {
      req.late = true
      this.onLateAck?.(req)
    }
    return req
  }

  /** 扫描超时：pending 且超过 ackTimeoutMs 的标记为 unknown。 */
  tick(): TrackedRequest[] {
    const now = this.now()
    const timedOut: TrackedRequest[] = []
    for (const req of this.requests) {
      if (req.status !== 'pending') continue
      if (now - req.createdAt >= this.ackTimeoutMs) {
        req.status = 'unknown'
        req.unknownReason = 'timeout'
        timedOut.push(req)
        this.onTimeout?.(req)
      }
    }
    return timedOut
  }

  /** 断线：所有 pending 标记为结果未知。 */
  handleDisconnect(): TrackedRequest[] {
    const affected: TrackedRequest[] = []
    for (const req of this.requests) {
      if (req.status === 'pending') {
        req.status = 'unknown'
        req.unknownReason = 'disconnect'
        affected.push(req)
      }
    }
    return affected
  }

  /** 人工确认：把结果未知的请求标记为已执行/未执行。 */
  resolveUnknown(id: string, executed: boolean): TrackedRequest | null {
    const req = this.findById(id)
    if (req?.status !== 'unknown') return null
    req.status = executed ? 'ok' : 'failed'
    req.ackResult = executed ? 'ok-manual' : 'not-executed'
    return req
  }

  /** 只保留最近 max 条历史。 */
  trim(max = 100): void {
    if (this.requests.length <= max) return
    const removable = this.requests.filter((r) => r.status !== 'pending' && r.status !== 'unknown')
    let excess = this.requests.length - max
    for (const req of removable) {
      if (excess <= 0) break
      const idx = this.requests.indexOf(req)
      if (idx >= 0) {
        this.requests.splice(idx, 1)
        excess -= 1
      }
    }
  }

  clear(): void {
    this.requests = []
  }
}
