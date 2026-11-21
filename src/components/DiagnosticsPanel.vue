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
  <section class="card">
    <h2 class="card__title">连接诊断</h2>
    <dl class="diag">
      <dt>连接状态</dt>
      <dd>{{ connection.state }}</dd>
      <dt>WebSocket</dt>
      <dd>{{ connection.connectedAt ? '已建立' : '未建立' }}</dd>
      <dt>Client ID</dt>
      <dd>{{ connection.actualClientId || '（未连接）' }}</dd>
      <dt>Broker</dt>
      <dd>{{ connection.config.host }}:{{ connection.config.port }}{{ connection.config.path }}</dd>
      <dt>订阅 topic</dt>
      <dd>{{ connection.subscribedTopics.length }} / 3</dd>
      <dt>设备状态更新</dt>
      <dd>{{ ago(device.lastStatusAt) }}</dd>
      <dt>最近 ACK</dt>
      <dd>
        {{
          connection.lastAck
            ? `${connection.lastAck.result}（${ago(connection.lastAck.at)}）`
            : '暂无'
        }}
      </dd>
    </dl>
  </section>
</template>
