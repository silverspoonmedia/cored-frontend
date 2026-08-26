import { ref } from 'vue'
import { useRouter } from 'vue-router'
import type { RouteLocationNormalizedLoaded } from 'vue-router'
import i18n from '@/i18n'
import { get } from '@/api/client'
import type { ApiResponse, NavigationTreeNode } from '@/api/types'
import type { RouteLocationRaw } from 'vue-router'

// Guest-safe navigation tree (layout=vtual) cached in-tab for 60s, with a
// stale-while-revalidate flavour: stale data renders instantly while a
// background request revalidates.
const TTL_MS = 60_000

const tree = ref<NavigationTreeNode[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

let cachedAt = 0
let inflight: Promise<void> | null = null

async function load(force = false): Promise<void> {
  if (!force && cachedAt && Date.now() - cachedAt < TTL_MS) return
  if (inflight) return inflight

  loading.value = true
  error.value = null

  inflight = (async () => {
    try {
      const res = await get<ApiResponse<NavigationTreeNode[]>>('navigation/menus?layout=vtual')
      if (res.status === 'success' && Array.isArray(res.data)) {
        tree.value = res.data
        cachedAt = Date.now()
      } else {
        error.value = res.message ?? i18n.global.t('ui.navigation.load_failed')
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : i18n.global.t('ui.navigation.load_failed')
    } finally {
      loading.value = false
      inflight = null
    }
  })()

  return inflight
}

/**
 * Resolve a navigation node into a router-link destination. Public vTual nodes
 * point at the `vtual.public` route (or its `.view` child), with an optional
 * `hash` appended for in-page anchors (#vtubers, #contents).
 */
function resolveRoute(node: NavigationTreeNode): RouteLocationRaw | null {
  if (!node.route || node.route === '#') return null
  const router = useRouter()
  const target = node.route.endsWith('.view') ? node.route : `${node.route}.view`
  const name = router.hasRoute(target) ? target : (router.hasRoute(node.route) ? node.route : null)
  if (!name) return null
  return { name, hash: node.hash ?? undefined }
}

function resolveHref(node: NavigationTreeNode): string {
  const to = resolveRoute(node)
  if (!to) return '#'
  const router = useRouter()
  return router.resolve(to).href
}

/**
 * Hash-aware active check for the Valkivid3 nav. Home/Directory/Contents share
 * the `vtual.public` route, so the `hash` column discriminates: a node with a
 * hash is active only when the route hash matches; a node without a hash is
 * active only when the route has no hash. Parents recurse into children.
 */
export function isVkNavActive(node: NavigationTreeNode, route: RouteLocationNormalizedLoaded): boolean {
  if (node.route && node.route !== '#') {
    const target = node.route.endsWith('.view') ? node.route : `${node.route}.view`
    const nameMatch = route.name === node.route || route.name === target
    if (nameMatch) {
      if (node.hash) return route.hash === node.hash
      return !route.hash
    }
  }
  return node.children.some((child) => isVkNavActive(child, route))
}

export function useVkNavigation() {
  return {
    tree,
    loading,
    error,
    load,
    resolveRoute,
    resolveHref,
  }
}

