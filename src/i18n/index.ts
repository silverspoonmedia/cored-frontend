import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import id from './locales/id.json'
import ja from './locales/ja.json'

export type AppLocale = 'en' | 'id' | 'ja'

export const SUPPORTED_LOCALES: AppLocale[] = ['en', 'id', 'ja']

export const LOCALE_LABELS: Record<AppLocale, string> = {
  en: 'English',
  id: 'Bahasa Indonesia',
  ja: '日本語',
}

function detectLocale(): AppLocale {
  const stored = localStorage.getItem('locale') as AppLocale | null
  if (stored && SUPPORTED_LOCALES.includes(stored)) return stored

  const nav = navigator.language.slice(0, 2).toLowerCase() as AppLocale
  if (SUPPORTED_LOCALES.includes(nav)) return nav

  return 'en'
}

const i18n = createI18n({
  legacy: false,
  locale: detectLocale(),
  fallbackLocale: 'en',
  messages: { en, id, ja },
})

export function setLocale(locale: AppLocale): void {
  i18n.global.locale.value = locale
  localStorage.setItem('locale', locale)
  document.documentElement.setAttribute('lang', locale)
}

export function applyHtmlLang(): void {
  document.documentElement.setAttribute('lang', i18n.global.locale.value)
}

export default i18n
