import { defineStore } from 'pinia'
import { ref } from 'vue'

import type { LogEntryInput } from '@/mqtt/types'
import { maskSensitive, maskText } from '@/utils/mask'

export interface LogEntry extends LogEntryInput {
  id: string
  at: number
}

const MAX_ENTRIES = 300

export const useLogStore = defineStore('log', () => {
  const entries = ref<LogEntry[]>([])
  let seq = 0

  function push(input: LogEntryInput): void {
    seq += 1
    const entry: LogEntry = {
      id: `${Date.now().toString(36)}-${seq}`,
      kind: input.kind,
      // 双保险：文本与结构化 meta 都脱敏
      text: maskText(input.text),
      meta: input.meta === undefined ? undefined : maskSensitive(input.meta),
      at: Date.now(),
    }
    entries.value.unshift(entry)
    if (entries.value.length > MAX_ENTRIES) entries.value.pop()
  }

  function clear(): void {
    entries.value = []
  }

  /** 导出（已脱敏），供排障反馈。 */
  function exportJson(): string {
    return JSON.stringify(entries.value, null, 2)
  }

  return { entries, push, clear, exportJson }
})
