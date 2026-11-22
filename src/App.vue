<script setup lang="ts">
import { computed } from 'vue'
import { darkTheme, type GlobalTheme } from 'naive-ui'

import { useTheme } from '@/composables/useTheme'
import MainView from '@/views/MainView.vue'

const { isDark, toggle } = useTheme()

// Naive UI 主题：浅色即默认主题（传 null），深色用内置 darkTheme。
const theme = computed<GlobalTheme | null>(() => (isDark.value ? darkTheme : null))
</script>

<template>
  <n-config-provider :theme="theme">
    <n-dialog-provider>
      <n-message-provider>
        <MainView :is-dark="isDark" @toggle-theme="toggle" />
      </n-message-provider>
    </n-dialog-provider>
  </n-config-provider>
</template>
