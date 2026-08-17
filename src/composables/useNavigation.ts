import { ref } from 'vue'
import i18n from '@/i18n'
import { get } from '@/api/client'
import { getEcho } from '@/composables/useEcho'
import type { ApiResponse, NavigationTreeNode } from '@/api/types'

type Layout = 'sidebar' | 'navbar'

const trees: Record<Layout, NavigationTreeNode[]> = { sidebar: [], navbar: [] }
const loadedMap: Record<Layout, boolean> = { sidebar: false, navbar: false }
const fetchPromises: Record<Layout, Promise<void> | null> = { sidebar: null, navbar: null }

const sidebarTree = ref<NavigationTreeNode[]>([])
const navbarTree = ref<NavigationTreeNode[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
let echoListener: (() => void) | null = null

async function load(layout: Layout = 'sidebar'): Promise<void> {
  if (loadedMap[layout] || fetchPromises[layout]) return fetchPromises[layout] ?? Promise.resolve()

  loading.value = true
  error.value = null

  fetchPromises[layout] = (async () => {
    try {
      const res = await get<ApiResponse<NavigationTreeNode[]>>(`navigation/menus?layout=${layout}`)
      if (res.status === 'success' && Array.isArray(res.data)) {
        trees[layout] = res.data
        loadedMap[layout] = true
        if (layout === 'sidebar') sidebarTree.value = res.data
        else navbarTree.value = res.data
      } else {
        error.value = res.message ?? i18n.global.t('web.navigation.load_failed')
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : i18n.global.t('web.navigation.load_failed')
    } finally {
      loading.value = false
      fetchPromises[layout] = null
    }
  })()

  return fetchPromises[layout]
}

async function refetch(layout: Layout = 'sidebar'): Promise<void> {
  loadedMap[layout] = false
  fetchPromises[layout] = null
  return load(layout)
}

/** Seed a layout tree from a shell-hydrate batch payload, marking it loaded so load() will not refetch. */
function seedTree(layout: Layout, nodes: NavigationTreeNode[]): void {
  trees[layout] = nodes
  loadedMap[layout] = true
  if (layout === 'sidebar') sidebarTree.value = nodes
  else navbarTree.value = nodes
}

function isTreeLoaded(layout: Layout): boolean {
  return loadedMap[layout]
}

function startRealtime(): void {
  if (echoListener) return
  const echo = getEcho()
  if (!echo) return

  try {
    const channel = echo.private('navigation.menus')
    channel.listen('.menu.tree.changed', (e: { layout?: string }) => {
      const layout = e.layout as Layout | undefined
      if (layout === 'sidebar' || layout === 'navbar') {
        refetch(layout)
      } else {
        refetch('sidebar')
        refetch('navbar')
      }
    })
    echoListener = () => echo.leave('navigation.menus')
  } catch {
    // Echo unavailable — polling fallback covers it
  }
}

function stopRealtime(): void {
  if (echoListener) {
    echoListener()
    echoListener = null
  }
}

export function useNavigation() {
  return {
    tree: sidebarTree,
    sidebarTree,
    navbarTree,
    loading,
    error,
    load,
    refetch,
    seedTree,
    isTreeLoaded,
    startRealtime,
    stopRealtime,
  }
}
