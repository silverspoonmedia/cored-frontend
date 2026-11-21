import { batch } from '@/api/client'
import { bodyOfOrThrow } from '@/api/batch'
import type { MenuListItem } from '@/api/types'
import type { Select2Result } from '@/utils/select2-lookup'

/**
 * Batch-hydrate for Navigation menu edit view. Stage 1 fetches the menu;
 * stage 2 fans out the Select2 pre-hydration lookups in one batch.
 */

interface LookupPayload {
  results: Select2Result[]
  pagination: { more: boolean }
}

/** Which pre-hydration lookup a batch entry belongs to. */
export type MenuLookupKey = 'parent' | 'roles' | 'includes' | 'excludes'

interface MenuEditResult {
  menu: MenuListItem | null
  parentOptions: Select2Result[]
  roleOptions: Select2Result[]
  userIncludeOptions: Select2Result[]
  userExcludeOptions: Select2Result[]
  /**
   * Lookups whose batch entry did not come back as a 200 success. Their select
   * renders empty for display only, so the caller must treat that emptiness as
   * "unknown", never as "no value" — see
   * `src/utils/navigation/pruneUnresolvedReferences.ts`.
   */
  failedLookups: MenuLookupKey[]
}

/**
 * `bodyOfOrThrow` throws `TerminalBatchError` on 401/403/429 so an auth/RBAC
 * rejection is never mistaken for "this field has no value", and a non-terminal
 * non-200 (500/502/...) is recorded as failed instead of degrading to `[]`.
 */
function lookupResults(
  entry: { status: number; body: unknown } | undefined,
  key: MenuLookupKey,
  failedLookups: MenuLookupKey[],
): Select2Result[] {
  const body = bodyOfOrThrow<LookupPayload>(entry)
  if (body === null) {
    failedLookups.push(key)
    return []
  }
  return body.data?.results ?? []
}

async function hydrateMenuEdit(menuId: string): Promise<MenuEditResult> {
  const [menuRes] = await batch<unknown>([
    { path: `navigation/menus/${menuId}` },
  ])
  const menu = bodyOfOrThrow<MenuListItem>(menuRes)?.data ?? null

  if (!menu) {
    return {
      menu: null,
      parentOptions: [],
      roleOptions: [],
      userIncludeOptions: [],
      userExcludeOptions: [],
      failedLookups: [],
    }
  }

  // `ids[]` must stay an array: `apiUrl` serializes it to repeated params
  // (`ids[]=a&ids[]=b`). A comma-joined string fails `ids.* => uuid` (422).
  const requests: Array<{ path: string; query?: Record<string, unknown> }> = []
  const keys: MenuLookupKey[] = []

  if (menu.parent_id) {
    keys.push('parent')
    requests.push({ path: 'navigation/lookups/menus', query: { 'ids[]': menu.parent_id, layout: menu.layout, exclude: menuId } })
  }
  if (menu.role_ids && menu.role_ids.length > 0) {
    keys.push('roles')
    requests.push({ path: 'lookups/roles', query: { 'ids[]': menu.role_ids } })
  }
  if (menu.user_include_ids && menu.user_include_ids.length > 0) {
    keys.push('includes')
    requests.push({ path: 'lookups/users', query: { 'ids[]': menu.user_include_ids } })
  }
  if (menu.user_exclude_ids && menu.user_exclude_ids.length > 0) {
    keys.push('excludes')
    requests.push({ path: 'lookups/users', query: { 'ids[]': menu.user_exclude_ids } })
  }

  const lookups: Record<MenuLookupKey, Select2Result[]> = {
    parent: [],
    roles: [],
    includes: [],
    excludes: [],
  }
  const failedLookups: MenuLookupKey[] = []

  if (requests.length > 0) {
    const responses = await batch<unknown>(requests)
    keys.forEach((key, i) => {
      lookups[key] = lookupResults(responses[i], key, failedLookups)
    })
  }

  return {
    menu,
    parentOptions: lookups.parent,
    roleOptions: lookups.roles,
    userIncludeOptions: lookups.includes,
    userExcludeOptions: lookups.excludes,
    failedLookups,
  }
}

export function useNavigationHydrate() {
  return {
    hydrateMenuEdit,
  }
}
