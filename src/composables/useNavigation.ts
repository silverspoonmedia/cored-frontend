import { computed, ref } from 'vue'
import i18n from '@/i18n'
import { get } from '@/api/client'
import { getEcho } from '@/composables/useEcho'
import type { ApiResponse, NavigationTreeNode } from '@/api/types'

const treeMap: Record<string, NavigationTreeNode[]> = {}
const loadedMap: Record<string, boolean> = {}
const fetchPromises: Record<string, Promise<void> | null> = {}

const reactiveTrees = ref<Record<string, NavigationTreeNode[]>>({})
const loading = ref(false)
const error = ref<string | null>(null)
let echoListener: (() => void) | null = null

function ensureLayoutBucket(layout: string): void {
  if (!(layout in treeMap)) {
    treeMap[layout] = []
    loadedMap[layout] = false
    fetchPromises[layout] = null
    reactiveTrees.value[layout] = []
  }
}

async function load(layout = 'sidebar'): Promise<void> {
  ensureLayoutBucket(layout)
  if (loadedMap[layout] || fetchPromises[layout]) return fetchPromises[layout] ?? Promise.resolve()

  loading.value = true
  error.value = null

  fetchPromises[layout] = (async () => {
    try {
      const res = await get<ApiResponse<NavigationTreeNode[]>>(`navigation/menus?layout=${layout}`)
      if (res.status === 'success' && Array.isArray(res.data)) {
        treeMap[layout] = res.data
        loadedMap[layout] = true
        reactiveTrees.value = { ...reactiveTrees.value, [layout]: res.data }
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

async function refetch(layout = 'sidebar'): Promise<void> {
  ensureLayoutBucket(layout)
  loadedMap[layout] = false
  fetchPromises[layout] = null
  return load(layout)
}

function seedTree(layout: string, nodes: NavigationTreeNode[]): void {
  ensureLayoutBucket(layout)
  treeMap[layout] = nodes
  loadedMap[layout] = true
  reactiveTrees.value = { ...reactiveTrees.value, [layout]: nodes }
}

function isTreeLoaded(layout: string): boolean {
  ensureLayoutBucket(layout)
  return loadedMap[layout] ?? false
}

function tree(layout: string): NavigationTreeNode[] {
  ensureLayoutBucket(layout)
  return reactiveTrees.value[layout] ?? []
}

const sidebarTree = computed(() => tree('sidebar'))
const navbarTree = computed(() => tree('navbar'))

function startRealtime(): void {
  if (echoListener) return
  const echo = getEcho()
  if (!echo) return

  try {
    const channel = echo.private('navigation.menus')
    channel.listen('.menu.tree.changed', (e: { layout?: string }) => {
      const layout = e.layout
      if (layout) {
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
    tree,
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
