<script setup lang="ts">
import { computed } from 'vue'

import { usePowerController } from '@/composables/usePowerController'
import { useConnectionStore } from '@/stores/connectionStore'
import type { DevicePresence } from '@/stores/deviceStore'
import { useDeviceStore } from '@/stores/deviceStore'
import { relativeTime } from '@/utils/time'

const device = useDeviceStore()
const connection = useConnectionStore()
const { refreshState } = usePowerController()

const PRESENCE: Record<DevicePresence, { label: string; type: 'default' | 'success' | 'error' | 'warning' }> = {
  unknown: { label: '未知', type: 'default' },
  online: { label: '在线', type: 'success' },
  offline: { label: '离线', type: 'error' },
  stale: { label: '状态过期', type: 'warning' },
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
  <n-card size="small" :bordered="false" title="设备状态">
    <n-space vertical :size="12">
      <n-space align="center" justify="space-between">
        <n-text>设备</n-text>
        <n-tag :type="presence.type" size="small" :bordered="false">{{ presence.label }}</n-tag>
      </n-space>
      <n-space align="center" justify="space-between">
        <n-text>PC 电源</n-text>
        <n-text strong>{{ pcLabel }}</n-text>
      </n-space>
      <n-space align="center" justify="space-between">
        <n-text>最后更新</n-text>
        <n-space align="center" :size="8">
          <n-text depth="3">{{ lastUpdate }}</n-text>
          <n-button
            size="tiny"
            :disabled="connection.state !== 'subscribed'"
            @click="refreshState"
          >
            刷新
          </n-button>
        </n-space>
      </n-space>
    </n-space>
  </n-card>
</template>
