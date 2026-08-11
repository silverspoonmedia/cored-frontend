import { ref, computed } from 'vue'
import type { ThemeMode } from '@/types'

const STORAGE_KEY = 'lte-theme'
const storedMode = ref<ThemeMode>('dark')
let mediaQuery: MediaQueryList | null = null
let initialized = false

function resolveEffective(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'auto') {
    return mediaQuery?.matches ? 'dark' : 'light'
  }
  return mode
}

function applyToDocument(mode: ThemeMode): void {
  const effective = resolveEffective(mode)
  document.documentElement.setAttribute('data-bs-theme', effective)
}

function readStored(): ThemeMode {
  try {
    const val = localStorage.getItem(STORAGE_KEY)
    if (val === 'light' || val === 'dark' || val === 'auto') return val
  } catch {
    // localStorage unavailable
  }
  return 'dark'
}

function ensureMediaQuery(): void {
  if (mediaQuery) return
  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', onSystemChange)
}

function onSystemChange(): void {
  if (storedMode.value === 'auto') {
    applyToDocument('auto')
  }
}

/**
 * Initialise theme from localStorage + media query. Call once before app mount
 * to prevent FOUC. Safe to call outside a component context.
 */
export function initTheme(): void {
  if (initialized) return
  initialized = true
  ensureMediaQuery()
  storedMode.value = readStored()
  applyToDocument(storedMode.value)
}

export function useTheme() {
  const mode = computed(() => storedMode.value)

  const effective = computed<'light' | 'dark'>(() => resolveEffective(storedMode.value))

  const currentIcon = computed<string>(() => {
    if (storedMode.value === 'light') return 'light'
    if (storedMode.value === 'dark') return 'dark'
    return 'auto'
  })

  function setMode(newMode: ThemeMode): void {
    storedMode.value = newMode
    try {
      localStorage.setItem(STORAGE_KEY, newMode)
    } catch {
      // ignore
    }
    applyToDocument(newMode)
  }

  return { mode, effective, currentIcon, setMode }
}
