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
      return { name, params }
    }
  }

  return null
}
