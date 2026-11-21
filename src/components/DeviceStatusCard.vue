<script setup lang="ts">
import { computed } from 'vue'

import { usePowerController } from '@/composables/usePowerController'
import type { DevicePresence } from '@/stores/deviceStore'
import { useConnectionStore } from '@/stores/connectionStore'
import { useDeviceStore } from '@/stores/deviceStore'
import { relativeTime } from '@/utils/time'

const device = useDeviceStore()
const connection = useConnectionStore()
const { refreshState } = usePowerController()

const PRESENCE: Record<DevicePresence, { label: string; cls: string }> = {
  unknown: { label: '未知', cls: 'badge--muted' },
  online: { label: '在线', cls: 'badge--ok' },
  offline: { label: '离线', cls: 'badge--off' },
  stale: { label: '状态过期', cls: 'badge--stale' },
}

const presence = computed(() => PRESENCE[device.presence])

const pcLabel = computed(() => {
  if (device.pc === 'on') return '开机'
  if (device.pc === 'off') return '关机'
  return '未知'
})

const lastUpdate = computed(() => {
  const ts = device.lastStatusAt ?? device.lastStateAt
  return ts ? relativeTime(Math.floor(ts / 1000)) : '暂无'
})
</script>

<template>
  <section class="card">
    <div class="row">
      <span class="row__label">设备</span>
      <span class="badge" :class="presence.cls">{{ presence.label }}</span>
    </div>
    <div class="row">
      <span class="row__label">PC 电源</span>
      <span class="row__value">{{ pcLabel }}</span>
    </div>
    <div class="row">
      <span class="row__label">最后更新</span>
      <span class="row__value muted">{{ lastUpdate }}</span>
      <button
        class="btn small"
        :disabled="connection.state !== 'subscribed'"
        type="button"
        @click="refreshState"
      >
        刷新
      </button>
    </div>
  </section>
</template>
