<script setup lang="ts">
import { computed } from 'vue'

import type { MqttConnectionState } from '@/mqtt/types'
import { useConnectionStore } from '@/stores/connectionStore'
import type { Theme } from '@/composables/useTheme'

const props = defineProps<{ theme: Theme }>()
const emit = defineEmits<{ toggleTheme: [] }>()

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
const themeLabel = computed(() => (props.theme === 'dark' ? '浅色' : '深色'))
</script>

<template>
  <header class="topbar">
    <h1 class="topbar__title">电源键控制器</h1>
    <div class="topbar__right">
      <span class="pill" :data-state="connection.state">{{ label }}</span>
      <button class="btn small" type="button" @click="emit('toggleTheme')">
        {{ themeLabel }}
      </button>
    </div>
  </header>
</template>
