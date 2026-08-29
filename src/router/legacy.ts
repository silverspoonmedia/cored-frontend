import type { RouteLocation, RouteLocationRaw } from 'vue-router'

export const LEGACY_APP_ROOTS = new Set([
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
  'vtual',
  'product-activations',
  'payments',
  'file-hosting',
  'payment-channels',
  'service-purchases',
])

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
