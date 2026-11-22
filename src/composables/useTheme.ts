import { ref } from 'vue'

/**
 * 主题状态：默认跟随系统，用户切换后持久化到 localStorage。
 * 实际主题由 Naive UI 的 n-config-provider 应用（darkTheme / 默认浅色）。
 */
export function useTheme() {
  const STORAGE_KEY = 'espSWctrl-web:theme'

  function detect(): boolean {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved === 'dark') return true
      if (saved === 'light') return false
    } catch {
      /* 隐私模式忽略 */
    }
    return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches
  }

  const isDark = ref(detect())

  function toggle(): void {
    isDark.value = !isDark.value
    try {
      localStorage.setItem(STORAGE_KEY, isDark.value ? 'dark' : 'light')
    } catch {
      /* 忽略写入失败 */
    }
  }

  return { isDark, toggle }
}
