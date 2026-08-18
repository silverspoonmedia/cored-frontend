import { ref } from 'vue'

const STORAGE_KEY = 'str1-color-theme'

export type VkStr1Theme = 'dark' | 'light'

const theme = ref<VkStr1Theme>('dark')

function readStoredTheme(): VkStr1Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') {
      return stored
    }
  } catch {
    // ignore
  }
  return 'dark'
}

function applyTheme(next: VkStr1Theme): void {
  theme.value = next
  document.documentElement.classList.toggle('dark', next === 'dark')
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // ignore
  }
}

export function useVkStr1Theme() {
  function toggleTheme(): void {
    applyTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  return { theme, applyTheme, readStoredTheme, toggleTheme }
}
