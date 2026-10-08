import { computed, ref } from 'vue'
import i18n from '@/i18n'
import { get } from '@/api/client'
import { listenMenusChannel } from '@/composables/navigation/useMenusChannel'
import { useAuth } from '@/stores/auth'
import type { ApiResponse, NavigationTreeNode } from '@/api/types'

const treeMap: Record<string, NavigationTreeNode[]> = {}
const loadedMap: Record<string, boolean> = {}
const fetchPromises: Record<string, Promise<void> | null> = {}

const reactiveTrees = ref<Record<string, NavigationTreeNode[]>>({})
const loading = ref(false)
const error = ref<string | null>(null)
let detachMenus: (() => void) | null = null

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

async function refetchAll(): Promise<void> {
  await Promise.all([refetch('sidebar'), refetch('navbar')])
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
  if (detachMenus) return

  // Shared navigation.menus channel (useMenusChannel) — ref-counted with the
  // Menus admin views, so unmounting a view can't kill shell nav updates.
  detachMenus = listenMenusChannel((e) => {
    // Targeted refresh (e.g. a role change on a membership record): ignore
    // events meant for other viewers; broadcast-all events keep old behavior.
    const { user } = useAuth()
    if (e.target_user_id && String(e.target_user_id) !== String(user.value?.id ?? '')) {
      return
    }
    const layout = e.layout
    if (layout) {
      void refetch(layout)
    } else {
      void refetch('sidebar')
      void refetch('navbar')
    }
  })
}

function stopRealtime(): void {
  if (detachMenus) {
    detachMenus()
    detachMenus = null
  }
}

export function resetNavigationState(): void {
  for (const layout of Object.keys(treeMap)) {
    treeMap[layout] = []
    loadedMap[layout] = false
    fetchPromises[layout] = null
  }
  reactiveTrees.value = {}
  loading.value = false
  error.value = null
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
    refetchAll,
    seedTree,
    isTreeLoaded,
    startRealtime,
    stopRealtime,
  }
}
