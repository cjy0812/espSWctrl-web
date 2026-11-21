<script setup lang="ts">
import type { CredentialStorage } from '@/config/storage'
import { useConnectionStore } from '@/stores/connectionStore'

const emit = defineEmits<{ close: [] }>()
const connection = useConnectionStore()

const storageOptions: { value: CredentialStorage; label: string }[] = [
  { value: 'memory', label: '仅本次会话（内存，最安全）' },
  { value: 'session', label: '本次标签页（sessionStorage，默认）' },
  { value: 'local', label: '记住密码（localStorage）' },
]

function close(): void {
  emit('close')
}
</script>

<template>
  <div class="drawer-mask" @click="close">
    <aside class="drawer" @click.stop>
      <header class="drawer__head">
        <h2>连接设置</h2>
        <button class="btn small" type="button" @click="close">关闭</button>
      </header>

      <div class="drawer__body">
        <label class="field">
          <span>协议</span>
          <select v-model="connection.config.protocol">
            <option value="wss">wss://（推荐）</option>
            <option value="ws">ws://（仅本地调试）</option>
          </select>
        </label>

        <label class="field">
          <span>主机名</span>
          <input v-model="connection.config.host" type="text" placeholder="broker.example.com" />
        </label>

        <div class="field-row">
          <label class="field">
            <span>端口</span>
            <input v-model.number="connection.config.port" type="number" min="1" max="65535" />
          </label>
          <label class="field">
            <span>路径</span>
            <input v-model="connection.config.path" type="text" placeholder="/mqtt" />
          </label>
        </div>

        <label class="field">
          <span>用户名（控制端账号，禁止设备账号）</span>
          <input v-model="connection.config.username" type="text" />
        </label>

        <label class="field">
          <span>密码</span>
          <input v-model="connection.config.password" type="password" />
        </label>

        <label class="field">
          <span>device_id</span>
          <input v-model="connection.config.deviceId" type="text" placeholder="pc01" />
        </label>

        <label class="field">
          <span>Client ID（留空则随机）</span>
          <input v-model="connection.config.clientId" type="text" placeholder="web-xxxxxxxx" />
        </label>

        <label class="field">
          <span>指令时间窗 ttl（秒，5–300）</span>
          <input v-model.number="connection.config.ttl" type="number" min="5" max="300" />
        </label>

        <label class="field">
          <span>凭据保存方式</span>
          <select v-model="connection.config.credentialStorage">
            <option v-for="o in storageOptions" :key="o.value" :value="o.value">
              {{ o.label }}
            </option>
          </select>
        </label>

        <p v-if="connection.config.protocol === 'ws'" class="warn">
          ws:// 明文连接，凭据与指令可被链路窃听，仅用于本地调试。
        </p>
        <p v-if="connection.errorMessage" class="error">{{ connection.errorMessage }}</p>
      </div>

      <footer class="drawer__foot">
        <button class="btn primary" type="button" @click="connection.connect">保存并连接</button>
        <button class="btn" type="button" @click="connection.disconnect">断开</button>
        <button class="btn ghost" type="button" @click="connection.resetConfig">清除凭据</button>
      </footer>
    </aside>
  </div>
</template>
