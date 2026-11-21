import { onScopeDispose } from 'vue'

import { buildCmdPayload, encodePayload } from '@/protocol/payloads'
import { topic } from '@/protocol/topics'
import { useCommandStore } from '@/stores/commandStore'
import { useConnectionStore } from '@/stores/connectionStore'
import { useDeviceStore } from '@/stores/deviceStore'
import { useLogStore } from '@/stores/logStore'

/**
 * 设备控制编排：发送 press、超时扫描、结果未知的人工确认、状态刷新。
 *
 * MVP 只发 `press`（P0-4：press_long 不开放）。
 */
export function usePowerController() {
  const connection = useConnectionStore()
  const commands = useCommandStore()
  const device = useDeviceStore()
  const log = useLogStore()

  let timer: ReturnType<typeof setInterval> | null = null

  function ensureTicker(): void {
    if (timer) return
    timer = setInterval(() => {
      commands.tick()
      device.markStale()
    }, 1000)
  }

  function stopTicker(): void {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  /** 发送「模拟短按电源键」。单飞窗口由 commandStore 保证。 */
  async function press(): Promise<boolean> {
    if (connection.state !== 'subscribed') {
      log.push({ kind: 'error', text: '尚未完成订阅，无法发送指令' })
      return false
    }
    if (!commands.canSend()) {
      log.push({ kind: 'system', text: '已有在途指令：请等待回执，或先确认上一条的结果' })
      return false
    }
    const c = connection.config
    const payload = buildCmdPayload('press', { ttl: c.ttl })
    commands.send(payload.cmd, payload.nonce, payload.ts, payload.ttl ?? c.ttl)
    try {
      await connection.publish(topic('cmd', c.deviceId.trim()), encodePayload(payload))
      log.push({
        kind: 'send',
        text: '已发送 press',
        meta: { nonce: payload.nonce, ts: payload.ts, ttl: payload.ttl },
      })
      ensureTicker()
      return true
    } catch (e) {
      log.push({ kind: 'error', text: `发送失败：${e instanceof Error ? e.message : String(e)}` })
      return false
    }
  }

  /** 人工确认某条「结果未知」的请求。 */
  function confirmUnknown(id: string, executed: boolean): void {
    commands.resolveUnknown(id, executed)
  }

  /**
   * 刷新状态：协议没有「请求当前状态」的指令，设备按 status_s 周期上报。
   * 重新订阅会让 broker 重推 retained 的 state/status，这是最接近「刷新」的操作。
   */
  async function refreshState(): Promise<void> {
    if (connection.state !== 'subscribed' && connection.state !== 'connected') {
      log.push({ kind: 'error', text: '未连接，无法刷新状态' })
      return
    }
    await connection.subscribeAll()
    log.push({ kind: 'system', text: '已重新订阅，等待 retained 状态…' })
  }

  onScopeDispose(stopTicker)

  return { press, confirmUnknown, refreshState, stopTicker }
}
