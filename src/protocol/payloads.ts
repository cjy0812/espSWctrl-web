/**
 * 指令与上行报文的构造/解析。
 *
 * 协议来自固件 src/cmd_verify.rs 与 src/mqtt.rs：
 * - 下行 cmd：{"cmd":"press"|"press_long","nonce":"...","ts":<秒>,"ttl":<秒>}
 * - 上行 ack：{"nonce":"","result":"..."}（nonce 恒为空串）
 * - 上行 state：{"pc":"on"|"off"}
 * - 上行 status：{"online":true|false}
 */

import { generateNonce } from '@/utils/nonce'
import { nowUnixSeconds } from '@/utils/time'

export type DeviceCommand = 'press' | 'press_long'

export const DEVICE_COMMANDS: readonly DeviceCommand[] = ['press', 'press_long']

export interface CmdPayload {
  cmd: DeviceCommand
  nonce: string
  ts: number
  /** 秒；缺省时设备回退到 NVS 里的 cmd_ttl */
  ttl?: number
}

export interface AckPayload {
  nonce: string
  result: string
}

export interface StatePayload {
  pc: 'on' | 'off'
}

export interface StatusPayload {
  online: boolean
}

export interface BuildCmdOptions {
  nonce?: string
  ts?: number
  ttl?: number
}

export function buildCmdPayload(cmd: DeviceCommand, opts: BuildCmdOptions = {}): CmdPayload {
  const payload: CmdPayload = {
    cmd,
    nonce: opts.nonce ?? generateNonce(),
    ts: opts.ts ?? nowUnixSeconds(),
  }
  if (opts.ttl !== undefined) {
    payload.ttl = Math.trunc(opts.ttl)
  }
  return payload
}

export function encodePayload(payload: unknown): string {
  return JSON.stringify(payload)
}

function asRecord(raw: Uint8Array): Record<string, unknown> | null {
  try {
    const text = new TextDecoder().decode(raw)
    const value: unknown = JSON.parse(text)
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return null
    return value as Record<string, unknown>
  } catch {
    return null
  }
}

export function parseCmd(raw: Uint8Array): CmdPayload | null {
  const o = asRecord(raw)
  if (!o) return null
  const cmd = o.cmd
  const nonce = o.nonce
  const ts = o.ts
  if (typeof cmd !== 'string' || !DEVICE_COMMANDS.includes(cmd as DeviceCommand)) return null
  if (typeof nonce !== 'string' || nonce === '') return null
  if (typeof ts !== 'number' || !Number.isFinite(ts)) return null
  const out: CmdPayload = { cmd: cmd as DeviceCommand, nonce, ts: Math.trunc(ts) }
  const ttl = o.ttl
  if (typeof ttl === 'number' && Number.isFinite(ttl)) out.ttl = Math.trunc(ttl)
  return out
}

export function parseAck(raw: Uint8Array): AckPayload | null {
  const o = asRecord(raw)
  if (!o) return null
  const result = o.result
  if (typeof result !== 'string' || result === '') return null
  const nonce = o.nonce
  return { nonce: typeof nonce === 'string' ? nonce : '', result }
}

export function parseState(raw: Uint8Array): StatePayload | null {
  const o = asRecord(raw)
  if (!o) return null
  const pc = o.pc
  if (pc !== 'on' && pc !== 'off') return null
  return { pc }
}

export function parseStatus(raw: Uint8Array): StatusPayload | null {
  const o = asRecord(raw)
  if (!o) return null
  const online = o.online
  if (typeof online !== 'boolean') return null
  return { online }
}
