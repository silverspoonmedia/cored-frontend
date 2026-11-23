/**
 * Browse/search/view-mode/lifecycle state for ArchivdView.
 *
 * Extracted from the view so the SFC keeps template + event wiring only.
 * Owns: browse/quota/workspaces/slots/billing/collection-status refs, the
 * hydrate-first loadAll fan-out, debounced search, view-mode persistence, and
 * the route-reactive reload. Mutations (move/rename/delete/share) stay in the
 * view — they need the alert/toast layer and selection interplay.
 *
 * Selection primitives live in useArchivdSelection (pure) and the selection Set is
 * owned by the caller (passed in) so both browse and drag-move can share it.
 */
import { ref, computed, watch, onUnmounted, type Ref, type ComputedRef } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useArchivd } from '@/features/archivd/composables/useArchivd'
import { useArchivdHydrate } from '@/features/archivd/composables/useArchivdHydrate'
import { useMicrostock } from '@/features/microstock/composables/useMicrostock'
import { useMicrostockBilling } from '@/features/microstock/composables/useMicrostockBilling'
import { formatCollectionProgress } from '@/features/archivd/utils/arMicrostockBadge'
import type { HostedFile, ArBrowsePayload, ArQuota, ArWorkspace } from '../types'
import type {
  MicrostockBillingSummary,
  MicrostockSlotStatus,
  MicrostockCollectionStatusPayload,
} from '@/features/microstock/types'

const VIEW_MODE_KEY = 'ar-view-mode'

function readViewMode(): 'table' | 'grid' {
  try {
    const stored = localStorage.getItem(VIEW_MODE_KEY)
    return stored === 'grid' ? 'grid' : 'table'
  } catch {
    return 'table'
  }
}

export function useArchivdBrowse(options: {
  selected: Ref<Set<string>>
  clearSelection: () => void
}) {
  const { selected, clearSelection } = options

  const route = useRoute()
  const { t } = useI18n()
  const ar = useArchivd()
  const { hydrateArchivd } = useArchivdHydrate()
  const ms = useMicrostock()
  const { fetchBilling } = useMicrostockBilling()

  const browse = ref<ArBrowsePayload | null>(null)
  const quota = ref<ArQuota | null>(null)
  const loading = ref(true)
  const browseError = ref<string | null>(null)
  const workspaces = ref<ArWorkspace[]>([])
  const slots = ref<MicrostockSlotStatus | null>(null)
  const billing = ref<MicrostockBillingSummary | null>(null)
  const collectionStatusPayload = ref<MicrostockCollectionStatusPayload | null>(null)

  const viewMode = ref<'table' | 'grid'>(readViewMode())

  function setViewMode(mode: 'table' | 'grid'): void {
    viewMode.value = mode
    try {
      localStorage.setItem(VIEW_MODE_KEY, mode)
    } catch {
      /* ignore */
    }
  }

  const currentFolderId = computed(() => {
    const id = route.params.folderId
    return typeof id === 'string' && id.length > 0 ? id : null
  })

  function ctxParams(): Record<string, unknown> {
    const params: Record<string, unknown> = {}
    const ws = route.query.workspace_id
    const uid = route.query.user_id
    if (typeof ws === 'string' && ws) params.workspace_id = ws
    if (typeof uid === 'string' && uid) params.user_id = uid
    return params
  }

  const folders = computed(() => browse.value?.folders ?? [])
  const files = computed(() => browse.value?.files ?? [])
  const crumbs = computed(() => browse.value?.breadcrumb ?? [])

  const isMicrostock = computed(() => browse.value?.workspace?.kind === 'microstock')
  const collectionLocked = computed(() => !!browse.value?.folder?.collection_locked)
  const requireFolder = computed(() => isMicrostock.value && !currentFolderId.value)
  const collectionStatus = computed(() => browse.value?.folder?.collection_status ?? collectionStatusPayload.value?.status ?? null)

  const parentMeta = computed(() => {
    if (!currentFolderId.value) return null
    const c = crumbs.value
    const id = c.length >= 2 ? (c[c.length - 2]?.id ?? null) : null
    return { id, href: '' }
  })

  const quotaPct = computed(() => {
    const q = quota.value
    if (!q) return 0
    const lim = Number(q.quota_bytes || 0)
    return lim > 0 ? Math.min(100, (Number(q.used_bytes || 0) / lim) * 100) : 0
  })

  function collectionProgressTextOf(payload: MicrostockCollectionStatusPayload): string {
    if (!isMicrostock.value || payload.total <= 0) return ''
    if (!['processing', 'review', 'exported'].includes(payload.status) && collectionStatus.value !== 'processing') {
      return ''
    }
    return formatCollectionProgress(
      payload.processed,
      payload.total,
      payload.failed,
      t('web.archivd.microstock.progress', { processed: payload.processed, total: payload.total }),
      t('web.archivd.microstock.progress_failed', { failed: payload.failed }),
    )
  }

  async function loadBrowse(opts?: { keepSelection?: boolean }): Promise<void> {
    loading.value = true
    browseError.value = null
    try {
      const params: Record<string, unknown> = { ...ctxParams() }
      if (currentFolderId.value) params.folder_id = currentFolderId.value
      browse.value = await ar.fetchBrowse(params)
      if (!opts?.keepSelection) clearSelection()
    } catch (e) {
      browseError.value = e instanceof Error ? e.message : t('web.archivd.load_failed')
    } finally {
      loading.value = false
    }
  }

  async function loadQuota(): Promise<void> {
    try {
      quota.value = await ar.fetchQuota(ctxParams())
    } catch {
      /* non-critical */
    }
  }

  async function loadWorkspaces(): Promise<void> {
    try {
      workspaces.value = await ar.fetchWorkspaces()
    } catch {
      workspaces.value = []
    }
  }

  async function loadSlots(): Promise<void> {
    try {
      slots.value = await ms.fetchSlots()
    } catch {
      slots.value = null
    }
  }

  async function loadBilling(): Promise<void> {
    if (browse.value?.workspace?.kind !== 'microstock') {
      billing.value = null
      return
    }
    try {
      billing.value = await fetchBilling()
    } catch {
      billing.value = null
    }
  }

  async function loadCollectionStatus(): Promise<void> {
    if (browse.value?.workspace?.kind !== 'microstock' || !currentFolderId.value) {
      collectionStatusPayload.value = null
      return
    }
    try {
      collectionStatusPayload.value = await ms.fetchCollectionStatus(currentFolderId.value)
    } catch {
      collectionStatusPayload.value = null
    }
  }

  async function loadAll(): Promise<void> {
    // loadAll owns the hydrate lifecycle: release the loading veil here, not
    // only inside loadBrowse (which a successful batch skips entirely).
    loading.value = true
    try {
      // One batch replaces the four independent reads; any sub that failed comes
      // back null and falls through to its own loader (keeping that loader's
      // error handling — browse toasts, the rest stay silent).
      const { browse: b, quota: q, workspaces: ws, slots: sl } = await hydrateArchivd({
        folderId: currentFolderId.value,
        ctx: ctxParams(),
      })

      if (b) {
        browse.value = b
        clearSelection()
      }
      if (q) quota.value = q
      if (ws) workspaces.value = ws
      if (sl) slots.value = sl

      const fallbacks: Promise<void>[] = []
      if (!b) fallbacks.push(loadBrowse())
      if (!q) fallbacks.push(loadQuota())
      if (!ws) fallbacks.push(loadWorkspaces())
      if (!sl) fallbacks.push(loadSlots())
      if (fallbacks.length) await Promise.all(fallbacks)

      // Dependent stage: gated on browse.workspace.kind === 'microstock'.
      await Promise.all([loadBilling(), loadCollectionStatus()])
    } finally {
      loading.value = false
    }
  }

  const uploadCtx = computed(() => ({
    folderId: currentFolderId.value,
    userId: typeof route.query.user_id === 'string' ? route.query.user_id : null,
    workspaceId: typeof route.query.workspace_id === 'string' ? route.query.workspace_id : null,
  }))

  // ---- Search (debounced) ----
  const searchQ = ref('')
  const searchResults = ref<HostedFile[]>([])
  const searchOpen = ref(false)
  let searchTimer: ReturnType<typeof setTimeout> | null = null

  watch(searchQ, (q) => {
    if (searchTimer) clearTimeout(searchTimer)
    searchTimer = setTimeout(async () => {
      const trimmed = q.trim()
      if (!trimmed) {
        searchResults.value = []
        searchOpen.value = false
        return
      }
      try {
        searchResults.value = await ar.searchFiles(trimmed, ctxParams())
      } catch {
        searchResults.value = []
      }
      searchOpen.value = true
    }, 250)
  })

  onUnmounted(() => {
    if (searchTimer) clearTimeout(searchTimer)
  })

  // ---- Route-reactive reload ----
  watch(
    () => `${String(route.params.folderId ?? '')}|${String(route.query.workspace_id ?? '')}|${String(route.query.user_id ?? '')}`,
    () => {
      loadAll()
    },
    { immediate: true },
  )

  return {
    // state
    browse,
    quota,
    loading,
    browseError,
    workspaces,
    slots,
    billing,
    collectionStatusPayload,
    viewMode,
    searchQ,
    searchResults,
    searchOpen,
    // computed
    currentFolderId,
    folders,
    files,
    crumbs,
    isMicrostock,
    collectionLocked,
    requireFolder,
    collectionStatus,
    parentMeta,
    quotaPct,
    uploadCtx,
    collectionProgressTextOf: collectionProgressTextOf as (
      payload: MicrostockCollectionStatusPayload,
    ) => string,
    // actions
    setViewMode,
    ctxParams,
    loadBrowse,
    loadQuota,
    loadWorkspaces,
    loadSlots,
    loadBilling,
    loadCollectionStatus,
    loadAll,
  } as {
    browse: Ref<ArBrowsePayload | null>
    quota: Ref<ArQuota | null>
    loading: Ref<boolean>
    browseError: Ref<string | null>
    workspaces: Ref<ArWorkspace[]>
    slots: Ref<MicrostockSlotStatus | null>
    billing: Ref<MicrostockBillingSummary | null>
    collectionStatusPayload: Ref<MicrostockCollectionStatusPayload | null>
    viewMode: Ref<'table' | 'grid'>
    searchQ: Ref<string>
    searchResults: Ref<HostedFile[]>
    searchOpen: Ref<boolean>
    currentFolderId: ComputedRef<string | null>
    folders: ComputedRef<ArBrowsePayload['folders']>
    files: ComputedRef<ArBrowsePayload['files']>
    crumbs: ComputedRef<ArBrowsePayload['breadcrumb']>
    isMicrostock: ComputedRef<boolean>
    collectionLocked: ComputedRef<boolean>
    requireFolder: ComputedRef<boolean>
    collectionStatus: ComputedRef<string | null>
    parentMeta: ComputedRef<{ id: string | null; href: string } | null>
    quotaPct: ComputedRef<number>
    uploadCtx: ComputedRef<{ folderId: string | null; userId: string | null; workspaceId: string | null }>
    collectionProgressTextOf: (payload: MicrostockCollectionStatusPayload) => string
    setViewMode: (mode: 'table' | 'grid') => void
    ctxParams: () => Record<string, unknown>
    loadBrowse: (opts?: { keepSelection?: boolean }) => Promise<void>
    loadQuota: () => Promise<void>
    loadWorkspaces: () => Promise<void>
    loadSlots: () => Promise<void>
    loadBilling: () => Promise<void>
    loadCollectionStatus: () => Promise<void>
    loadAll: () => Promise<void>
  }
}
