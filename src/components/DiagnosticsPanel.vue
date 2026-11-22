<script setup lang="ts">
import { useConnectionStore } from '@/stores/connectionStore'
import { useDeviceStore } from '@/stores/deviceStore'
import { relativeTime } from '@/utils/time'

const connection = useConnectionStore()
const device = useDeviceStore()

function ago(ts: number | null): string {
  return ts ? relativeTime(Math.floor(ts / 1000)) : '暂无'
}
</script>

<template>
  <n-card size="small" :bordered="false" title="连接诊断">
    <n-descriptions :column="1" label-placement="left" bordered size="small">
      <n-descriptions-item label="连接状态">{{ connection.state }}</n-descriptions-item>
      <n-descriptions-item label="WebSocket">
        {{ connection.connectedAt ? '已建立' : '未建立' }}
      </n-descriptions-item>
      <n-descriptions-item label="Client ID">
        {{ connection.actualClientId || '（未连接）' }}
      </n-descriptions-item>
      <n-descriptions-item label="Broker">
        {{ connection.config.host }}:{{ connection.config.port }}{{ connection.config.path }}
      </n-descriptions-item>
      <n-descriptions-item label="订阅 topic">
        {{ connection.subscribedTopics.length }} / 3
      </n-descriptions-item>
      <n-descriptions-item label="设备状态更新">{{ ago(device.lastStatusAt) }}</n-descriptions-item>
      <n-descriptions-item label="最近 ACK">
        {{
          connection.lastAck
            ? `${connection.lastAck.result}（${ago(connection.lastAck.at)}）`
            : '暂无'
        }}
      </n-descriptions-item>
    </n-descriptions>
  </n-card>
</template>
