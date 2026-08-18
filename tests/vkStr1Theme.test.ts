import { beforeEach, describe, expect, it } from 'vitest'
import { useVkStr1Theme } from '../src/valkivid3/composables/useVkStr1Theme'

// Node env: minimal documentElement + localStorage stubs, mirroring what the
// composable touches (classList.toggle + localStorage get/set).
function stubDom() {
  const store = new Map<string, string>()
  const classes = new Set<string>()

  ;(globalThis as Record<string, unknown>).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  }
  ;(globalThis as Record<string, unknown>).document = {
    documentElement: {
      classList: {
        toggle: (cls: string, force?: boolean) => {
          const on = force ?? !classes.has(cls)
          if (on) classes.add(cls)
          else classes.delete(cls)
        },
        contains: (cls: string) => classes.has(cls),
        add: (cls: string) => classes.add(cls),
        remove: (cls: string) => classes.delete(cls),
      },
    },
  }

  return {
    isDark: () => classes.has('dark'),
    reset: () => {
      store.clear()
      classes.clear()
    },
  }
}

const dom = stubDom()

describe('useVkStr1Theme', () => {
  beforeEach(() => {
    dom.reset()
    localStorage.clear()
  })

  it('defaults to dark when nothing stored', () => {
    const { readStoredTheme } = useVkStr1Theme()
    expect(readStoredTheme()).toBe('dark')
  })

  it('reads a stored light theme', () => {
    localStorage.setItem('str1-color-theme', 'light')
    const { readStoredTheme } = useVkStr1Theme()
    expect(readStoredTheme()).toBe('light')
  })

  it('falls back to dark on garbage values', () => {
    localStorage.setItem('str1-color-theme', 'purple')
    const { readStoredTheme } = useVkStr1Theme()
    expect(readStoredTheme()).toBe('dark')
  })

  it('applyTheme toggles html.dark and persists', () => {
    const { applyTheme } = useVkStr1Theme()
    applyTheme('light')
    expect(dom.isDark()).toBe(false)
    expect(localStorage.getItem('str1-color-theme')).toBe('light')

    applyTheme('dark')
    expect(dom.isDark()).toBe(true)
    expect(localStorage.getItem('str1-color-theme')).toBe('dark')
  })

  it('toggleTheme flips between dark and light', () => {
    const { theme, toggleTheme } = useVkStr1Theme()
    const start = theme.value
    toggleTheme()
    expect(theme.value).toBe(start === 'dark' ? 'light' : 'dark')
    toggleTheme()
    expect(theme.value).toBe(start)
  })
})
