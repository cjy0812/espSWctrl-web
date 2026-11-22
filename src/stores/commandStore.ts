import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'

import { describeAck } from '@/protocol/ack'
import type { DeviceCommand } from '@/protocol/payloads'
import type { TrackedRequest } from '@/protocol/requestTracker'
import { RequestTracker } from '@/protocol/requestTracker'
import { useLogStore } from './logStore'

const ACK_TIMEOUT_MS = 8_000

export const useCommandStore = defineStore('command', () => {
  const logStore = useLogStore()

  // shallowRef：tracker 内部可变，变更后由 refresh() 显式触发更新。
  const tracker = new RequestTracker({
    ackTimeoutMs: ACK_TIMEOUT_MS,
    onTimeout: (req) => {
      logStore.push({
        kind: 'error',
        text: `未收到回执（${req.cmd}），结果未知 —— 请勿重复发送，先确认 PC 状态`,
        meta: { id: req.id, nonce: req.nonce },
      })
    },
    onLateAck: (req) => {
      logStore.push({
        kind: 'ack',
        text: `迟到回执：指令实际${req.status === 'ok' ? '已执行' : `被拒（${req.ackResult ?? ''}）`}`,
        meta: { id: req.id },
      })
    },
  })

  const requests = shallowRef<TrackedRequest[]>([])
  const lastError = ref('')

  function refresh(): void {
    // Keep only a bounded diagnostic history; pending/unknown requests are never trimmed.
    tracker.trim(100)
    requests.value = [...tracker.all]
  }

  /** 单飞窗口是否允许发送。 */
  function canSend(): boolean {
    return tracker.canSend
  }

  function send(cmd: DeviceCommand, nonce: string, ts: number, ttl: number): TrackedRequest {
    const req = tracker.add(cmd, nonce, ts, ttl)
    refresh()
    return req
  }

  function handleAck(result: string, nonce?: string): void {
    const resolved = tracker.handleAck(result, nonce)
    if (!resolved) {
      logStore.push({ kind: 'ack', text: `收到无法归因的回执：${result}`, meta: { result, nonce } })
    } else {
      const meta = describeAck(result)
      logStore.push({
        kind: 'ack',
        text: `回执：${resolved.cmd} → ${meta.label}${meta.hint ? `（${meta.hint}）` : ''}`,
        meta: { id: resolved.id, result, tone: meta.tone, late: resolved.late },
      })
    }
    refresh()
  }

  function handleDisconnect(): void {
    const affected = tracker.handleDisconnect()
    if (affected.length > 0) {
      logStore.push({
        kind: 'error',
        text: `连接断开，${affected.length} 条指令结果未知（请勿重复发送）`,
      })
    }
    refresh()
  }

  /** 人工确认结果未知的请求。 */
  function resolveUnknown(id: string, executed: boolean): void {
    const r = tracker.resolveUnknown(id, executed)
    if (r) {
      logStore.push({
        kind: 'system',
        text: `人工确认：${r.cmd} ${executed ? '已执行' : '未执行'}`,
      })
    }
    refresh()
  }

  /** 由定时器调用，返回超时的请求。 */
  function tick(): void {
    // The ticker runs every second; avoid replacing the reactive array when nothing timed out.
    if (tracker.tick().length > 0) refresh()
  }

  function clearHistory(): void {
    tracker.clear()
    refresh()
  }

  return {
    requests,
    lastError,
    canSend,
    send,
    handleAck,
    handleDisconnect,
    resolveUnknown,
    tick,
    clearHistory,
  }
})
