import type { RouteLocation, RouteLocationRaw } from 'vue-router'

/**
 * Legacy `/apps/...` roots the core SPA redirects. A feature adds its own root
 * from `boot()` so the core never names a product route.
 */
const CORE_LEGACY_APP_ROOTS = [
  'dashboard',
  'profile',
  'currencies',
  'notification-audiences',
  'activity-logs',
  'error-logs',
  'notifications',
  'settings',
  'domain-access',
  'users',
  'menus',
  'inference',
  'payment-gateways',
  'subscriptions',
  'services',
  'invoices',
  'product-activations',
  'payments',
  'payment-channels',
  'service-purchases',
]

const featureRoots = new Set<string>()

export const LEGACY_APP_ROOTS = new Set(CORE_LEGACY_APP_ROOTS)

/** Register a product route root that still answers an old `/apps/<root>/…` URL. */
export function registerLegacyAppRoot(root: string): void {
  featureRoots.add(root)
  LEGACY_APP_ROOTS.add(root)
}

export function legacyAppsRedirect(to: RouteLocation): RouteLocationRaw {
  const root = String(to.params.legacyRoot ?? '')
  if (!LEGACY_APP_ROOTS.has(root)) {
    return { name: 'not-found.view' }
  }
  const rest = to.params.pathMatch
  const tail = Array.isArray(rest) && rest.length > 0
    ? `/${rest.join('/')}`
    : typeof rest === 'string' && rest.length > 0
      ? `/${rest}`
      : ''
  return { path: `/apps/${root}${tail}`, query: to.query, hash: to.hash }
}
