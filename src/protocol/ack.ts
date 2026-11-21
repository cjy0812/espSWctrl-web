/**
 * ack result 的取值与文案映射。
 *
 * 固件 src/cmd_verify.rs:66-75 的 CmdError 字符串 + src/mqtt.rs 的 busy/error。
 * 注意：`error`（脉冲线程消失）在固件的文档表格里漏了，但实现会发。
 */

export type AckResult =
  | 'ok'
  | 'busy'
  | 'bad-json'
  | 'bad-schema'
  | 'unknown-cmd'
  | 'expired'
  | 'replay'
  | 'time-not-synced'
  | 'error'

export const ACK_RESULTS: readonly AckResult[] = [
  'ok',
  'busy',
  'bad-json',
  'bad-schema',
  'unknown-cmd',
  'expired',
  'replay',
  'time-not-synced',
  'error',
]

export function isAckResult(value: string): value is AckResult {
  return (ACK_RESULTS as readonly string[]).includes(value)
}

export type AckTone = 'success' | 'warning' | 'error'

export interface AckMeta {
  label: string
  tone: AckTone
  /** 给用户的排障提示 */
  hint?: string
}

export const ACK_META: Record<AckResult, AckMeta> = {
  ok: { label: '设备已接受指令', tone: 'success' },
  busy: {
    label: '设备正忙（脉冲队列满）',
    tone: 'warning',
    hint: '上一次按下尚未完成，请稍后再试。',
  },
  expired: {
    label: '指令过期',
    tone: 'error',
    hint: '本机时钟与设备偏差过大（或超过 ttl）。请校准系统时钟，或在高级设置里调大 ttl。',
  },
  replay: {
    label: '重复 nonce，未执行',
    tone: 'error',
    hint: '这是客户端内部逻辑错误：重试必须生成新的 nonce。请把此条日志反馈给维护者。',
  },
  'time-not-synced': {
    label: '设备时间未同步',
    tone: 'error',
    hint: '设备 SNTP 尚未对时，指令会被全部拒绝。请检查设备网络。',
  },
  'bad-json': {
    label: '设备无法解析指令（JSON 非法）',
    tone: 'error',
    hint: '客户端构造的报文有问题，请反馈维护者。',
  },
  'bad-schema': {
    label: '设备拒绝指令（字段缺失/类型错误）',
    tone: 'error',
    hint: '客户端构造的报文有问题，请反馈维护者。',
  },
  'unknown-cmd': {
    label: '设备不识别该指令',
    tone: 'error',
    hint: '客户端与固件协议版本可能不匹配。',
  },
  error: {
    label: '设备内部错误',
    tone: 'error',
    hint: '设备脉冲线程异常，请检查设备日志。',
  },
}

export function describeAck(result: string): AckMeta {
  return isAckResult(result) ? ACK_META[result] : { label: `未知结果：${result}`, tone: 'error' }
}
