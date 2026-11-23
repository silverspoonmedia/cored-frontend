import type { RouteRecordRaw } from 'vue-router'

/** A translation tree: nested objects with string leaves. */
export type Messages = Record<string, unknown>

/**
 * A feature module is one optional product capability: its routes, its copy, and
 * any runtime wiring it needs on boot.
 *
 * The core SPA (`src/api`, `src/stores`, `src/layouts`, shared
 * `src/components`, `src/composables`, `src/views`) must never import a feature.
 * Features import core freely. A fork deletes `src/features/{name}`, its
 * `src/i18n/features/{name}/` directory, and its one line in
 * `src/features/registry.ts`.
 */
export interface FeatureModule {
  /** Stable name; also the uninstall-manifest key and the i18n directory name. */
  name: string
  /** Routes contributed to the router, in render order. */
  routes: RouteRecordRaw[]
  /**
   * The feature's own copy. English is bundled eagerly because it is the
   * fallback locale and must exist before the first render; every other locale
   * loads on demand so a product's translations never enter the entry chunk.
   */
  messages: FeatureMessages
  /** One-time wiring (realtime bridges into the shell, settings groups, …). */
  boot?: () => void
}

export interface FeatureMessages {
  /** Eager English pack, deep-merged over the core `en` bundle. */
  en: Messages
  /** Lazy loader for a non-English locale; omit when the feature ships none. */
  load?: (locale: string) => Promise<Messages>
}
