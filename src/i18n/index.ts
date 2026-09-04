import { createI18n } from 'vue-i18n'
import en from './locales/en.json'

export type AppLocale = 'en' | 'id' | 'ja' | 'ko' | 'zh-CN' | 'ar' | 'ru'
export type BackendLocale = 'en' | 'id' | 'ja' | 'ko' | 'zh_CN' | 'ar' | 'ru'

export const SUPPORTED_LOCALES: AppLocale[] = ['en', 'id', 'ja', 'ko', 'zh-CN', 'ar', 'ru']

export const LOCALE_LABELS: Record<AppLocale, string> = {
  en: 'English',
  id: 'Bahasa Indonesia',
  ja: '日本語',
  ko: '한국어',
  'zh-CN': '简体中文',
  ar: 'العربية',
  ru: 'Русский',
}

const BACKEND_LOCALE_MAP: Record<AppLocale, BackendLocale> = {
  en: 'en',
  id: 'id',
  ja: 'ja',
  ko: 'ko',
  'zh-CN': 'zh_CN',
  ar: 'ar',
  ru: 'ru',
}

const SPA_LOCALE_MAP: Record<BackendLocale, AppLocale> = Object.fromEntries(
  Object.entries(BACKEND_LOCALE_MAP).map(([spa, backend]) => [backend, spa]),
) as Record<BackendLocale, AppLocale>

export function backendLocale(locale: AppLocale = i18n.global.locale.value as AppLocale): BackendLocale {
  return BACKEND_LOCALE_MAP[locale] ?? 'en'
}

export function spaLocale(locale: string): AppLocale | null {
  const normalized = locale.trim()
  if (normalized === 'zh_CN') return 'zh-CN'
  if (SUPPORTED_LOCALES.includes(normalized as AppLocale)) return normalized as AppLocale
  return null
}

export function isRtl(locale: string = i18n.global.locale.value): boolean {
  return spaLocale(locale) === 'ar'
}

export function intlLocale(locale: string = i18n.global.locale.value): string {
  return spaLocale(locale) ?? 'en'
}

function detectLocale(): AppLocale {
  if (typeof window !== 'undefined') {
    const stored = spaLocale(window.localStorage?.getItem('locale') ?? '')
    if (stored) return stored

    const candidates = [navigator.language, ...(navigator.languages ?? [])]
    for (const candidate of candidates) {
      const normalized = candidate.toLowerCase()
      const match = SUPPORTED_LOCALES.find((locale) => {
        if (locale === 'zh-CN') return normalized === 'zh-cn' || normalized.startsWith('zh-cn-')
        return normalized === locale || normalized.startsWith(`${locale}-`)
      })
      if (match) return match
    }
  }

  return 'en'
}

const i18n = createI18n({
  legacy: false,
  locale: detectLocale(),
  fallbackLocale: 'en',
  messages: { en },
})

// Non-fallback locales load on demand (~1.4 MB raw kept out of the entry chunk).
// VueI18nPlugin precompiles each JSON into its own chunk; missing keys fall back
// to the eagerly bundled `en` until the import resolves.
const LAZY_LOCALES: Record<Exclude<AppLocale, 'en'>, () => Promise<{ default: unknown }>> = {
  id: () => import('./locales/id.json'),
  ja: () => import('./locales/ja.json'),
  ko: () => import('./locales/ko.json'),
  'zh-CN': () => import('./locales/zh-CN.json'),
  ar: () => import('./locales/ar.json'),
  ru: () => import('./locales/ru.json'),
}

const loadedLocales = new Set<AppLocale>(['en'])

export async function ensureLocale(locale: AppLocale): Promise<void> {
  if (loadedLocales.has(locale)) return
  const loader = LAZY_LOCALES[locale as Exclude<AppLocale, 'en'>]
  if (!loader) return
  const messages = await loader() as { default?: unknown }
  i18n.global.setLocaleMessage(locale, (messages.default ?? messages) as Parameters<typeof i18n.global.setLocaleMessage>[1])
  loadedLocales.add(locale)
}

export function setLocale(locale: AppLocale, opts?: { reload?: boolean }): void {
  const directionChanged = isRtl(locale) !== isRtl()
  void ensureLocale(locale).then(() => {
    // Force reactivity refresh of already-rendered translations once the
    // messages land (covers locales awaited asynchronously after mount).
    if ((i18n.global.locale.value as AppLocale) === locale) {
      ;(i18n.global.locale as unknown as { value: string }).value = locale
    }
  })
  i18n.global.locale.value = locale as typeof i18n.global.locale.value
  if (typeof window !== 'undefined') window.localStorage?.setItem('locale', locale)
  applyHtmlLang()
  // Vendor CSS is split per direction (vendor.css / vendor-rtl.css, see main.ts);
  // a direction swap needs a fresh document so the other stylesheet loads.
  // Default reload:true preserves caller behavior; switchLocale passes
  // reload:false so it can persist auth/locale before reloading (otherwise the
  // in-flight POST is aborted by the unload and the menu stays stale).
  const shouldReload = opts?.reload ?? true
  if (shouldReload && directionChanged && typeof window !== 'undefined') window.location.reload()
}

// Reload only when the direction actually flips. Lets callers persist state
// first, then trigger the direction-swap reload themselves.
export function reloadForDirection(previousLocale: string, nextLocale: string): void {
  if (isRtl(previousLocale) !== isRtl(nextLocale) && typeof window !== 'undefined') {
    window.location.reload()
  }
}

export function applyHtmlLang(): void {
  if (typeof document !== 'undefined') {
    const locale = spaLocale(i18n.global.locale.value) ?? 'en'
    document.documentElement.setAttribute('lang', locale)
    document.documentElement.setAttribute('dir', isRtl(locale) ? 'rtl' : 'ltr')
  }
}

export { SPA_LOCALE_MAP }
export default i18n
