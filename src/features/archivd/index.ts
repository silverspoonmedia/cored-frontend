import type { FeatureModule, Messages } from '@/features/types'
import { archivdFeatureRoutes } from '@/features/archivd/routes/feature'
import { useArchivdRealtime } from '@/features/archivd/composables/useArchivdRealtime'
import { registerSettingsMenuGroup } from '@/utils/settingsGroup'
import { registerLegacyAppRoot } from '@/router/legacy'
import { notifyShellSignal, provideShellSignal } from '@/composables/echo/shellRealtime'
import en from '@/i18n/features/archivd/en.json'

/**
 * Archivd — file hosting, team workspaces, public share links.
 *
 * Everything product-specific about Archivd lives under this directory; the
 * shell only sees this module through `src/features/registry.ts`.
 */
const ARCHIVD_LOCALE_LOADERS: Record<string, () => Promise<Messages>> = {
  id: async () => (await import('@/i18n/features/archivd/id.json')).default as Messages,
  ja: async () => (await import('@/i18n/features/archivd/ja.json')).default as Messages,
  ko: async () => (await import('@/i18n/features/archivd/ko.json')).default as Messages,
  'zh-CN': async () => (await import('@/i18n/features/archivd/zh-CN.json')).default as Messages,
  ar: async () => (await import('@/i18n/features/archivd/ar.json')).default as Messages,
  ru: async () => (await import('@/i18n/features/archivd/ru.json')).default as Messages,
}

export const archivdFeature: FeatureModule = {
  name: 'archivd',
  routes: archivdFeatureRoutes,
  messages: {
    en: en as Messages,
    // Every other locale is its own chunk: a product's translations must not
    // land in the entry bundle a fork pays for. Explicit importers (not a
    // template literal) so Vite can analyse the graph.
    load: (locale) => ARCHIVD_LOCALE_LOADERS[locale]?.() ?? Promise.resolve({}),
  },
  boot() {
    registerLegacyAppRoot('archivd')
    registerSettingsMenuGroup('archivd', 'bi-cloud-upload')

    // The dashboard's user summary shows the personal quota, which Archivd
    // broadcasts on its private channel. The core dashboard listens through the
    // shell-signal seam, so it never imports this composable, and the channel
    // is only joined while a consumer is mounted. A fork without Archivd simply
    // never raises the signal.
    provideShellSignal('quota', () => {
      const handlers = { onQuotaChanged: () => notifyShellSignal('quota') }
      const realtime = useArchivdRealtime()
      realtime.subscribe(handlers)
      return () => realtime.unsubscribe(handlers)
    })
  },
}
