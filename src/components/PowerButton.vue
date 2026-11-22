<script setup lang="ts">
import { computed } from 'vue'

import { usePowerController } from '@/composables/usePowerController'
import { useCommandStore } from '@/stores/commandStore'
import { useConnectionStore } from '@/stores/connectionStore'

const commands = useCommandStore()
const connection = useConnectionStore()
const { press, confirmUnknown } = usePowerController()

const pending = computed(() => commands.requests.some((r) => r.status === 'pending'))
const unknown = computed(() => commands.requests.filter((r) => r.status === 'unknown'))
const canPress = computed(() => connection.state === 'subscribed' && !pending.value)
</script>

<template>
  <n-card size="small" :bordered="false" title="电源键">
    <n-space vertical :size="12">
      <n-button
        type="primary"
        block
        size="large"
        :disabled="!canPress"
        :loading="pending"
        @click="press"
      >
        模拟短按电源键
      </n-button>
      <n-text depth="3">电源键是「按一下翻转」语义，不区分开机/关机。</n-text>

      <n-alert
        v-for="req in unknown"
        :key="req.id"
        type="warning"
        :bordered="false"
        :title="`指令结果未知（${req.unknownReason === 'timeout' ? '未收到回执' : '连接断开'}）`"
      >
        <n-space align="center" :size="8">
          <n-text depth="3">请确认 PC 实际状态后标记：</n-text>
          <n-button size="tiny" @click="confirmUnknown(req.id, true)">已执行</n-button>
          <n-button size="tiny" @click="confirmUnknown(req.id, false)">未执行</n-button>
        </n-space>
      </n-alert>
    </n-space>
  </n-card>
</template>
