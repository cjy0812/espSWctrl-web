import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'
import Components from 'unplugin-vue-components/vite'
import { defineConfig } from 'vite'

// 前端直连 broker 的 MQTT over WebSocket 客户端。
// resolve.conditions:['browser'] 确保 mqtt 包走 exports.browser（dist/mqtt.esm.js）。
// Components + NaiveUiResolver：Naive UI 按需引入，模板里直接用 n-xxx 即可。
export default defineConfig({
  base: './',
  plugins: [
    vue(),
    Components({
      resolvers: [NaiveUiResolver()],
    }),
  ],
  resolve: {
    conditions: ['browser'],
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
})
