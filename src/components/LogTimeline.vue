<script setup lang="ts">
import { useLogStore } from '@/stores/logStore'
import { formatClock } from '@/utils/time'

const log = useLogStore()

function download(): void {
  const blob = new Blob([log.exportJson()], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `espSWctrl-log-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <section class="card">
    <div class="row row--between">
      <h2 class="card__title">日志</h2>
      <div class="row">
        <button class="btn small" type="button" @click="download">导出</button>
        <button class="btn small" type="button" @click="log.clear()">清空</button>
      </div>
    </div>
    <p v-if="log.entries.length === 0" class="muted">暂无日志</p>
    <ul class="log-list">
      <li v-for="entry in log.entries" :key="entry.id" :data-kind="entry.kind">
        <span class="log-list__time">{{ formatClock(Math.floor(entry.at / 1000)) }}</span>
        <span>{{ entry.text }}</span>
      </li>
    </ul>
  </section>
</template>
