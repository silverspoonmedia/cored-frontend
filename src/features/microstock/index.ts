import type { FeatureModule, Messages } from '@/features/types'
import { microstockFeatureRoutes } from '@/features/microstock/routes/feature'
import { registerSettingsMenuGroup } from '@/utils/settingsGroup'
import en from '@/i18n/features/microstock/en.json'

/**
 * Microstock — marketplace metadata analysis and upload.
 *
 * Everything product-specific about Microstock lives under this directory; the
 * shell only sees this module through `src/features/registry.ts`.
 */
const MICROSTOCK_LOCALE_LOADERS: Record<string, () => Promise<Messages>> = {
  id: async () => (await import('@/i18n/features/microstock/id.json')).default as Messages,
  ja: async () => (await import('@/i18n/features/microstock/ja.json')).default as Messages,
  ko: async () => (await import('@/i18n/features/microstock/ko.json')).default as Messages,
  'zh-CN': async () => (await import('@/i18n/features/microstock/zh-CN.json')).default as Messages,
  ar: async () => (await import('@/i18n/features/microstock/ar.json')).default as Messages,
  ru: async () => (await import('@/i18n/features/microstock/ru.json')).default as Messages,
}

export const microstockFeature: FeatureModule = {
  name: 'microstock',
  routes: microstockFeatureRoutes,
  messages: {
    en: en as Messages,
    load: (locale) => MICROSTOCK_LOCALE_LOADERS[locale]?.() ?? Promise.resolve({}),
  },
  boot() {
    registerSettingsMenuGroup('microstock', 'bi-images')
  },
}
