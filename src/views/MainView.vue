<script setup lang="ts">
import { ref } from 'vue'

import { useTheme } from '@/composables/useTheme'
import ConnectionBar from '@/components/ConnectionBar.vue'
import ConnectionSettingsDrawer from '@/components/ConnectionSettingsDrawer.vue'
import DeviceStatusCard from '@/components/DeviceStatusCard.vue'
import DiagnosticsPanel from '@/components/DiagnosticsPanel.vue'
import LogTimeline from '@/components/LogTimeline.vue'
import ParamsReadout from '@/components/ParamsReadout.vue'
import PowerButton from '@/components/PowerButton.vue'
import { useConnectionStore } from '@/stores/connectionStore'

type Tab = 'status' | 'logs' | 'params'

const tab = ref<Tab>('status')
const showSettings = ref(false)
const connection = useConnectionStore()
const theme = useTheme()

const tabs: { key: Tab; label: string }[] = [
  { key: 'status', label: '状态' },
  { key: 'logs', label: '日志' },
  { key: 'params', label: '参数' },
]
</script>

<template>
  <div class="shell">
    <ConnectionBar :theme="theme.current.value" @toggle-theme="theme.toggle" />

    <main class="content">
      <template v-if="tab === 'status'">
        <DeviceStatusCard />
        <PowerButton />
        <DiagnosticsPanel />
      </template>
      <LogTimeline v-else-if="tab === 'logs'" />
      <ParamsReadout v-else />
    </main>

    <nav class="tabs">
      <button
        v-for="t in tabs"
        :key="t.key"
        class="tabs__btn"
        :class="{ 'tabs__btn--active': tab === t.key }"
        type="button"
        @click="tab = t.key"
      >
        {{ t.label }}
      </button>
    </nav>

    <button class="fab" type="button" @click="showSettings = true">设置</button>

    <ConnectionSettingsDrawer v-if="showSettings" @close="showSettings = false" />

    <p v-if="connection.errorMessage" class="error global-error">
      {{ connection.errorMessage }}
    </p>
  </div>
</template>
