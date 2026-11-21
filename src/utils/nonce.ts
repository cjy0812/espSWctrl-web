/** nonce 与 client id 生成。 */

export function generateNonce(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * 随机 client id：默认 web-xxxxxxxx。
 *
 * 刻意随机，避免与设备 `pc01-esp32` 或其他浏览器标签页撞 client_id
 * （EMQX 上同 client_id 会互踢）。
 */
export function randomClientId(prefix = 'web'): string {
  const rand = Math.random().toString(36).slice(2, 8)
  return `${prefix}-${rand}`
}
