/**
 * 凭据脱敏。
 *
 * 日志、异常对象、导出 JSON 在落盘/展示前都必须经过这里。
 * 判定方式：key 名匹配敏感词即把字符串值替换为 ***。
 */

const SENSITIVE_KEY = /pass|password|pwd|secret|token|cred|apikey|api_key|auth/i

const MAX_DEPTH = 6

function maskValue(
  value: unknown,
  key: string | null,
  depth: number,
  seen: WeakSet<object>,
): unknown {
  if (typeof value === 'string' && key !== null && SENSITIVE_KEY.test(key)) {
    return '***'
  }
  if (value === null || typeof value !== 'object' || depth > MAX_DEPTH) {
    return value
  }
  const obj = value as object
  if (seen.has(obj)) {
    return '[Circular]'
  }
  seen.add(obj)
  if (Array.isArray(value)) {
    return value.map((item) => maskValue(item, key, depth + 1, seen))
  }
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = maskValue(v, k, depth + 1, seen)
  }
  return out
}

/** 递归脱敏任意对象（密码等敏感字段替换为 ***）。 */
export function maskSensitive<T>(value: T): T {
  return maskValue(value, null, 0, new WeakSet()) as T
}

/** 脱敏一段文本：把 key=value / "key":"value" 形式的敏感值替换掉。 */
export function maskText(text: string): string {
  if (!text) return text
  return text
    .replace(
      /((?:pass|password|pwd|secret|token|cred|apikey|api_key|auth)[^:=,"\s]{0,40}?["']?\s*[:=]\s*["']?)([^"',}\s]+)/gi,
      '$1***',
    )
    .replace(
      /(["'](?:pass|password|pwd|secret|token|cred|apikey|api_key|auth)["']\s*:\s*["'])([^"']*)(["'])/gi,
      '$1***$3',
    )
}
