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
  <section class="card power">
    <button class="btn primary big" type="button" :disabled="!canPress" @click="press">
      模拟短按电源键
    </button>
    <p class="hint">电源键是「按一下翻转」语义，不区分开机/关机。</p>
    <p v-if="pending" class="hint">正在等待设备回执…</p>

    <div v-if="unknown.length > 0" class="unknown">
      <p v-for="req in unknown" :key="req.id" class="unknown__item">
        <span>
          指令结果未知（{{ req.unknownReason === 'timeout' ? '未收到回执' : '连接断开' }}）
        </span>
        <button class="btn small" type="button" @click="confirmUnknown(req.id, true)">
          已执行
        </button>
        <button class="btn small" type="button" @click="confirmUnknown(req.id, false)">
          未执行
        </button>
      </p>
    </div>
  </section>
</template>
