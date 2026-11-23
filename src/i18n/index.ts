import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import { featureEnglishPack, featurePackFor, withFeaturePack } from './featurePacks'

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

/**
 * Translatable payload maps (menu name/description, …) are keyed by the
 * canonical BACKEND locale code (`zh_CN`), not the SPA code (`zh-CN`).
 * `zh-CN` is accepted as a read alias so pre-existing maps mixed with edits
 * still resolve, but writes always normalize to the backend key and drop the
 * alias so the API never receives `zh-CN` keys.
 */
export function normalizeTranslatableMap(
  map: Record<string, string> | null | undefined,
): Record<string, string> {
  if (!map) return {}

  const out: Record<string, string> = {}

  for (const [key, value] of Object.entries(map)) {
    if (typeof value !== 'string') continue

    const spa = spaLocale(key)
    if (spa === null) continue

    out[backendLocale(spa)] = value
  }

  return out
}

/**
 * Read one locale out of a backend-keyed translatable map (`zh_CN`) using an
 * SPA locale code (`zh-CN`). Falls back to the raw SPA key so maps written by
 * an older writer still render.
 */
export function translatableValue(
  map: Record<string, string> | null | undefined,
  locale: AppLocale,
): string {
  if (!map) return ''

  return map[backendLocale(locale)] ?? map[locale] ?? ''
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

// Feature namespaces are merged into the eager English bundle lazily, on the
// first access that needs copy (`ensureI18nMessages`). A consumer that never
// renders — a node-env unit test importing `@/api` — therefore loads only the
// core `en` pack and never evaluates a feature's view graph.
let messagesMerged = false

export function ensureI18nMessages(): void {
  if (messagesMerged) return
  messagesMerged = true
  const featureEn = featureEnglishPack()
  if (Object.keys(featureEn).length > 0) {
    i18n.global.mergeLocaleMessage('en', featureEn as Record<string, string>)
  }
}

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
  const core = (messages.default ?? messages) as Record<string, unknown>
  const featureMessages = await featurePackFor(locale)
  i18n.global.setLocaleMessage(
    locale,
    withFeaturePack(core, featureMessages) as Parameters<typeof i18n.global.setLocaleMessage>[1],
  )
  loadedLocales.add(locale)
}

/**
 * Warm `locale` ahead of the switch.
 *
 * `setLocale` cannot return its load promise without changing its signature, so
 * a caller that wants the copy in place first (a test, a pre-render hook) awaits
 * this instead of racing a detached dynamic import.
 */
export function preloadLocale(locale: AppLocale): Promise<void> {
  ensureI18nMessages()
  return track(ensureLocale(locale))
}

/**
 * A locale switch starts a detached dynamic import. In a test the worker can
 * shut down before that import resolves, and Vitest then reports it against a
 * torn-down module runner even though every assertion passed. `setLocale` stays
 * fire-and-forget for the app, so a test that drives a switch awaits the load it
 * caused: `preloadLocale(locale)` before, or `translationsSettled()` after.
 */
const pendingLoads = new Set<Promise<unknown>>()

function track<T>(promise: Promise<T>): Promise<T> {
  pendingLoads.add(promise)
  void promise.catch(() => undefined).finally(() => pendingLoads.delete(promise))
  return promise
}

export function translationsSettled(): Promise<void> {
  return Promise.all([...pendingLoads]).then(() => undefined)
}

export function setLocale(locale: AppLocale, opts?: { reload?: boolean }): void {
  ensureI18nMessages()
  const directionChanged = isRtl(locale) !== isRtl()
  // Tracked so a test can wait for the load instead of racing the teardown.
  const pending = track(ensureLocale(locale))
  void pending.then(() => {
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
