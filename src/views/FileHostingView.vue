<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import ConfirmModal from '@/components/ConfirmModal.vue'
import Modal from '@/components/Modal.vue'
import FhDropzone from '@/components/FhDropzone.vue'
import FhIcon from '@/components/FhIcon.vue'
import FhShareModal from '@/components/FhShareModal.vue'
import FhCollectionDescribeModal from '@/components/FhCollectionDescribeModal.vue'
import FhMicrostockReviewModal from '@/components/FhMicrostockReviewModal.vue'
import { useFileHosting } from '@/composables/useFileHosting'
import { useMicrostock } from '@/composables/useMicrostock'
import { useMicrostockBilling } from '@/composables/useMicrostockBilling'
import { useFileHostingRealtime } from '@/composables/useFileHostingRealtime'
import { useEcho } from '@/composables/useEcho'
import { useAlert } from '@/composables/useAlert'
import { useFhDragMove } from '@/composables/useFhDragMove'
import { applyBrowseClick, listingKeys, idsByEntity } from '@/composables/useFhSelection'
import { formatCollectionProgress, resolveMicrostockBadge, type FhMicrostockBadgeLabels } from '@/utils/fhMicrostockBadge'
import { useAuth } from '@/stores/auth'
import type {
  HostedFile,
  FhFolder,
  FhBrowsePayload,
  FhQuota,
  FhWorkspace,
  MicrostockBillingSummary,
  MicrostockSlotStatus,
  MicrostockCollectionStatusPayload,
} from '@/api/types'

const VIS_LINK = 'anyone_with_link'
const VIEW_MODE_KEY = 'fh-view-mode'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const fh = useFileHosting()
const ms = useMicrostock()
const { fetchBilling } = useMicrostockBilling()
const { hasPermission, token } = useAuth()
const { success: showSuccess, error: showError } = useAlert()
const { subscribe: subscribeFhRealtime, unsubscribe: unsubscribeFhRealtime } = useFileHostingRealtime()
const { connected: echoConnected } = useEcho(() => token.value)

const browse = ref<FhBrowsePayload | null>(null)
const quota = ref<FhQuota | null>(null)
const loading = ref(true)
const isBusy = ref(false)
const workspaces = ref<FhWorkspace[]>([])
const slots = ref<MicrostockSlotStatus | null>(null)
const billing = ref<MicrostockBillingSummary | null>(null)
const collectionStatusPayload = ref<MicrostockCollectionStatusPayload | null>(null)
const selected = ref<Set<string>>(new Set())
const selectionAnchor = ref<string | null>(null)

function readViewMode(): 'table' | 'grid' {
  try {
    const stored = localStorage.getItem(VIEW_MODE_KEY)
    return stored === 'grid' ? 'grid' : 'table'
  } catch {
    return 'table'
  }
}

const viewMode = ref<'table' | 'grid'>(readViewMode())

function setViewMode(mode: 'table' | 'grid'): void {
  viewMode.value = mode
  try {
    localStorage.setItem(VIEW_MODE_KEY, mode)
  } catch {
    /* ignore */
  }
}

const searchQ = ref('')
const searchResults = ref<HostedFile[]>([])
const searchOpen = ref(false)
let searchTimer: ReturnType<typeof setTimeout> | null = null

type FhModal =
  | { type: 'folder'; name: string }
  | { type: 'rename'; entity: 'folder' | 'file'; id: string; name: string }
  | { type: 'move'; keys: string[]; target: string }

const modal = ref<FhModal | null>(null)
const showShare = ref(false)
const shareVisibility = ref('private')
const shareUrl = ref<string | null>(null)
const shareTarget = ref<{ entity: 'folder' | 'file'; id: string } | null>(null)
const showDeleteConfirm = ref(false)
const deleteTarget = ref<{ type: 'folder' | 'file'; id: string } | null>(null)

type ContextMenuState = {
  x: number
  y: number
  entity: 'folder' | 'file'
  item: FhFolder | HostedFile
}

const contextMenu = ref<ContextMenuState | null>(null)

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

function keepQuery(): Record<string, string | string[]> {
  const q: Record<string, string | string[]> = {}
  for (const [k, v] of Object.entries(route.query)) {
    if (typeof v === 'string') q[k] = v
    else if (Array.isArray(v)) q[k] = v.filter((x): x is string => typeof x === 'string')
  }
  return q
}

function folderHref(folderId: string | null): string {
  if (!folderId) {
    return router.resolve({ name: 'file-hosting.index.view', query: route.query }).href
  }
  return router.resolve({
    name: 'file-hosting.index.folder',
    params: { folderId },
    query: route.query,
  }).href
}

function fileHref(id: string): string {
  return router.resolve({
    name: 'file-hosting.show.view',
    params: { id },
    query: route.query,
  }).href
}

const folders = computed(() => browse.value?.folders ?? [])
const files = computed(() => browse.value?.files ?? [])
const crumbs = computed(() => browse.value?.breadcrumb ?? [])
const allKeys = computed(() => listingKeys(folders.value, files.value))
const isEmpty = computed(() => folders.value.length === 0 && files.value.length === 0)
const selectedCount = computed(() => selected.value.size)
const allSelected = computed(() => allKeys.value.length > 0 && allKeys.value.every((k) => selected.value.has(k)))

const canCreateFile = computed(() => hasPermission('create file hosting file'))
const canCreateFolder = computed(() => hasPermission('create file hosting folder'))
const canEditFolder = computed(() => hasPermission('edit file hosting folder'))
const canEditFile = computed(() => hasPermission('edit file hosting file'))
const canDeleteFolder = computed(() => hasPermission('delete file hosting folder'))
const canDeleteFile = computed(() => hasPermission('delete file hosting file'))

function canEdit(entity: 'folder' | 'file'): boolean {
  return entity === 'folder' ? canEditFolder.value : canEditFile.value
}

function canDelete(entity: 'folder' | 'file'): boolean {
  return entity === 'folder' ? canDeleteFolder.value : canDeleteFile.value
}

const isMicrostock = computed(() => browse.value?.workspace?.kind === 'microstock')
const collectionLocked = computed(() => !!browse.value?.folder?.collection_locked)
const requireFolder = computed(() => isMicrostock.value && !currentFolderId.value)
const collectionStatus = computed(() => browse.value?.folder?.collection_status ?? collectionStatusPayload.value?.status ?? null)

const showLockBtn = computed(() => {
  if (!isMicrostock.value || !currentFolderId.value) return false
  const status = collectionStatus.value
  return status === 'draft' || status === 'failed' || !status
})
const showAnalyzeBtn = computed(() => isMicrostock.value && collectionStatus.value === 'locked')
const showReviewBtn = computed(() => {
  if (!isMicrostock.value || !currentFolderId.value) return false
  return ['processing', 'review', 'exported'].includes(collectionStatus.value ?? '')
})
const showExportBtn = computed(() => isMicrostock.value && collectionStatus.value === 'review')
const showDownloadBtn = computed(() => isMicrostock.value && collectionStatus.value === 'exported')

function canLockCollection(folder: FhFolder): boolean {
  if (!folder.collection_status) return false
  if (folder.collection_locked) return false
  return folder.collection_status === 'draft' || folder.collection_status === 'failed'
}

const collectionProgressText = computed(() => {
  const payload = collectionStatusPayload.value
  if (!isMicrostock.value || !payload || payload.total <= 0) return ''
  if (!['processing', 'review', 'exported'].includes(payload.status) && collectionStatus.value !== 'processing') {
    return ''
  }
  return formatCollectionProgress(
    payload.processed,
    payload.total,
    payload.failed,
    t('web.file-hosting.microstock.progress', { processed: payload.processed, total: payload.total }),
    t('web.file-hosting.microstock.progress_failed', { failed: payload.failed }),
  )
})

const collectionStatusHint = computed(() => {
  const status = collectionStatus.value
  if (!isMicrostock.value || !status) return ''
  if (status === 'locked') return t('web.file-hosting.microstock.status_locked')
  if (status === 'processing') {
    const extra = collectionStatusPayload.value?.billing_tier === 'free'
      ? ` ${t('web.file-hosting.microstock.status_processing_free_tier')}`
      : ''
    return t('web.file-hosting.microstock.status_processing') + extra
  }
  if (status === 'review') return t('web.file-hosting.microstock.status_review')
  if (status === 'exported') return t('web.file-hosting.microstock.status_exported')
  if (status === 'failed') return t('web.file-hosting.microstock.status_failed')
  return ''
})

const parentMeta = computed(() => {
  if (!currentFolderId.value) return null
  const c = crumbs.value
  const id = c.length >= 2 ? (c[c.length - 2]?.id ?? null) : null
  return { id, href: folderHref(id) }
})

const rootLabel = computed(() => {
  if (route.query.workspace_id) {
    return browse.value?.workspace?.name
      ?? workspaces.value.find((w) => w.id === route.query.workspace_id)?.name
      ?? t('web.file-hosting.workspace_team')
  }
  return t('web.file-hosting.personal')
})

const quotaPct = computed(() => {
  const q = quota.value
  if (!q) return 0
  const lim = Number(q.quota_bytes || 0)
  return lim > 0 ? Math.min(100, (Number(q.used_bytes || 0) / lim) * 100) : 0
})

const badgeLabels = computed<FhMicrostockBadgeLabels>(() => ({
  noMetadata: t('web.file-hosting.microstock.no_metadata'),
  statusPending: t('web.file-hosting.microstock.status_pending'),
  statusGenerated: t('web.file-hosting.microstock.status_generated'),
  statusFinalized: t('web.file-hosting.microstock.status_finalized'),
  statusFailed: t('web.file-hosting.microstock.status_failed_item'),
  stageVision: t('web.file-hosting.microstock.stage_vision'),
  stageThinking: t('web.file-hosting.microstock.stage_thinking'),
  stageQueuedThinking: t('web.file-hosting.microstock.stage_queued_thinking'),
  stageDegraded: t('web.file-hosting.microstock.stage_degraded'),
}))

function msBadge(file: HostedFile) {
  return resolveMicrostockBadge(file.microstock, badgeLabels.value)
}

const moveTargets = computed(() => {
  const keys = modal.value?.type === 'move' ? modal.value.keys : []
  return folders.value.filter((f) => !keys.includes(`folder:${f.id}`))
})

const uploadCtx = computed(() => ({
  folderId: currentFolderId.value,
  userId: typeof route.query.user_id === 'string' ? route.query.user_id : null,
  workspaceId: typeof route.query.workspace_id === 'string' ? route.query.workspace_id : null,
}))

function clearSelection(): void {
  selected.value = new Set()
  selectionAnchor.value = null
}

function toggleSelect(key: string, on?: boolean): void {
  const next = new Set(selected.value)
  const enable = on === undefined ? !next.has(key) : on
  if (enable) next.add(key)
  else next.delete(key)
  selected.value = next
}

function setSelection(next: Set<string>, anchorKey: string | null): void {
  selected.value = next
  selectionAnchor.value = anchorKey
}

function selectAllKeys(keys: string[], on: boolean): void {
  selected.value = on ? new Set(keys) : new Set()
  if (!on) selectionAnchor.value = null
}

async function loadBrowse(opts?: { keepSelection?: boolean }): Promise<void> {
  loading.value = true
  try {
    const params: Record<string, unknown> = { ...ctxParams() }
    if (currentFolderId.value) params.folder_id = currentFolderId.value
    browse.value = await fh.fetchBrowse(params)
    if (!opts?.keepSelection) clearSelection()
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.file-hosting.load_failed'))
  } finally {
    loading.value = false
  }
}

async function loadQuota(): Promise<void> {
  try {
    quota.value = await fh.fetchQuota(ctxParams())
  } catch {
    /* non-critical */
  }
}

async function loadWorkspaces(): Promise<void> {
  try {
    workspaces.value = await fh.fetchWorkspaces()
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
  await Promise.all([loadBrowse(), loadQuota(), loadWorkspaces(), loadSlots()])
  await Promise.all([loadBilling(), loadCollectionStatus()])
}

function switchWorkspace(id: string | null): void {
  const query: Record<string, string> = {}
  if (id) query.workspace_id = id
  const uid = route.query.user_id
  if (typeof uid === 'string' && uid) query.user_id = uid
  router.push({ name: 'file-hosting.index.view', query })
}

function navigateToFolder(folderId: string): void {
  router.push({
    name: 'file-hosting.index.folder',
    params: { folderId },
    query: keepQuery(),
  })
}

function navigateToRoot(): void {
  router.push({ name: 'file-hosting.index.view', query: keepQuery() })
}

function openFile(file: HostedFile): void {
  router.push({
    name: 'file-hosting.show.view',
    params: { id: file.id },
    query: keepQuery(),
  })
}

function openItem(entity: 'folder' | 'file', item: { id: string }): void {
  if (entity === 'folder') navigateToFolder(item.id)
  else openFile(item as HostedFile)
}

function onBrowseSelect(e: MouseEvent, entity: 'folder' | 'file', item: { id: string }): void {
  const target = e.target
  if (target instanceof Element && target.closest('input, button, .fh-table__action-btn, .fh-action-group, a.fh-table__action-btn')) {
    return
  }
  e.preventDefault()
  const key = `${entity}:${item.id}`
  const { next, anchorKey } = applyBrowseClick({
    key,
    event: e,
    selected: selected.value,
    anchorKey: selectionAnchor.value,
    orderedKeys: allKeys.value,
  })
  setSelection(next, anchorKey)
}

function onBrowseOpen(e: MouseEvent, entity: 'folder' | 'file', item: { id: string }): void {
  e.preventDefault()
  openItem(entity, item)
}

function onContext(e: MouseEvent, entity: 'folder' | 'file', item: FhFolder | HostedFile): void {
  e.preventDefault()
  const key = `${entity}:${item.id}`
  if (!selected.value.has(key)) {
    clearSelection()
    toggleSelect(key, true)
    selectionAnchor.value = key
  }
  contextMenu.value = { x: e.clientX, y: e.clientY, entity, item }
}

function visLabel(v: string): string {
  if (v === VIS_LINK) return t('web.file-hosting.visibility.anyone_with_link')
  if (v === 'workspace') return t('web.file-hosting.workspace_team')
  return t('web.file-hosting.visibility.private')
}

function visBadgeClass(v: string): string {
  return v === VIS_LINK ? 'fh-badge--link' : 'fh-badge--private'
}

async function withBusy(fn: () => Promise<void>): Promise<boolean> {
  isBusy.value = true
  try {
    await fn()
    return true
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.file-hosting.operation_failed'))
    return false
  } finally {
    isBusy.value = false
  }
}

async function moveItems(keys: string[], targetFolderId: string | null): Promise<boolean> {
  if (!keys.length) return false
  return withBusy(async () => {
    for (const key of keys) {
      const [entity, id] = key.split(':')
      if (!id) continue
      if (entity === 'folder') await fh.moveFolder(id, targetFolderId, ctxParams())
      else if (entity === 'file') await fh.moveFile(id, targetFolderId, ctxParams())
    }
    showSuccess(t('web.file-hosting.items_moved', { count: keys.length }))
    clearSelection()
    await loadAll()
  })
}

const drag = useFhDragMove({
  selected,
  clearSelection,
  toggleSelect,
  moveItems,
})

function openModal(type: 'folder'): void
function openModal(type: 'rename', payload: { entity: 'folder' | 'file'; id: string; name: string }): void
function openModal(type: 'move', payload: { keys: string[] }): void
function openModal(
  type: 'folder' | 'rename' | 'move',
  payload?: { entity?: 'folder' | 'file'; id?: string; name?: string; keys?: string[] },
): void {
  contextMenu.value = null
  if (type === 'folder') {
    modal.value = { type: 'folder', name: '' }
  } else if (type === 'rename' && payload?.entity && payload.id) {
    modal.value = { type: 'rename', entity: payload.entity, id: payload.id, name: payload.name ?? '' }
  } else if (type === 'move') {
    modal.value = { type: 'move', keys: payload?.keys ?? [], target: '' }
  }
}

function openShare(entity: 'folder' | 'file', item: { id: string; visibility?: string; share_url?: string | null }): void {
  contextMenu.value = null
  shareTarget.value = { entity, id: item.id }
  shareVisibility.value = item.visibility || 'private'
  shareUrl.value = item.share_url ?? null
  showShare.value = true
}

async function submitModal(): Promise<void> {
  const m = modal.value
  if (!m) return
  let ok = false
  if (m.type === 'folder') {
    const name = m.name.trim()
    if (!name) return
    ok = await withBusy(async () => {
      await fh.createFolder(name, {
        parent_id: currentFolderId.value ?? undefined,
        user_id: typeof route.query.user_id === 'string' ? route.query.user_id : undefined,
        workspace_id: typeof route.query.workspace_id === 'string' ? route.query.workspace_id : undefined,
      })
      showSuccess(t('web.file-hosting.folder_created'))
      await loadAll()
    })
  } else if (m.type === 'rename') {
    const name = m.name.trim()
    if (!name) return
    ok = await withBusy(async () => {
      if (m.entity === 'folder') await fh.renameFolder(m.id, name, ctxParams())
      else await fh.renameFile(m.id, name, ctxParams())
      showSuccess(t('web.file-hosting.renamed'))
      await loadBrowse({ keepSelection: true })
    })
  } else if (m.type === 'move') {
    ok = await moveItems(m.keys, m.target || null)
  }
  if (ok) modal.value = null
}

async function saveShare(): Promise<void> {
  if (!shareTarget.value) return
  const { entity, id } = shareTarget.value
  const ok = await withBusy(async () => {
    let updated: { share_url: string | null }
    if (entity === 'folder') {
      updated = await fh.setFolderVisibility(id, shareVisibility.value, ctxParams())
    } else {
      updated = await fh.setFileVisibility(id, shareVisibility.value, ctxParams())
    }
    shareUrl.value = updated.share_url
    if (shareVisibility.value === VIS_LINK && updated.share_url) {
      await navigator.clipboard.writeText(updated.share_url)
      showSuccess(t('web.file-hosting.share_url_copied'))
    } else {
      showSuccess(t('web.file-hosting.visibility_updated'))
    }
    await loadBrowse({ keepSelection: true })
  })
  if (ok) showShare.value = false
}

function openDelete(entity: 'folder' | 'file', id: string): void {
  contextMenu.value = null
  deleteTarget.value = { type: entity, id }
  showDeleteConfirm.value = true
}

async function handleDelete(): Promise<void> {
  if (!deleteTarget.value) return
  const { type, id } = deleteTarget.value
  const ok = await withBusy(async () => {
    if (type === 'folder') await fh.deleteFolder(id, ctxParams())
    else await fh.deleteFile(id, ctxParams())
    showSuccess(t('web.file-hosting.deleted'))
    await loadAll()
  })
  if (ok) {
    showDeleteConfirm.value = false
    deleteTarget.value = null
  }
}

async function handleBulkVisibility(visibility: string): Promise<void> {
  const ids = idsByEntity(selected.value)
  if (!ids.file.length && !ids.folder.length) return
  await withBusy(async () => {
    let total = 0
    if (ids.folder.length) total += await fh.bulkSetFolderVisibility(ids.folder, visibility, ctxParams())
    if (ids.file.length) total += await fh.bulkSetFileVisibility(ids.file, visibility, ctxParams())
    showSuccess(t('web.file-hosting.items_updated', { count: total }))
    clearSelection()
    await loadAll()
  })
}

async function handleBulkDelete(): Promise<void> {
  const ids = idsByEntity(selected.value)
  if (!ids.file.length && !ids.folder.length) return
  await withBusy(async () => {
    let total = 0
    if (ids.folder.length) total += await fh.bulkDeleteFolders(ids.folder, ctxParams())
    if (ids.file.length) total += await fh.bulkDeleteFiles(ids.file, ctxParams())
    showSuccess(t('web.file-hosting.items_deleted', { count: total }))
    clearSelection()
    await loadAll()
  })
}

function ctxAction(action: 'open' | 'rename' | 'move' | 'share' | 'delete' | 'review'): void {
  const cm = contextMenu.value
  if (!cm) return
  const item = cm.item
  contextMenu.value = null
  if (action === 'open') openItem(cm.entity, item)
  else if (action === 'rename') openModal('rename', { entity: cm.entity, id: item.id, name: item.name })
  else if (action === 'move') openModal('move', { keys: [`${cm.entity}:${item.id}`] })
  else if (action === 'share') openShare(cm.entity, item)
  else if (action === 'delete') openDelete(cm.entity, item.id)
  else if (action === 'review') openReview(item.id)
}

function onFileUploaded(file: HostedFile): void {
  if (browse.value) {
    browse.value.files.unshift(file)
  }
}

const showCollectionModal = ref(false)
const collectionFolder = ref<FhFolder | null>(null)
const lockingCollection = ref(false)
const analyzingCollection = ref(false)
const exportingCollection = ref(false)
const showReview = ref(false)
const reviewFileId = ref<string | null>(null)
const showCreateMs = ref(false)
const createMsName = ref('')
const creatingMs = ref(false)

const reviewFileIds = computed(() => files.value.map((f) => f.id))

function openCollectionModal(folder: FhFolder): void {
  collectionFolder.value = folder
  showCollectionModal.value = true
}

function openReview(fileId?: string): void {
  const selectedFile = [...selected.value]
    .filter((k) => k.startsWith('file:'))
    .map((k) => k.slice(5))[0]
  const id = fileId ?? selectedFile ?? files.value[0]?.id ?? null
  if (!id) {
    showError(t('web.file-hosting.empty'))
    return
  }
  reviewFileId.value = id
  showReview.value = true
}

async function handleLockCollection(payload: { hint: string | null; billingMode: string | null }): Promise<void> {
  if (!collectionFolder.value || lockingCollection.value) return
  lockingCollection.value = true
  try {
    await ms.lockCollection(collectionFolder.value.id, payload.hint, payload.billingMode)
    showSuccess(t('web.file-hosting.collection_locked'))
    showCollectionModal.value = false
    await loadAll()
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.file-hosting.lock_collection_failed'))
  } finally {
    lockingCollection.value = false
  }
}

async function handleAnalyzeCollection(): Promise<void> {
  const folder = browse.value?.folder
  if (!folder || analyzingCollection.value) return
  analyzingCollection.value = true
  try {
    await ms.analyzeCollection(folder.id)
    showSuccess(t('web.file-hosting.microstock.status_processing'))
    await loadAll()
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.file-hosting.operation_failed'))
  } finally {
    analyzingCollection.value = false
  }
}

async function handleExportCollection(): Promise<void> {
  const folder = browse.value?.folder
  if (!folder || exportingCollection.value) return
  exportingCollection.value = true
  try {
    await ms.exportCollection(folder.id)
    showSuccess(t('web.file-hosting.microstock.status_exported'))
    await loadAll()
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.file-hosting.operation_failed'))
  } finally {
    exportingCollection.value = false
  }
}

async function handleDownloadCsv(): Promise<void> {
  const folder = browse.value?.folder
  if (!folder) return
  try {
    await ms.downloadCollectionCsv(folder.id)
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.file-hosting.operation_failed'))
  }
}

async function handleCreateMicrostock(): Promise<void> {
  if (creatingMs.value) return
  creatingMs.value = true
  try {
    const ws = await ms.createWorkspace(createMsName.value.trim() || null)
    showSuccess(t('web.file-hosting.workspace_created', { name: ws.name }))
    showCreateMs.value = false
    createMsName.value = ''
    await loadWorkspaces()
    await loadSlots()
    switchWorkspace(ws.id)
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.file-hosting.failed_create_workspace'))
  } finally {
    creatingMs.value = false
  }
}

const fhRealtimeHandlers = {
  onListingChanged: () => loadBrowse({ keepSelection: true }),
  onQuotaChanged: () => loadQuota(),
  onCollectionAnalysisProgress: () => {
    loadBrowse({ keepSelection: true })
    loadCollectionStatus()
  },
  onAssetMetadataProgress: () => loadBrowse({ keepSelection: true }),
}

let fhPollTimer: ReturnType<typeof setInterval> | null = null
const FH_POLL_INTERVAL_MS = 30_000

function startFhPolling(): void {
  if (fhPollTimer) return
  fhPollTimer = setInterval(() => {
    if (document.visibilityState !== 'visible') return
    if (echoConnected.value) {
      stopFhPolling()
      return
    }
    loadAll()
  }, FH_POLL_INTERVAL_MS)
}

function stopFhPolling(): void {
  if (fhPollTimer) {
    clearInterval(fhPollTimer)
    fhPollTimer = null
  }
}

function closeCtx(): void {
  contextMenu.value = null
}

function onEsc(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    clearSelection()
    contextMenu.value = null
    searchOpen.value = false
  }
}

onMounted(() => {
  subscribeFhRealtime(fhRealtimeHandlers)
  if (!echoConnected.value) startFhPolling()
  document.addEventListener('click', closeCtx)
  document.addEventListener('keydown', onEsc)
})

onUnmounted(() => {
  unsubscribeFhRealtime(fhRealtimeHandlers)
  stopFhPolling()
  document.removeEventListener('click', closeCtx)
  document.removeEventListener('keydown', onEsc)
  if (searchTimer) clearTimeout(searchTimer)
})

watch(
  () => `${String(route.params.folderId ?? '')}|${String(route.query.workspace_id ?? '')}|${String(route.query.user_id ?? '')}`,
  () => {
    loadAll()
  },
  { immediate: true },
)

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
      searchResults.value = await fh.searchFiles(trimmed, ctxParams())
    } catch {
      searchResults.value = []
    }
    searchOpen.value = true
  }, 250)
})
</script>

<template>
  <div
    class="fh-manager"
    data-file-manager
    data-fh-spa
    :class="{ 'is-fh-loading': loading, 'is-fh-busy': isBusy }"
  >
    <div v-if="isBusy" class="fh-busy-overlay" data-fh-busy-overlay>
      <div class="fh-busy-overlay__inner" role="status">
        <div class="spinner-border spinner-border-sm"></div>
      </div>
    </div>

    <div class="fh-toolbar">
      <div class="fh-toolbar__search">
        <i class="bi bi-search fh-toolbar__search-icon"></i>
        <input
          v-model="searchQ"
          type="text"
          class="form-control form-control-sm fh-toolbar__search-input"
          :placeholder="t('web.file-hosting.search_placeholder')"
          autocomplete="off"
          @focus="searchOpen = searchResults.length > 0"
        />
        <div class="fh-toolbar__search-results" :class="{ 'is-open': searchOpen }">
          <a
            v-for="r in searchResults"
            :key="r.id"
            class="fh-search-result"
            :href="fileHref(r.id)"
            @click.prevent="openFile(r); searchOpen = false"
          >
            <FhIcon :mime="r.mime" />
            <div class="fh-search-result__name">{{ r.name }}</div>
            <span class="fh-search-result__meta">{{ r.size_human || '' }}</span>
          </a>
          <div v-if="!searchResults.length && searchQ.trim()" class="fh-search-result__empty">
            {{ t('web.file-hosting.search_no_results') }}
          </div>
        </div>
      </div>
      <div class="fh-toolbar__view-toggle btn-group btn-group-sm" role="group" :aria-label="t('web.file-hosting.view_toggle')">
        <button
          type="button"
          class="fh-toolbar__view-btn btn btn-outline-secondary"
          :class="{ 'is-active': viewMode === 'table' }"
          :title="t('web.file-hosting.view_list')"
          @click="setViewMode('table')"
        >
          <i class="bi bi-list"></i>
        </button>
        <button
          type="button"
          class="fh-toolbar__view-btn btn btn-outline-secondary"
          :class="{ 'is-active': viewMode === 'grid' }"
          :title="t('web.file-hosting.view_grid')"
          @click="setViewMode('grid')"
        >
          <i class="bi bi-grid"></i>
        </button>
      </div>
      <router-link
        class="btn btn-outline-secondary btn-sm"
        :to="{ name: 'file-hosting.trash.view', query: route.query }"
      >
        <i class="bi bi-trash3 me-1"></i>{{ t('web.file-hosting.trash') }}
      </router-link>
      <router-link
        v-if="isMicrostock"
        class="btn btn-outline-secondary btn-sm"
        :to="{ name: 'file-hosting.microstock-usage.view', query: route.query }"
      >
        <i class="bi bi-wallet2 me-1"></i>{{ t('web.services.microstock.usage_balance') }}
      </router-link>
      <button v-if="canCreateFolder" type="button" class="btn btn-primary btn-sm" @click="openModal('folder')">
        <i class="bi bi-folder-plus me-1"></i>{{ t('web.file-hosting.new_folder') }}
      </button>
      <button
        v-if="showLockBtn && browse?.folder"
        type="button"
        class="btn btn-outline-primary btn-sm"
        @click="openCollectionModal(browse.folder)"
      >
        <i class="bi bi-lock me-1"></i>{{ t('web.file-hosting.microstock.lock_describe') }}
      </button>
      <button
        v-if="showAnalyzeBtn"
        type="button"
        class="btn btn-outline-primary btn-sm"
        :disabled="analyzingCollection"
        @click="handleAnalyzeCollection"
      >
        <span v-if="analyzingCollection" class="spinner-border spinner-border-sm me-1"></span>
        <i v-else class="bi bi-stars me-1"></i>{{ t('web.file-hosting.microstock.analyze') }}
      </button>
      <button
        v-if="showReviewBtn"
        type="button"
        class="btn btn-outline-secondary btn-sm"
        @click="openReview()"
      >
        <i class="bi bi-pencil-square me-1"></i>{{ t('web.file-hosting.microstock.review') }}
      </button>
      <button
        v-if="showExportBtn"
        type="button"
        class="btn btn-outline-secondary btn-sm"
        :disabled="exportingCollection"
        @click="handleExportCollection"
      >
        <span v-if="exportingCollection" class="spinner-border spinner-border-sm me-1"></span>
        <i v-else class="bi bi-file-earmark-spreadsheet me-1"></i>{{ t('web.file-hosting.microstock.export_csv') }}
      </button>
      <button
        v-if="showDownloadBtn"
        type="button"
        class="btn btn-outline-secondary btn-sm"
        @click="handleDownloadCsv"
      >
        <i class="bi bi-download me-1"></i>{{ t('web.file-hosting.microstock.download_csv') }}
      </button>
      <div class="dropdown fh-workspace-switcher">
        <button class="btn btn-outline-secondary btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown">
          <i class="bi me-1" :class="route.query.workspace_id ? 'bi-people' : 'bi-person'"></i>
          <span>{{ rootLabel }}</span>
        </button>
        <div class="dropdown-menu dropdown-menu-end shadow">
          <button class="dropdown-item" :class="{ active: !route.query.workspace_id }" type="button" @click="switchWorkspace(null)">
            <i class="bi bi-person me-2"></i>{{ t('web.file-hosting.personal') }}
          </button>
          <button
            v-for="ws in workspaces"
            :key="ws.id"
            class="dropdown-item"
            :class="{ active: route.query.workspace_id === ws.id }"
            type="button"
            @click="switchWorkspace(ws.id)"
          >
            <i class="bi me-2" :class="ws.kind === 'microstock' ? 'bi-stars' : 'bi-people'"></i>{{ ws.name }}
          </button>
          <div class="dropdown-divider"></div>
          <div v-if="quota" class="px-3 py-1 small text-muted">
            {{ t('web.file-hosting.collab.slots_counter', { used: quota.owned_workspace_used, limit: quota.owned_workspace_limit }) }}
          </div>
          <router-link
            v-if="quota?.can_create_workspace"
            class="dropdown-item"
            :to="{ name: 'file-hosting.workspaces.view' }"
          >
            <i class="bi bi-plus-lg me-2"></i>{{ t('web.file-hosting.collab.create_workspace') }}
          </router-link>
          <template v-else-if="quota && !quota.can_create_workspace">
            <span class="dropdown-item disabled text-muted small">
              <i class="bi bi-lock me-2"></i>{{ t('web.file-hosting.collab.slots_full') }}
            </span>
            <router-link class="dropdown-item small" :to="{ name: 'services.index.view' }">
              <i class="bi bi-stars me-2"></i>{{ t('web.file-hosting.collab.buy_slot_cta') }}
            </router-link>
          </template>
          <template v-if="slots">
            <div class="px-3 py-1 small text-muted">
              {{ t('web.file-hosting.microstock.slots_counter', { used: slots.used, limit: slots.limit }) }}
            </div>
            <button
              v-if="slots.can_create"
              class="dropdown-item"
              type="button"
              @click="showCreateMs = true"
            >
              <i class="bi bi-images me-2"></i>{{ t('web.file-hosting.microstock.create_workspace') }}
            </button>
            <template v-else-if="slots.activated">
              <span class="dropdown-item disabled text-muted small">
                <i class="bi bi-lock me-2"></i>{{ t('web.file-hosting.microstock.slots_full') }}
              </span>
              <router-link class="dropdown-item small" :to="{ name: 'services.index.view' }">
                <i class="bi bi-stars me-2"></i>{{ t('web.file-hosting.microstock.buy_slot_cta') }}
              </router-link>
            </template>
            <router-link
              v-else
              class="dropdown-item small"
              :to="{ name: 'services.index.view' }"
            >
              <i class="bi bi-stars me-2"></i>{{ t('web.file-hosting.microstock.activate_cta') }}
            </router-link>
          </template>
          <div class="dropdown-divider"></div>
          <router-link class="dropdown-item" :to="{ name: 'file-hosting.workspaces.view' }">
            <i class="bi bi-gear me-2"></i>{{ t('web.file-hosting.manage_workspaces') }}
          </router-link>
        </div>
      </div>
    </div>

    <nav class="fh-breadcrumb" data-fh-breadcrumb aria-label="breadcrumb">
      <template v-if="!crumbs.length">
        <span class="fh-breadcrumb__item is-active">
          <i class="bi bi-folder2-open fh-breadcrumb__root-icon me-1"></i>{{ rootLabel }}
        </span>
      </template>
      <template v-else>
        <a
          class="fh-breadcrumb__item"
          :class="{ 'is-drop-target': drag.isDropTarget('root') }"
          :href="folderHref(null)"
          @click.prevent="navigateToRoot"
          @dragover="drag.onDropOver($event, 'root')"
          @dragleave="drag.onDropLeave($event, 'root')"
          @drop="drag.onDrop($event, 'root')"
        >
          <i class="bi bi-folder2-open fh-breadcrumb__root-icon me-1"></i>{{ rootLabel }}
        </a>
        <template v-for="(crumb, i) in crumbs" :key="crumb.id">
          <i class="bi bi-chevron-right fh-breadcrumb__sep"></i>
          <span v-if="i === crumbs.length - 1" class="fh-breadcrumb__item is-active">{{ crumb.name }}</span>
          <a
            v-else
            class="fh-breadcrumb__item"
            :class="{ 'is-drop-target': drag.isDropTarget(crumb.id) }"
            :href="folderHref(crumb.id)"
            @click.prevent="navigateToFolder(crumb.id)"
            @dragover="drag.onDropOver($event, crumb.id)"
            @dragleave="drag.onDropLeave($event, crumb.id)"
            @drop="drag.onDrop($event, crumb.id)"
          >{{ crumb.name }}</a>
        </template>
      </template>
    </nav>

    <div v-if="quota" data-fh-quota>
      <div class="fh-quota">
        <div class="fh-quota__header">
          <span class="fh-quota__label">{{ t('web.file-hosting.quota_used') }}</span>
          <span class="fh-quota__value">
            {{ quota.used_bytes_human || '0 B' }} /
            {{ Number(quota.quota_bytes) > 0 ? (quota.quota_bytes_human || '0 B') : t('web.file-hosting.quota_unlimited') }}
          </span>
        </div>
        <div class="fh-quota__track">
          <div
          class="fh-quota__fill"
          :class="{ 'is-warn': quotaPct >= 75 && quotaPct < 90, 'is-danger': quotaPct >= 90 }"
          :style="{ width: (Number(quota.quota_bytes) > 0 ? quotaPct : 3) + '%' }"
        ></div>
        </div>
        <div v-if="collectionProgressText || collectionStatusHint" class="small text-muted mt-1">
          <span v-if="collectionStatusHint">{{ collectionStatusHint }}</span>
          <span v-if="collectionProgressText">{{ collectionStatusHint ? ' — ' : '' }}{{ collectionProgressText }}</span>
        </div>
      </div>
    </div>

    <FhDropzone
      v-if="canCreateFile"
      :folder-id="uploadCtx.folderId"
      :user-id="uploadCtx.userId"
      :workspace-id="uploadCtx.workspaceId"
      :collection-locked="collectionLocked"
      :require-folder="requireFolder"
      @uploaded="onFileUploaded"
      @refresh="loadAll"
    />

    <div v-show="selectedCount > 0" class="fh-bulk-bar">
      <span class="fh-bulk-bar__count"><strong>{{ selectedCount }}</strong> {{ t('web.file-hosting.bulk.selected') }}</span>
      <div class="fh-bulk-bar__actions">
        <button
          v-if="canEditFile || canEditFolder"
          type="button"
          class="btn btn-outline-primary btn-sm"
          @click="openModal('move', { keys: [...selected] })"
        >
          <i class="bi bi-folder-symlink me-1"></i>{{ t('web.file-hosting.bulk.move') }}
        </button>
        <button
          v-if="canEditFile || canEditFolder"
          type="button"
          class="btn btn-outline-success btn-sm"
          @click="handleBulkVisibility(VIS_LINK)"
        >
          <i class="bi bi-share me-1"></i>{{ t('web.file-hosting.bulk.share') }}
        </button>
        <button
          v-if="canEditFile || canEditFolder"
          type="button"
          class="btn btn-outline-secondary btn-sm"
          @click="handleBulkVisibility('private')"
        >
          <i class="bi bi-shield-lock me-1"></i>{{ t('web.file-hosting.bulk.unshare') }}
        </button>
        <button
          v-if="canDeleteFile || canDeleteFolder"
          type="button"
          class="btn btn-outline-danger btn-sm"
          @click="handleBulkDelete"
        >
          <i class="bi bi-trash me-1"></i>{{ t('web.file-hosting.bulk.delete') }}
        </button>
      </div>
    </div>

    <div data-fh-panel="browse">
      <div v-show="viewMode === 'table'" class="table-responsive">
        <table class="table fh-table">
          <thead>
            <tr>
              <th class="fh-table__select-cell">
                <input
                  type="checkbox"
                  class="form-check-input"
                  :checked="allSelected"
                  @change="selectAllKeys(allKeys, ($event.target as HTMLInputElement).checked)"
                />
              </th>
              <th class="fh-table__icon-cell"></th>
              <th>{{ t('web.file-hosting.columns.name') }}</th>
              <th>{{ t('web.file-hosting.columns.type') }}</th>
              <th>{{ t('web.file-hosting.columns.size') }}</th>
              <th>{{ t('web.file-hosting.columns.visibility') }}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-if="parentMeta"
              class="fh-parent-row"
              data-fh-row
              data-fh-entity="parent"
              :class="{ 'is-drop-target': drag.isDropTarget(parentMeta.id || 'root') }"
              @dragover="drag.onDropOver($event, parentMeta.id || 'root')"
              @dragleave="drag.onDropLeave($event, parentMeta.id || 'root')"
              @drop="drag.onDrop($event, parentMeta.id || 'root')"
            >
              <td class="fh-table__select-cell"></td>
              <td class="fh-table__icon-cell">
                <a :href="parentMeta.href" draggable="false" @click.prevent="parentMeta.id ? navigateToFolder(parentMeta.id) : navigateToRoot()">
                  <i class="bi bi-folder2 fh-parent-row__icon"></i>
                </a>
              </td>
              <td>
                <a class="fh-table__name" :href="parentMeta.href" draggable="false" @click.prevent="parentMeta.id ? navigateToFolder(parentMeta.id) : navigateToRoot()">
                  <span class="fh-table__name-text">...</span>
                </a>
              </td>
              <td class="fh-table__type text-muted">{{ t('web.file-hosting.parent') }}</td>
              <td class="fh-table__size">—</td>
              <td></td>
              <td></td>
            </tr>
            <tr
              v-for="folder in folders"
              :key="'f:' + folder.id"
              data-fh-row
              data-fh-entity="folder"
              :data-fh-id="folder.id"
              draggable="true"
              :class="{
                'is-dragging-source': drag.isDraggingSource('folder', folder.id),
                'is-drop-target': drag.isDropTarget(folder.id),
                'is-selected': selected.has('folder:' + folder.id),
              }"
              @click="onBrowseSelect($event, 'folder', folder)"
              @dblclick="onBrowseOpen($event, 'folder', folder)"
              @contextmenu="onContext($event, 'folder', folder)"
              @dragstart="drag.onRowDragStart($event, 'folder', folder.id)"
              @dragend="drag.onDragEnd"
              @dragover="drag.onDropOver($event, folder.id)"
              @dragleave="drag.onDropLeave($event, folder.id)"
              @drop="drag.onDrop($event, folder.id)"
            >
              <td class="fh-table__select-cell">
                <input
                  type="checkbox"
                  class="form-check-input"
                  :checked="selected.has('folder:' + folder.id)"
                  @click.stop
                  @change="toggleSelect('folder:' + folder.id, ($event.target as HTMLInputElement).checked)"
                />
              </td>
              <td class="fh-table__icon-cell">
                <a :href="folderHref(folder.id)" draggable="false" @click="onBrowseSelect($event, 'folder', folder)" @dblclick="onBrowseOpen($event, 'folder', folder)">
                  <FhIcon is-folder />
                </a>
              </td>
              <td>
                <a class="fh-table__name" :href="folderHref(folder.id)" draggable="false" @click="onBrowseSelect($event, 'folder', folder)" @dblclick="onBrowseOpen($event, 'folder', folder)">
                  <span class="fh-table__name-text">{{ folder.name }}</span>
                </a>
              </td>
              <td class="fh-table__type">{{ t('web.file-hosting.type_folder') }}</td>
              <td class="fh-table__size">—</td>
              <td>
                <span class="fh-badge" :class="visBadgeClass(folder.visibility)">{{ visLabel(folder.visibility) }}</span>
              </td>
              <td class="fh-table__actions">
                <div class="fh-action-group">
                  <button
                    v-if="canLockCollection(folder)"
                    type="button"
                    class="fh-table__action-btn"
                    :title="t('web.file-hosting.microstock.lock_describe')"
                    @click="openCollectionModal(folder)"
                  ><i class="bi bi-lock-fill"></i></button>
                  <button v-if="canEdit('folder')" type="button" class="fh-table__action-btn" @click="openModal('rename', { entity: 'folder', id: folder.id, name: folder.name })"><i class="bi bi-pencil"></i></button>
                  <button v-if="canEdit('folder')" type="button" class="fh-table__action-btn" @click="openModal('move', { keys: ['folder:' + folder.id] })"><i class="bi bi-folder-symlink"></i></button>
                  <button v-if="canEdit('folder')" type="button" class="fh-table__action-btn" @click="openShare('folder', folder)"><i class="bi bi-share"></i></button>
                  <button v-if="canDelete('folder')" type="button" class="fh-table__action-btn is-danger" @click="openDelete('folder', folder.id)"><i class="bi bi-trash"></i></button>
                </div>
              </td>
            </tr>
            <tr
              v-for="file in files"
              :key="'file:' + file.id"
              data-fh-row
              data-fh-entity="file"
              :data-fh-id="file.id"
              draggable="true"
              :class="{
                'is-dragging-source': drag.isDraggingSource('file', file.id),
                'is-selected': selected.has('file:' + file.id),
              }"
              @click="onBrowseSelect($event, 'file', file)"
              @dblclick="onBrowseOpen($event, 'file', file)"
              @contextmenu="onContext($event, 'file', file)"
              @dragstart="drag.onRowDragStart($event, 'file', file.id)"
              @dragend="drag.onDragEnd"
            >
              <td class="fh-table__select-cell">
                <input
                  type="checkbox"
                  class="form-check-input"
                  :checked="selected.has('file:' + file.id)"
                  @click.stop
                  @change="toggleSelect('file:' + file.id, ($event.target as HTMLInputElement).checked)"
                />
              </td>
              <td class="fh-table__icon-cell">
                <a :href="fileHref(file.id)" draggable="false" @click="onBrowseSelect($event, 'file', file)" @dblclick="onBrowseOpen($event, 'file', file)">
                  <FhIcon :mime="file.mime" />
                </a>
              </td>
              <td>
                <a class="fh-table__name" :href="fileHref(file.id)" :title="file.name" draggable="false" @click="onBrowseSelect($event, 'file', file)" @dblclick="onBrowseOpen($event, 'file', file)">
                  <span class="fh-table__name-text">{{ file.name }}</span>
                </a>
                <span v-if="isMicrostock" class="badge fh-ms-badge ms-1" :class="msBadge(file).cls">{{ msBadge(file).label }}</span>
                <span v-if="file.is_hash_blocked" class="badge text-bg-danger ms-1">{{ t('web.file-hosting.blocked_badge') }}</span>
              </td>
              <td class="fh-table__type">{{ file.mime || t('web.file-hosting.type_file') }}</td>
              <td class="fh-table__size">{{ file.size_human || '—' }}</td>
              <td>
                <span class="fh-badge" :class="visBadgeClass(file.visibility)">{{ visLabel(file.visibility) }}</span>
              </td>
              <td class="fh-table__actions">
                <div class="fh-action-group">
                  <a class="fh-table__action-btn" :href="fileHref(file.id)" draggable="false" @click.prevent="openItem('file', file)"><i class="bi bi-eye"></i></a>
                  <button v-if="canEdit('file')" type="button" class="fh-table__action-btn" @click="openModal('rename', { entity: 'file', id: file.id, name: file.name })"><i class="bi bi-pencil"></i></button>
                  <button v-if="canEdit('file')" type="button" class="fh-table__action-btn" @click="openModal('move', { keys: ['file:' + file.id] })"><i class="bi bi-folder-symlink"></i></button>
                  <button v-if="canEdit('file')" type="button" class="fh-table__action-btn" @click="openShare('file', file)"><i class="bi bi-share"></i></button>
                  <button v-if="canDelete('file')" type="button" class="fh-table__action-btn is-danger" @click="openDelete('file', file.id)"><i class="bi bi-trash"></i></button>
                </div>
              </td>
            </tr>
            <tr v-if="isEmpty && !parentMeta">
              <td colspan="7">
                <div class="fh-empty">
                  <i class="bi bi-folder2-open fh-empty__icon"></i>
                  <div class="fh-empty__text">{{ t('web.file-hosting.empty') }}</div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-show="viewMode === 'grid'" class="fh-grid">
        <div
          v-if="parentMeta"
          class="fh-file-card is-parent"
          data-fh-row
          data-fh-entity="parent"
          :class="{ 'is-drop-target': drag.isDropTarget(parentMeta.id || 'root') }"
          @dragover="drag.onDropOver($event, parentMeta.id || 'root')"
          @dragleave="drag.onDropLeave($event, parentMeta.id || 'root')"
          @drop="drag.onDrop($event, parentMeta.id || 'root')"
        >
          <div class="fh-file-card__icon">
            <a :href="parentMeta.href" draggable="false" @click.prevent="parentMeta.id ? navigateToFolder(parentMeta.id) : navigateToRoot()">
              <i class="bi bi-folder2 fh-parent-row__icon"></i>
            </a>
          </div>
          <a class="fh-file-card__name" :href="parentMeta.href" draggable="false" @click.prevent="parentMeta.id ? navigateToFolder(parentMeta.id) : navigateToRoot()">...</a>
          <div class="fh-file-card__meta">{{ t('web.file-hosting.parent') }}</div>
        </div>
        <div
          v-for="folder in folders"
          :key="'gf:' + folder.id"
          class="fh-file-card"
          data-fh-row
          data-fh-entity="folder"
          :data-fh-id="folder.id"
          draggable="true"
          :class="{
            'is-dragging-source': drag.isDraggingSource('folder', folder.id),
            'is-drop-target': drag.isDropTarget(folder.id),
            'is-selected': selected.has('folder:' + folder.id),
          }"
          @click="onBrowseSelect($event, 'folder', folder)"
          @dblclick="onBrowseOpen($event, 'folder', folder)"
          @contextmenu="onContext($event, 'folder', folder)"
          @dragstart="drag.onRowDragStart($event, 'folder', folder.id)"
          @dragend="drag.onDragEnd"
          @dragover="drag.onDropOver($event, folder.id)"
          @dragleave="drag.onDropLeave($event, folder.id)"
          @drop="drag.onDrop($event, folder.id)"
        >
          <input
            type="checkbox"
            class="form-check-input fh-file-card__select"
            :checked="selected.has('folder:' + folder.id)"
            @click.stop
            @change="toggleSelect('folder:' + folder.id, ($event.target as HTMLInputElement).checked)"
          />
          <div class="fh-file-card__icon">
            <a :href="folderHref(folder.id)" draggable="false" @click="onBrowseSelect($event, 'folder', folder)" @dblclick="onBrowseOpen($event, 'folder', folder)">
              <FhIcon is-folder />
            </a>
          </div>
          <a class="fh-file-card__name" :href="folderHref(folder.id)" draggable="false" @click="onBrowseSelect($event, 'folder', folder)" @dblclick="onBrowseOpen($event, 'folder', folder)">{{ folder.name }}</a>
          <div class="fh-file-card__meta">{{ t('web.file-hosting.type_folder') }}</div>
        </div>
        <div
          v-for="file in files"
          :key="'gfile:' + file.id"
          class="fh-file-card"
          data-fh-row
          data-fh-entity="file"
          :data-fh-id="file.id"
          draggable="true"
          :class="{
            'is-dragging-source': drag.isDraggingSource('file', file.id),
            'is-selected': selected.has('file:' + file.id),
          }"
          @click="onBrowseSelect($event, 'file', file)"
          @dblclick="onBrowseOpen($event, 'file', file)"
          @contextmenu="onContext($event, 'file', file)"
          @dragstart="drag.onRowDragStart($event, 'file', file.id)"
          @dragend="drag.onDragEnd"
        >
          <input
            type="checkbox"
            class="form-check-input fh-file-card__select"
            :checked="selected.has('file:' + file.id)"
            @click.stop
            @change="toggleSelect('file:' + file.id, ($event.target as HTMLInputElement).checked)"
          />
          <div class="fh-file-card__badge">
            <span v-if="isMicrostock" class="badge fh-ms-badge" :class="msBadge(file).cls">{{ msBadge(file).label }}</span>
          </div>
          <div class="fh-file-card__icon">
            <a :href="fileHref(file.id)" draggable="false" @click="onBrowseSelect($event, 'file', file)" @dblclick="onBrowseOpen($event, 'file', file)">
              <FhIcon :mime="file.mime" />
            </a>
          </div>
          <a class="fh-file-card__name" :href="fileHref(file.id)" draggable="false" @click="onBrowseSelect($event, 'file', file)" @dblclick="onBrowseOpen($event, 'file', file)">{{ file.name }}</a>
          <div class="fh-file-card__meta">{{ file.size_human || t('web.file-hosting.type_file') }}</div>
        </div>
        <div v-if="isEmpty && !parentMeta" class="fh-empty">
          <i class="bi bi-folder2-open fh-empty__icon"></i>
          <div class="fh-empty__text">{{ t('web.file-hosting.empty') }}</div>
        </div>
      </div>
    </div>

    <div
      v-if="contextMenu"
      class="fh-context-menu"
      role="menu"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      @click.stop
    >
      <button type="button" class="fh-context-menu__item" @click="ctxAction('open')"><i class="bi bi-folder2-open"></i>{{ t('web.file-hosting.open') }}</button>
      <button v-if="canEdit(contextMenu.entity)" type="button" class="fh-context-menu__item" @click="ctxAction('rename')"><i class="bi bi-pencil"></i>{{ t('web.file-hosting.rename') }}</button>
      <button v-if="canEdit(contextMenu.entity)" type="button" class="fh-context-menu__item" @click="ctxAction('move')"><i class="bi bi-folder-symlink"></i>{{ t('web.file-hosting.move') }}</button>
      <button v-if="canEdit(contextMenu.entity)" type="button" class="fh-context-menu__item" @click="ctxAction('share')"><i class="bi bi-share"></i>{{ t('web.file-hosting.share') }}</button>
      <button
        v-if="isMicrostock && contextMenu.entity === 'file'"
        type="button"
        class="fh-context-menu__item"
        @click="ctxAction('review')"
      >
        <i class="bi bi-stars"></i>{{ t('web.file-hosting.microstock.review') }}
      </button>
      <button v-if="canDelete(contextMenu.entity)" type="button" class="fh-context-menu__item is-danger" @click="ctxAction('delete')"><i class="bi bi-trash"></i>{{ t('web.file-hosting.delete') }}</button>
    </div>

    <div v-if="modal" class="modal fade show d-block" tabindex="-1" style="background:rgba(0,0,0,.4)" @click.self="modal = null">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <template v-if="modal.type === 'folder'">{{ t('web.file-hosting.new_folder') }}</template>
              <template v-else-if="modal.type === 'rename'">{{ t('web.file-hosting.rename') }}</template>
              <template v-else>{{ t('web.file-hosting.modal_move') }}</template>
            </h5>
            <button type="button" class="btn-close" @click="modal = null"></button>
          </div>
          <div class="modal-body">
            <div v-if="modal.type === 'folder' || modal.type === 'rename'">
              <label class="form-label">{{ t('web.file-hosting.name_label') }}</label>
              <input v-model="modal.name" type="text" class="form-control" autofocus @keyup.enter="submitModal" />
            </div>
            <div v-else-if="modal.type === 'move'">
              <label class="form-label">{{ t('web.file-hosting.target_folder_label') }}</label>
              <input v-model="modal.target" type="text" class="form-control mb-2" :placeholder="t('web.file-hosting.target_folder_placeholder')" />
              <div class="list-group list-group-flush">
                <button type="button" class="list-group-item list-group-item-action" @click="modal.target = ''">{{ t('web.file-hosting.root') }}</button>
                <button
                  v-for="f in moveTargets"
                  :key="'mv:' + f.id"
                  type="button"
                  class="list-group-item list-group-item-action"
                  @click="modal.target = f.id"
                >
                  <i class="bi bi-folder-fill me-1"></i>{{ f.name }}
                </button>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary btn-sm" @click="modal = null">{{ t('web.file-hosting.cancel') }}</button>
            <button type="button" class="btn btn-primary btn-sm" @click="submitModal">{{ t('web.file-hosting.save') }}</button>
          </div>
        </div>
      </div>
    </div>

    <FhShareModal
      v-model="showShare"
      v-model:visibility="shareVisibility"
      :share-url="shareUrl"
      @save="saveShare"
    />

    <ConfirmModal
      v-model="showDeleteConfirm"
      :title="t('web.file-hosting.modal_delete')"
      :confirm-label="t('web.file-hosting.delete')"
      confirm-variant="danger"
      @confirm="handleDelete"
      @cancel="deleteTarget = null"
    >
      <p>{{ t('web.file-hosting.confirm_delete_item') }}</p>
      <p class="text-muted small">{{ t('web.file-hosting.trash_hint') }}</p>
    </ConfirmModal>

    <FhCollectionDescribeModal
      v-model="showCollectionModal"
      :folder="collectionFolder"
      :file-count="files.length"
      :billing="billing"
      :locking="lockingCollection"
      @lock="handleLockCollection"
    />

    <FhMicrostockReviewModal
      v-model="showReview"
      v-model:file-id="reviewFileId"
      :file-ids="reviewFileIds"
      :download-ctx="ctxParams()"
      @saved="loadBrowse({ keepSelection: true })"
    />

    <Modal v-model="showCreateMs" :title="t('web.file-hosting.microstock.create_title')">
      <p class="small text-muted">{{ t('web.file-hosting.microstock.create_hint') }}</p>
      <label class="form-label" for="fh-ms-ws-name">{{ t('web.file-hosting.microstock.name_label') }}</label>
      <input
        id="fh-ms-ws-name"
        v-model="createMsName"
        type="text"
        class="form-control"
        maxlength="120"
        :placeholder="t('web.file-hosting.microstock.name_placeholder')"
        @keyup.enter="handleCreateMicrostock"
      />
      <template #footer>
        <button type="button" class="btn btn-outline-secondary" @click="showCreateMs = false">{{ t('web.file-hosting.cancel') }}</button>
        <button type="button" class="btn btn-primary" :disabled="creatingMs" @click="handleCreateMicrostock">
          <span v-if="creatingMs" class="spinner-border spinner-border-sm me-1"></span>
          {{ t('web.file-hosting.create') }}
        </button>
      </template>
    </Modal>
  </div>
</template>
