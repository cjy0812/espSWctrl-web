import { ref } from 'vue'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'espSWctrl-web:theme'

function detect(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    /* 隐私模式下忽略 */
  }
  if (typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

/** 深色/浅色主题：跟随系统为默认，用户切换后持久化到 localStorage。 */
export function useTheme() {
  const current = ref<Theme>(detect())

  function apply(theme: Theme): void {
    current.value = theme
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      /* 忽略写入失败 */
    }
  }

  function toggle(): void {
    apply(current.value === 'dark' ? 'light' : 'dark')
  }

  apply(current.value)

  return { current, toggle }
}
