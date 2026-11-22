<script setup lang="ts">
import { computed, defineAsyncComponent, ref } from 'vue'

import ConnectionSettingsDrawer from '@/components/ConnectionSettingsDrawer.vue'
import DeviceStatusCard from '@/components/DeviceStatusCard.vue'
import DiagnosticsPanel from '@/components/DiagnosticsPanel.vue'
import PowerButton from '@/components/PowerButton.vue'
import type { MqttConnectionState } from '@/mqtt/types'
import { useConnectionStore } from '@/stores/connectionStore'

const LogTimeline = defineAsyncComponent(() => import('@/components/LogTimeline.vue'))
const ParamsReadout = defineAsyncComponent(() => import('@/components/ParamsReadout.vue'))

const props = defineProps<{ isDark: boolean }>()
const emit = defineEmits<{ toggleTheme: [] }>()

const tab = ref<'status' | 'logs' | 'params'>('status')
const showSettings = ref(false)
const connection = useConnectionStore()

const LABELS: Record<MqttConnectionState, string> = {
  idle: '未连接',
  connecting: '连接中…',
  connected: '已连接',
  subscribed: '已订阅',
  reconnecting: '重连中',
  disconnected: '已断开',
  error: '连接出错',
}

const label = computed(() => LABELS[connection.state])

const tagType = computed(() => {
  if (connection.state === 'subscribed') return 'success'
  if (connection.state === 'error') return 'error'
  if (connection.state === 'reconnecting' || connection.state === 'connecting') return 'warning'
  return 'default'
})

const themeLabel = computed(() => (props.isDark ? '浅色' : '深色'))
</script>

<template>
  <n-card size="small" :bordered="false">
    <n-tabs v-model:value="tab" type="line" animated size="small">
      <n-tab name="status" tab="状态" />
      <n-tab name="logs" tab="日志" />
      <n-tab name="params" tab="参数" />
    </n-tabs>

    <n-divider />

    <n-space vertical :size="16">
      <n-space align="center" justify="space-between" :size="12">
        <n-text strong>电源键控制器</n-text>
        <n-space align="center" :size="8">
          <n-tag :type="tagType" size="small" :bordered="false">{{ label }}</n-tag>
          <n-button size="small" @click="emit('toggleTheme')">{{ themeLabel }}</n-button>
          <n-button size="small" @click="showSettings = true">设置</n-button>
        </n-space>
      </n-space>

      <n-alert v-if="connection.errorMessage" type="error" :bordered="false">
        {{ connection.errorMessage }}
      </n-alert>

      <template v-if="tab === 'status'">
        <DeviceStatusCard />
        <PowerButton />
        <DiagnosticsPanel />
      </template>
      <LogTimeline v-else-if="tab === 'logs'" />
      <ParamsReadout v-else />
    </n-space>
  </n-card>

  <n-drawer v-model:show="showSettings" :width="420" placement="right">
    <n-drawer-content title="连接设置" closable>
      <ConnectionSettingsDrawer @close="showSettings = false" />
    </n-drawer-content>
  </n-drawer>
</template>
