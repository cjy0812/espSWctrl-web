<script setup lang="ts">
import type { SelectOption } from 'naive-ui'

import { useConnectionStore } from '@/stores/connectionStore'

const emit = defineEmits<{ close: [] }>()
const connection = useConnectionStore()

const protocolOptions: SelectOption[] = [
  { label: 'wss://（推荐）', value: 'wss' },
  { label: 'ws://（仅本地调试）', value: 'ws' },
]

const storageOptions: SelectOption[] = [
  { value: 'memory', label: '仅本次会话（内存，最安全）' },
  { value: 'session', label: '本次标签页（sessionStorage，默认）' },
  { value: 'local', label: '记住密码（localStorage）' },
]
</script>

<template>
  <n-form label-placement="top" :show-feedback="false" size="small">
    <n-form-item label="协议">
      <n-select v-model:value="connection.config.protocol" :options="protocolOptions" />
    </n-form-item>

    <n-form-item label="主机名">
      <n-input v-model:value="connection.config.host" placeholder="broker.example.com" />
    </n-form-item>

    <n-grid :cols="2" :x-gap="12">
      <n-gi>
        <n-form-item label="端口">
          <n-input-number v-model:value="connection.config.port" :min="1" :max="65535" />
        </n-form-item>
      </n-gi>
      <n-gi>
        <n-form-item label="路径">
          <n-input v-model:value="connection.config.path" placeholder="/mqtt" />
        </n-form-item>
      </n-gi>
    </n-grid>

    <n-form-item label="用户名（控制端账号，禁止设备账号）">
      <n-input v-model:value="connection.config.username" />
    </n-form-item>

    <n-form-item label="密码">
      <n-input
        v-model:value="connection.config.password"
        type="password"
        show-password-on="click"
      />
    </n-form-item>

    <n-form-item label="device_id">
      <n-input v-model:value="connection.config.deviceId" placeholder="pc01" />
    </n-form-item>

    <n-form-item label="Client ID（留空则用 pc01-controller）">
      <n-input v-model:value="connection.config.clientId" placeholder="pc01-controller" />
    </n-form-item>

    <n-form-item label="指令时间窗 ttl（秒，5–300）">
      <n-input-number v-model:value="connection.config.ttl" :min="5" :max="300" />
    </n-form-item>

    <n-form-item label="凭据保存方式">
      <n-select
        v-model:value="connection.config.credentialStorage"
        :options="storageOptions"
      />
    </n-form-item>

    <n-alert v-if="connection.config.protocol === 'ws'" type="warning" :bordered="false">
      ws:// 明文连接，凭据与指令可被链路窃听，仅用于本地调试。
    </n-alert>
    <n-alert v-if="connection.errorMessage" type="error" :bordered="false">
      {{ connection.errorMessage }}
    </n-alert>

    <n-space :size="8">
      <n-button type="primary" @click="connection.connect">保存并连接</n-button>
      <n-button @click="connection.disconnect">断开</n-button>
      <n-button @click="connection.resetConfig">清除凭据</n-button>
      <n-button @click="emit('close')">关闭</n-button>
    </n-space>
  </n-form>
</template>
