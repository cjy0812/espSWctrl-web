<script setup lang="ts">
import { computed } from 'vue'

import { useLogStore } from '@/stores/logStore'
import { formatClock } from '@/utils/time'

const log = useLogStore()

const text = computed(() =>
  log.entries
    .map((entry) => `${formatClock(Math.floor(entry.at / 1000))} [${entry.kind}] ${entry.text}`)
    .join('\n'),
)

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
  <n-card size="small" :bordered="false" title="日志">
    <template #header-extra>
      <n-space :size="8">
        <n-button size="tiny" @click="download">导出</n-button>
        <n-button size="tiny" @click="log.clear()">清空</n-button>
      </n-space>
    </template>
    <n-log v-if="log.entries.length > 0" :log="text" :rows="24" :font-size="12" />
    <n-text v-else depth="3">暂无日志</n-text>
  </n-card>
</template>
