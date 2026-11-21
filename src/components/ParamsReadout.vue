<script setup lang="ts">
const rows = [
  { name: 'pulse_ms', value: '300（默认）', range: '100 – 3000', how: 'pulse <ms>' },
  { name: 'press_long', value: '3000（固定）', range: '安全边界，不可配', how: '固件固定' },
  { name: 'cmd_ttl', value: '30（默认）', range: '5 – 300 秒', how: 'ttl <秒>' },
  { name: 'status_s', value: '30（默认）', range: '5 – 3600 秒', how: 'status <秒>' },
  { name: 'keepalive', value: '60（默认）', range: '10 – 3600 秒', how: 'keepalive <秒>' },
]
</script>

<template>
  <section class="card">
    <h2 class="card__title">设备参数（只读）</h2>
    <p class="hint">
      以下参数无法通过 MQTT 读写，需接 USB 串口（115200）使用控制台。
    </p>
    <table class="table">
      <thead>
        <tr>
          <th>参数</th>
          <th>默认</th>
          <th>范围</th>
          <th>串口命令</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.name">
          <td><code>{{ row.name }}</code></td>
          <td>{{ row.value }}</td>
          <td>{{ row.range }}</td>
          <td><code>{{ row.how }}</code></td>
        </tr>
      </tbody>
    </table>
    <p class="hint">设备不通过 MQTT 上报公网 IP / DDNS 域名，故此处不展示。</p>
    <button class="btn" type="button" disabled title="固件协议暂不支持远程配置">
      远程配置（暂不支持）
    </button>
  </section>
</template>
