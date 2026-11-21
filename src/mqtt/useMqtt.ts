import { onScopeDispose, ref } from 'vue'

import type { MqttService } from './mqttService'
import type { MqttConnectionState } from './types'

export interface MqttState {
  state: ReturnType<typeof ref<MqttConnectionState>>
  detail: ReturnType<typeof ref<string>>
}

/** 把 MqttService 的状态镜像为 Vue ref（组件内只读展示用）。 */
export function useMqtt(service: MqttService): MqttState {
  const state = ref<MqttConnectionState>(service.getState())
  const detail = ref<string>('')
  const stop = service.onState((s, d) => {
    state.value = s
    detail.value = d
  })
  onScopeDispose(stop)
  return { state, detail }
}
