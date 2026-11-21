import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// 前端直连 broker 的 MQTT over WebSocket 客户端。
// resolve.conditions:['browser'] 确保 mqtt 包走 exports.browser（dist/mqtt.esm.js），
// 否则 Vite 可能解析到 Node 版入口，浏览器里会拉一堆 Node 内置模块。
export default defineConfig({
  base: './',
  plugins: [vue()],
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
