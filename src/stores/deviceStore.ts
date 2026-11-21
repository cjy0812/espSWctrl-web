import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

/**
 * 设备状态四态模型（P1-6）：
 *  - unknown：尚未收到任何 status
 *  - online ：设备在线（status=true）
 *  - offline：设备离线（LWT 遗嘱 status=false）
 *  - stale  ：超过阈值未更新（不等于离线，设备可能还在，只是上报停了）
 */
export type DevicePresence = 'unknown' | 'online' | 'offline' | 'stale'

export const useDeviceStore = defineStore('device', () => {
  const presence = ref<DevicePresence>('unknown')
  const pc = ref<'on' | 'off' | null>(null)
  const lastStateAt = ref<number | null>(null)
  const lastStatusAt = ref<number | null>(null)

  /** stale 阈值（秒），默认按固件 status_s 30 秒的 3 倍 */
  const staleAfterSeconds = ref(90)

  const online = computed(() => presence.value === 'online')
  const pcOn = computed(() => pc.value === 'on')

  function handleState(payload: { pc: 'on' | 'off' }): void {
    pc.value = payload.pc
    lastStateAt.value = Date.now()
  }

  function handleStatus(payload: { online: boolean }): void {
    presence.value = payload.online ? 'online' : 'offline'
    lastStatusAt.value = Date.now()
  }

  /** 由定时器调用：长时间未收到 status 则标 stale。 */
  function markStale(): void {
    if (presence.value === 'unknown') return
    if (presence.value === 'offline') return
    if (lastStatusAt.value === null) {
      presence.value = 'stale'
      return
    }
    const elapsed = (Date.now() - lastStatusAt.value) / 1000
    if (elapsed > staleAfterSeconds.value) presence.value = 'stale'
  }

  /** 客户端自身断线：设备状态保留最后值并标 stale（不要显示成设备离线）。 */
  function markClientDisconnected(): void {
    if (presence.value === 'online') presence.value = 'stale'
  }

  function reset(): void {
    presence.value = 'unknown'
    pc.value = null
    lastStateAt.value = null
    lastStatusAt.value = null
  }

  return {
    presence,
    pc,
    lastStateAt,
    lastStatusAt,
    staleAfterSeconds,
    online,
    pcOn,
    handleState,
    handleStatus,
    markStale,
    markClientDisconnected,
    reset,
  }
})
