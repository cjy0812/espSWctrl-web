<script setup lang="ts">
import type { DataTableColumns } from 'naive-ui'

interface ParamRow {
  name: string
  value: string
  range: string
  how: string
}

const rows: ParamRow[] = [
  { name: 'pulse_ms', value: '300（默认）', range: '100 – 3000', how: 'pulse <ms>' },
  { name: 'press_long', value: '3000（固定）', range: '安全边界，不可配', how: '固件固定' },
  { name: 'cmd_ttl', value: '30（默认）', range: '5 – 300 秒', how: 'ttl <秒>' },
  { name: 'status_s', value: '30（默认）', range: '5 – 3600 秒', how: 'status <秒>' },
  { name: 'keepalive', value: '60（默认）', range: '10 – 3600 秒', how: 'keepalive <秒>' },
]

const columns: DataTableColumns<ParamRow> = [
  { title: '参数', key: 'name' },
  { title: '默认', key: 'value' },
  { title: '范围', key: 'range' },
  { title: '串口命令', key: 'how' },
]
</script>

<template>
  <n-card size="small" :bordered="false" title="设备参数（只读）">
    <n-space vertical :size="12">
      <n-text depth="3">
        以下参数无法通过 MQTT 读写，需接 USB 串口（115200）使用控制台。
      </n-text>
      <n-data-table :columns="columns" :data="rows" size="small" :bordered="false" />
      <n-text depth="3">设备不通过 MQTT 上报公网 IP / DDNS 域名，故此处不展示。</n-text>
      <n-button disabled>远程配置（暂不支持）</n-button>
    </n-space>
  </n-card>
</template>
