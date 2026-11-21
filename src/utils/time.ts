/** 时间工具。 */

export function nowUnixSeconds(): number {
  return Math.floor(Date.now() / 1000)
}

/** 「X 秒前 / X 分钟前」相对时间。 */
export function relativeTime(fromTs: number, nowMs = Date.now()): string {
  const diffSec = Math.max(0, Math.floor(nowMs / 1000) - fromTs)
  if (diffSec < 5) return '刚刚'
  if (diffSec < 60) return `${diffSec} 秒前`
  const min = Math.floor(diffSec / 60)
  if (min < 60) return `${min} 分钟前`
  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour} 小时前`
  return `${Math.floor(hour / 24)} 天前`
}

/** 本地时分秒，用于日志展示。 */
export function formatClock(ts: number): string {
  const d = new Date(ts * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}
