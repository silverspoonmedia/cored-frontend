import type { RouteLocationRaw, Router } from 'vue-router'

const PARAM_ALIASES: Record<string, string> = {
  user: 'id',
  modelCard: 'id',
  model_card: 'id',
}

function mapParams(actionParams: Record<string, unknown>): Record<string, string> {
  const params: Record<string, string> = {}
  for (const [key, value] of Object.entries(actionParams)) {
    if (value === undefined || value === null || value === '') continue
    const mapped = PARAM_ALIASES[key] ?? key
    params[mapped] = String(value)
  }
  return params
}

/**
 * Turn API `action_route` + Blade-shaped `action_params` into a Vue Router
 * location. Menu/API names are unprefixed (`users.edit`); SPA page names add
 * `.view`. Unknown names return null so the caller can fall back to the list.
 * Params that don't match route path segments (e.g. `token`) are passed as
 * query so deep-link pages like invite respond can read them.
 */
export function resolveNotificationLocation(
  router: Router,
  actionRoute: string | null | undefined,
  actionParams: Record<string, unknown> | null | undefined,
): RouteLocationRaw | null {
  if (!actionRoute || actionRoute === '#') return null

  const params = mapParams(actionParams ?? {})
  const candidates = actionRoute.endsWith('.view')
    ? [actionRoute]
    : [`${actionRoute}.view`, actionRoute]

  for (const name of candidates) {
    if (router.hasRoute(name)) {
      const record = router.getRoutes().find((r) => r.name === name)
      const pathKeys = new Set(record ? extractPathKeys(record.path) : [])
      const pathParams: Record<string, string> = {}
      const queryParams: Record<string, string> = {}
      for (const [key, value] of Object.entries(params)) {
        if (pathKeys.has(key)) {
          pathParams[key] = value
        } else {
          queryParams[key] = value
        }
      }
      return { name, params: pathParams, query: queryParams }
    }
  }

  return null
}

function extractPathKeys(path: string): string[] {
  const keys: string[] = []
  for (const match of path.matchAll(/:([A-Za-z_][A-Za-z0-9_]*)/g)) {
    const key = match[1]
    if (typeof key === 'string') keys.push(key)
  }
  return keys
}
