import { batch } from '@/api/client'
import { bodyOf } from '@/api/batch'
import type {
  ApiResponse,
  MenuListItem,
} from '@/api/types'
import type { Select2Result } from '@/utils/select2-lookup'

/**
 * Batch-hydrate for Navigation menu edit view. Stage 1 fetches the menu;
 * stage 2 fans out the Select2 pre-hydration lookups in one batch.
 */

interface LookupPayload {
  results: Select2Result[]
  pagination: { more: boolean }
}

interface MenuEditResult {
  menu: MenuListItem | null
  parentOptions: Select2Result[]
  roleOptions: Select2Result[]
  userIncludeOptions: Select2Result[]
  userExcludeOptions: Select2Result[]
}

function lookupResults(body: ApiResponse<LookupPayload> | null): Select2Result[] {
  return body?.data?.results ?? []
}

async function hydrateMenuEdit(menuId: string): Promise<MenuEditResult> {
  const [menuRes] = await batch<unknown>([
    { path: `navigation/menus/${menuId}` },
  ])
  const menu = bodyOf<MenuListItem>(menuRes)?.data ?? null

  if (!menu) {
    return { menu: null, parentOptions: [], roleOptions: [], userIncludeOptions: [], userExcludeOptions: [] }
  }

  const requests: Array<{ path: string; query?: Record<string, string> }> = []
  const keys: string[] = []

  if (menu.parent_id) {
    keys.push('parent')
    requests.push({ path: 'lookups/menus', query: { 'ids[]': menu.parent_id, layout: menu.layout, exclude: menuId } })
  }
  if (menu.role_ids && menu.role_ids.length > 0) {
    keys.push('roles')
    requests.push({ path: 'lookups/roles', query: { 'ids[]': menu.role_ids.join(',') } })
  }
  if (menu.user_include_ids && menu.user_include_ids.length > 0) {
    keys.push('includes')
    requests.push({ path: 'lookups/users', query: { 'ids[]': menu.user_include_ids.join(',') } })
  }
  if (menu.user_exclude_ids && menu.user_exclude_ids.length > 0) {
    keys.push('excludes')
    requests.push({ path: 'lookups/users', query: { 'ids[]': menu.user_exclude_ids.join(',') } })
  }

  const lookups: Record<string, Select2Result[]> = { parent: [], roles: [], includes: [], excludes: [] }

  if (requests.length > 0) {
    const responses = await batch<unknown>(requests)
    keys.forEach((key, i) => {
      lookups[key] = lookupResults(bodyOf<LookupPayload>(responses[i])) ?? []
    })
  }

  return {
    menu,
    parentOptions: lookups.parent ?? [],
    roleOptions: lookups.roles ?? [],
    userIncludeOptions: lookups.includes ?? [],
    userExcludeOptions: lookups.excludes ?? [],
  }
}

export function useNavigationHydrate() {
  return {
    hydrateMenuEdit,
  }
}
