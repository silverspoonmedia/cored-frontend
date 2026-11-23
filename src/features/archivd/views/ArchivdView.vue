<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { confirmDialog } from '@/lib/swal'
import ErrorState from '@/components/ErrorState.vue'
import SkeletonBlock from '@/components/SkeletonBlock.vue'
import Modal from '@/components/Modal.vue'
import ArDropzone from '@/features/archivd/components/ArDropzone.vue'
import ArIcon from '@/features/archivd/components/ArIcon.vue'
import ArShareModal from '@/features/archivd/components/ArShareModal.vue'
import ArCollectionDescribeModal from '@/features/archivd/components/ArCollectionDescribeModal.vue'
import ArMicrostockReviewModal from '@/features/archivd/components/ArMicrostockReviewModal.vue'
import ArWorkspaceSwitcher from '@/features/archivd/components/ArWorkspaceSwitcher.vue'
import ArContextMenu, { type ContextMenuState } from '@/features/archivd/components/ArContextMenu.vue'
import ArNameMoveModal, { type ArNameMoveModal as ArNameMoveModalState } from '@/features/archivd/components/ArNameMoveModal.vue'
import { useArchivd } from '@/features/archivd/composables/useArchivd'
import { useArchivdBrowse } from '@/features/archivd/composables/useArchivdBrowse'
import { useMicrostock } from '@/features/microstock/composables/useMicrostock'
import { useMicrostockCredentials } from '@/features/microstock/composables/useMicrostockCredentials'
import { useArchivdRealtime } from '@/features/archivd/composables/useArchivdRealtime'
import { useEchoResync } from '@/composables/useEcho'
import { useAlert } from '@/composables/useAlert'
import { useArchivdDragMove } from '@/features/archivd/composables/useArchivdDragMove'
import { applyBrowseClick, listingKeys, idsByEntity } from '@/features/archivd/composables/useArchivdSelection'
import { resolveMicrostockBadge, formatCollectionProgress, type arMicrostockBadgeLabels } from '@/features/archivd/utils/arMicrostockBadge'
import { useAuth } from '@/stores/auth'
import type { HostedFile, ArFolder } from '../types'
import type {
  MicrostockCollectionStatusPayload,
  MicrostockCredential,
  MicrostockMarketplaceUpload,
} from '@/features/microstock/types'

const VIS_LINK = 'anyone_with_link'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const ar = useArchivd()
const ms = useMicrostock()
const credentials = useMicrostockCredentials()
const { hasPermission } = useAuth()
const { success: showSuccess, error: showError } = useAlert()
const { subscribe: subscribeArRealtime, unsubscribe: unsubscribeArRealtime, setWorkspaceChannel: setArWorkspaceChannel } = useArchivdRealtime()

// ---- Selection (owned here, shared with browse composable + drag-move) ----
const selected = ref<Set<string>>(new Set())
const selectionAnchor = ref<string | null>(null)

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

// ---- Browse/search/lifecycle state (extracted composable) ----
const {
  browse,
  quota,
  loading,
  browseError,
  workspaces,
  slots,
  billing,
  viewMode,
  searchQ,
  searchResults,
  searchOpen,
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
  setViewMode,
  ctxParams,
  loadBrowse,
  loadQuota,
  loadWorkspaces,
  loadSlots,
  loadAll,
} = useArchivdBrowse({ selected, clearSelection })

const isBusy = ref(false)
const allKeys = computed(() => listingKeys(folders.value, files.value))
const isEmpty = computed(() => folders.value.length === 0 && files.value.length === 0)
const selectedCount = computed(() => selected.value.size)
const allSelected = computed(() => allKeys.value.length > 0 && allKeys.value.every((k) => selected.value.has(k)))

const canCreateFile = computed(() => hasPermission('create archivd file'))
const canCreateFolder = computed(() => hasPermission('create archivd folder'))
const canEditFolder = computed(() => hasPermission('edit archivd folder'))
const canEditFile = computed(() => hasPermission('edit archivd file'))
const canDeleteFolder = computed(() => hasPermission('delete archivd folder'))
const canDeleteFile = computed(() => hasPermission('delete archivd file'))

function canEdit(entity: 'folder' | 'file'): boolean {
  return entity === 'folder' ? canEditFolder.value : canEditFile.value
}

function canDelete(entity: 'folder' | 'file'): boolean {
  return entity === 'folder' ? canDeleteFolder.value : canDeleteFile.value
}

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
// A marketplace upload is allowed from `review` (upload the finalized set without
// exporting the CSV) and from `exported`; the backend re-checks both.
const showUploadBtn = computed(() =>
  isMicrostock.value && ['review', 'exported'].includes(collectionStatus.value ?? ''),
)

function canLockCollection(folder: ArFolder): boolean {
  if (!folder.collection_status) return false
  if (folder.collection_locked) return false
  return folder.collection_status === 'draft' || folder.collection_status === 'failed'
}

const collectionStatusHint = computed(() => {
  const status = collectionStatus.value
  if (!isMicrostock.value || !status) return ''
  if (status === 'locked') return t('web.archivd.microstock.status_locked')
  if (status === 'processing') {
    const extra = collectionStatusPayload.value?.billing_tier === 'free'
      ? ` ${t('web.archivd.microstock.status_processing_free_tier')}`
      : ''
    return t('web.archivd.microstock.status_processing') + extra
  }
  if (status === 'review') return t('web.archivd.microstock.status_review')
  if (status === 'exported') return t('web.archivd.microstock.status_exported')
  if (status === 'failed') return t('web.archivd.microstock.status_failed')
  return ''
})

const rootLabel = computed(() => {
  if (route.query.workspace_id) {
    return browse.value?.workspace?.name
      ?? workspaces.value.find((w) => w.id === route.query.workspace_id)?.name
      ?? t('web.archivd.workspace_team')
  }
  return t('web.archivd.personal')
})

const badgeLabels = computed<arMicrostockBadgeLabels>(() => ({
  noMetadata: t('web.archivd.microstock.no_metadata'),
  statusPending: t('web.archivd.microstock.status_pending'),
  statusGenerated: t('web.archivd.microstock.status_generated'),
  statusFinalized: t('web.archivd.microstock.status_finalized'),
  statusFailed: t('web.archivd.microstock.status_failed_item'),
  stageVision: t('web.archivd.microstock.stage_vision'),
  stageThinking: t('web.archivd.microstock.stage_thinking'),
  stageQueuedThinking: t('web.archivd.microstock.stage_queued_thinking'),
  stageDegraded: t('web.archivd.microstock.stage_degraded'),
}))

function msBadge(file: HostedFile) {
  return resolveMicrostockBadge(file.microstock, badgeLabels.value)
}

const moveTargets = computed(() => {
  const keys = modal.value?.type === 'move' ? modal.value.keys : []
  return folders.value.filter((f) => !keys.includes(`folder:${f.id}`))
})

// ---- Navigation helpers ----
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
    return router.resolve({ name: 'archivd.index.view', query: route.query }).href
  }
  return router.resolve({
    name: 'archivd.index.folder',
    params: { folderId },
    query: route.query,
  }).href
}

function fileHref(id: string): string {
  return router.resolve({
    name: 'archivd.show.view',
    params: { id },
    query: route.query,
  }).href
}

function switchWorkspace(id: string | null): void {
  const query: Record<string, string> = {}
  if (id) query.workspace_id = id
  const uid = route.query.user_id
  if (typeof uid === 'string' && uid) query.user_id = uid
  router.push({ name: 'archivd.index.view', query })
}

function navigateToFolder(folderId: string): void {
  router.push({
    name: 'archivd.index.folder',
    params: { folderId },
    query: keepQuery(),
  })
}

function navigateToRoot(): void {
  router.push({ name: 'archivd.index.view', query: keepQuery() })
}

function openFile(file: HostedFile): void {
  router.push({
    name: 'archivd.show.view',
    params: { id: file.id },
    query: keepQuery(),
  })
}

function openItem(entity: 'folder' | 'file', item: { id: string }): void {
  if (entity === 'folder') navigateToFolder(item.id)
  else openFile(item as HostedFile)
}

// ---- Selection interactions ----
function onBrowseSelect(e: MouseEvent, entity: 'folder' | 'file', item: { id: string }): void {
  const target = e.target
  if (target instanceof Element && target.closest('input, button, .ar-table__action-btn, .ar-action-group, a.ar-table__action-btn')) {
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

// ---- Context menu ----
const contextMenu = ref<ContextMenuState | null>(null)

function onContext(e: MouseEvent, entity: 'folder' | 'file', item: ArFolder | HostedFile): void {
  e.preventDefault()
  const key = `${entity}:${item.id}`
  if (!selected.value.has(key)) {
    clearSelection()
    toggleSelect(key, true)
    selectionAnchor.value = key
  }
  contextMenu.value = { x: e.clientX, y: e.clientY, entity, item }
}

function closeCtx(): void {
  contextMenu.value = null
}

// ---- Modals ----
const modal = ref<ArNameMoveModalState | null>(null)
const showShare = ref(false)
const shareVisibility = ref('private')
const shareUrl = ref<string | null>(null)
const shareTarget = ref<{ entity: 'folder' | 'file'; id: string } | null>(null)
const deleteTarget = ref<{ type: 'folder' | 'file'; id: string } | null>(null)

function visLabel(v: string): string {
  if (v === VIS_LINK) return t('web.archivd.visibility.anyone_with_link')
  if (v === 'workspace') return t('web.archivd.workspace_team')
  return t('web.archivd.visibility.private')
}

function visBadgeClass(v: string): string {
  return v === VIS_LINK ? 'ar-badge--link' : 'ar-badge--private'
}

async function withBusy(fn: () => Promise<void>): Promise<boolean> {
  isBusy.value = true
  try {
    await fn()
    return true
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.archivd.operation_failed'))
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
      if (entity === 'folder') await ar.moveFolder(id, targetFolderId, ctxParams())
      else if (entity === 'file') await ar.moveFile(id, targetFolderId, ctxParams())
    }
    showSuccess(t('web.archivd.items_moved', { count: keys.length }))
    clearSelection()
    await loadAll()
  })
}

const drag = useArchivdDragMove({
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
      await ar.createFolder(name, {
        parent_id: currentFolderId.value ?? undefined,
        user_id: typeof route.query.user_id === 'string' ? route.query.user_id : undefined,
        workspace_id: typeof route.query.workspace_id === 'string' ? route.query.workspace_id : undefined,
      })
      showSuccess(t('web.archivd.folder_created'))
      await loadAll()
    })
  } else if (m.type === 'rename') {
    const name = m.name.trim()
    if (!name) return
    ok = await withBusy(async () => {
      if (m.entity === 'folder') await ar.renameFolder(m.id, name, ctxParams())
      else await ar.renameFile(m.id, name, ctxParams())
      showSuccess(t('web.archivd.renamed'))
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
      updated = await ar.setFolderVisibility(id, shareVisibility.value, ctxParams())
    } else {
      updated = await ar.setFileVisibility(id, shareVisibility.value, ctxParams())
    }
    shareUrl.value = updated.share_url
    if (shareVisibility.value === VIS_LINK && updated.share_url) {
      await navigator.clipboard.writeText(updated.share_url)
      showSuccess(t('web.archivd.share_url_copied'))
    } else {
      showSuccess(t('web.archivd.visibility_updated'))
    }
    await loadBrowse({ keepSelection: true })
  })
  if (ok) showShare.value = false
}

async function openDelete(entity: 'folder' | 'file', id: string): Promise<void> {
  contextMenu.value = null
  deleteTarget.value = { type: entity, id }
  const confirmed = await confirmDialog({
    title: t('web.archivd.modal_delete'),
    html: `<p>${t('web.archivd.confirm_delete_item')}</p><p class="text-muted small">${t('web.archivd.trash_hint')}</p>`,
    confirmText: t('web.archivd.delete'),
  })
  if (confirmed) await handleDelete()
  else deleteTarget.value = null
}

async function handleDelete(): Promise<void> {
  if (!deleteTarget.value) return
  const { type, id } = deleteTarget.value
  const ok = await withBusy(async () => {
    if (type === 'folder') await ar.deleteFolder(id, ctxParams())
    else await ar.deleteFile(id, ctxParams())
    showSuccess(t('web.archivd.deleted'))
    await loadAll()
  })
  if (ok) {
    deleteTarget.value = null
  }
}

async function handleBulkVisibility(visibility: string): Promise<void> {
  const ids = idsByEntity(selected.value)
  if (!ids.file.length && !ids.folder.length) return
  await withBusy(async () => {
    let total = 0
    if (ids.folder.length) total += await ar.bulkSetFolderVisibility(ids.folder, visibility, ctxParams())
    if (ids.file.length) total += await ar.bulkSetFileVisibility(ids.file, visibility, ctxParams())
    showSuccess(t('web.archivd.items_updated', { count: total }))
    clearSelection()
    await loadAll()
  })
}

async function handleBulkDelete(): Promise<void> {
  const ids = idsByEntity(selected.value)
  if (!ids.file.length && !ids.folder.length) return
  await withBusy(async () => {
    let total = 0
    if (ids.folder.length) total += await ar.bulkDeleteFolders(ids.folder, ctxParams())
    if (ids.file.length) total += await ar.bulkDeleteFiles(ids.file, ctxParams())
    showSuccess(t('web.archivd.items_deleted', { count: total }))
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

// ---- Microstock collection actions ----
const showCollectionModal = ref(false)
const collectionFolder = ref<ArFolder | null>(null)
const lockingCollection = ref(false)
const analyzingCollection = ref(false)
const exportingCollection = ref(false)
const showReview = ref(false)
const reviewFileId = ref<string | null>(null)
const showCreateMs = ref(false)
const createMsName = ref('')
const creatingMs = ref(false)

// Marketplace upload: the picker is a credential list, the status is the latest
// attempt for the open collection (docs/domains/microstock/reference-marketplace-upload.md).
const uploadingCollection = ref(false)
const uploadPickerOpen = ref(false)
const uploadCredentials = ref<MicrostockCredential[]>([])
const uploadCredentialsLoaded = ref(false)
const uploadStatus = ref<MicrostockMarketplaceUpload | null>(null)

const uploadStatusLabel = computed(() => {
  const status = uploadStatus.value?.status
  return status ? t(`web.archivd.microstock.upload_status_${status}`) : ''
})

const uploadStatusClass = computed(() => {
  if (uploadStatus.value?.status === 'uploaded') return 'text-success'
  if (uploadStatus.value?.status === 'failed') return 'text-danger'
  return 'text-muted'
})

const reviewFileIds = computed(() => files.value.map((f) => f.id))

function openCollectionModal(folder: ArFolder): void {
  collectionFolder.value = folder
  showCollectionModal.value = true
}

function openReview(fileId?: string): void {
  const selectedFile = [...selected.value]
    .filter((k) => k.startsWith('file:'))
    .map((k) => k.slice(5))[0]
  const id = fileId ?? selectedFile ?? files.value[0]?.id ?? null
  if (!id) {
    showError(t('web.archivd.empty'))
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
    showSuccess(t('web.archivd.collection_locked'))
    showCollectionModal.value = false
    await loadAll()
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.archivd.lock_collection_failed'))
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
    showSuccess(t('web.archivd.microstock.status_processing'))
    await loadAll()
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.archivd.operation_failed'))
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
    showSuccess(t('web.archivd.microstock.status_exported'))
    await loadAll()
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.archivd.operation_failed'))
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
    showError(e instanceof Error ? e.message : t('web.archivd.operation_failed'))
  }
}

async function toggleUploadPicker(): Promise<void> {
  uploadPickerOpen.value = !uploadPickerOpen.value
  if (uploadPickerOpen.value && !uploadCredentialsLoaded.value) {
    uploadCredentials.value = await credentials.fetchList()
    uploadCredentialsLoaded.value = true
  }
}

async function handleUploadCollection(credential: MicrostockCredential): Promise<void> {
  const folder = browse.value?.folder
  if (!folder || uploadingCollection.value) return
  uploadPickerOpen.value = false
  uploadingCollection.value = true
  try {
    uploadStatus.value = await ms.uploadCollection(folder.id, credential.id)
    showSuccess(t('api.microstock.upload_queued'))
    await loadAll()
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.archivd.operation_failed'))
  } finally {
    uploadingCollection.value = false
  }
}

async function refreshUploadStatus(): Promise<void> {
  if (!isMicrostock.value || !currentFolderId.value
    || !['review', 'exported'].includes(collectionStatus.value ?? '')) {
    uploadStatus.value = null
    return
  }
  try {
    uploadStatus.value = await ms.fetchUploadStatus(currentFolderId.value)
  } catch {
    uploadStatus.value = null
  }
}

async function handleCreateMicrostock(): Promise<void> {
  if (creatingMs.value) return
  creatingMs.value = true
  try {
    const ws = await ms.createWorkspace(createMsName.value.trim() || null)
    showSuccess(t('web.archivd.workspace_created', { name: ws.name }))
    showCreateMs.value = false
    createMsName.value = ''
    await loadWorkspaces()
    await loadSlots()
    switchWorkspace(ws.id)
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.archivd.failed_create_workspace'))
  } finally {
    creatingMs.value = false
  }
}

// ---- Realtime + global listeners ----
const collectionStatusPayload = ref<MicrostockCollectionStatusPayload | null>(null)

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
    t('web.archivd.microstock.progress', { processed: payload.processed, total: payload.total }),
    t('web.archivd.microstock.progress_failed', { failed: payload.failed }),
  )
})

async function refreshCollectionStatus(): Promise<void> {
  if (!isMicrostock.value || !currentFolderId.value) {
    collectionStatusPayload.value = null
    return
  }
  try {
    collectionStatusPayload.value = await ms.fetchCollectionStatus(currentFolderId.value)
  } catch {
    collectionStatusPayload.value = null
  }
}

const ArRealtimeHandlers = {
  onListingChanged: () => loadBrowse({ keepSelection: true }),
  onQuotaChanged: () => { void loadQuota() },
  onCollectionAnalysisProgress: () => {
    loadBrowse({ keepSelection: true })
    void refreshCollectionStatus()
    void refreshUploadStatus()
  },
  onAssetMetadataProgress: () => loadBrowse({ keepSelection: true }),
  onMicrostockCredentialsChanged: () => {
    // A credential edited in another tab invalidates the cached picker list.
    uploadCredentialsLoaded.value = false
  },
}

function onEsc(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    clearSelection()
    contextMenu.value = null
    searchOpen.value = false
  }
}

// Socket-outage recovery: events missed while disconnected are gone, so
// re-pull the listing and quota once the connection is restored.
useEchoResync(() => {
  loadBrowse({ keepSelection: true })
  void loadQuota()
  void refreshCollectionStatus()
  void refreshUploadStatus()
})

// The upload status column only exists for a curated collection, so follow the
// status instead of polling: `loadAll()` (route change) re-reads the folder and
// this watch picks the new value up.
watch(
  () => `${currentFolderId.value ?? ''}|${collectionStatus.value ?? ''}`,
  () => { void refreshUploadStatus() },
  { immediate: true },
)

// Team uploads/mutations broadcast on archivd.workspace.{id}; join the
// active workspace channel and follow route changes between spaces.
watch(
  () => (typeof route.query.workspace_id === 'string' && route.query.workspace_id !== ''
    ? route.query.workspace_id
    : null),
  (workspaceId) => { setArWorkspaceChannel(workspaceId) },
  { immediate: true },
)

onMounted(() => {
  subscribeArRealtime(ArRealtimeHandlers)
  document.addEventListener('click', closeCtx)
  document.addEventListener('keydown', onEsc)
})

onUnmounted(() => {
  unsubscribeArRealtime(ArRealtimeHandlers)
  setArWorkspaceChannel(null)
  document.removeEventListener('click', closeCtx)
  document.removeEventListener('keydown', onEsc)
})
</script>

<template>
  <div
    class="ar-manager"
    data-file-manager
    data-ar-spa
    :class="{ 'is-ar-loading': loading, 'is-ar-busy': isBusy }"
  >
    <div v-if="isBusy" class="ar-busy-overlay" data-ar-busy-overlay>
      <div class="ar-busy-overlay__inner" role="status">
        <div class="spinner-border spinner-border-sm"></div>
      </div>
    </div>

    <div class="ar-toolbar">
      <div class="ar-toolbar__search">
        <i class="bi bi-search ar-toolbar__search-icon"></i>
        <input
          v-model="searchQ"
          type="text"
          class="form-control form-control-sm ar-toolbar__search-input"
          :placeholder="t('web.archivd.search_placeholder')"
          autocomplete="off"
          @focus="searchOpen = searchResults.length > 0"
        />
        <div class="ar-toolbar__search-results" :class="{ 'is-open': searchOpen }">
          <a
            v-for="r in searchResults"
            :key="r.id"
            class="ar-search-result"
            :href="fileHref(r.id)"
            @click.prevent="openFile(r); searchOpen = false"
          >
            <ArIcon :mime="r.mime" />
            <div class="ar-search-result__name">{{ r.name }}</div>
            <span class="ar-search-result__meta">{{ r.size_human || '' }}</span>
          </a>
          <div v-if="!searchResults.length && searchQ.trim()" class="ar-search-result__empty">
            {{ t('web.archivd.search_no_results') }}
          </div>
        </div>
      </div>
      <div class="ar-toolbar__view-toggle btn-group btn-group-sm" role="group" :aria-label="t('web.archivd.view_toggle')">
        <button
          type="button"
          class="ar-toolbar__view-btn btn btn-outline-secondary"
          :class="{ 'is-active': viewMode === 'table' }"
          :title="t('web.archivd.view_list')"
          @click="setViewMode('table')"
        >
          <i class="bi bi-list"></i>
        </button>
        <button
          type="button"
          class="ar-toolbar__view-btn btn btn-outline-secondary"
          :class="{ 'is-active': viewMode === 'grid' }"
          :title="t('web.archivd.view_grid')"
          @click="setViewMode('grid')"
        >
          <i class="bi bi-grid"></i>
        </button>
      </div>
      <router-link
        class="btn btn-outline-secondary btn-sm"
        :to="{ name: 'archivd.trash.view', query: route.query }"
      >
        <i class="bi bi-trash3 me-1"></i>{{ t('web.archivd.trash') }}
      </router-link>
      <router-link
        v-if="isMicrostock"
        class="btn btn-outline-secondary btn-sm"
        :to="{ name: 'archivd.microstock-usage.view', query: route.query }"
      >
        <i class="bi bi-wallet2 me-1"></i>{{ t('web.archivd.microstock.usage_balance') }}
      </router-link>
      <button v-if="canCreateFolder" type="button" class="btn btn-primary btn-sm" @click="openModal('folder')">
        <i class="bi bi-folder-plus me-1"></i>{{ t('web.archivd.new_folder') }}
      </button>
      <button
        v-if="showLockBtn && browse?.folder"
        type="button"
        class="btn btn-outline-primary btn-sm"
        @click="openCollectionModal(browse.folder)"
      >
        <i class="bi bi-lock me-1"></i>{{ t('web.archivd.microstock.lock_describe') }}
      </button>
      <button
        v-if="showAnalyzeBtn"
        type="button"
        class="btn btn-outline-primary btn-sm"
        :disabled="analyzingCollection"
        @click="handleAnalyzeCollection"
      >
        <span v-if="analyzingCollection" class="spinner-border spinner-border-sm me-1"></span>
        <i v-else class="bi bi-stars me-1"></i>{{ t('web.archivd.microstock.analyze') }}
      </button>
      <button
        v-if="showReviewBtn"
        type="button"
        class="btn btn-outline-secondary btn-sm"
        @click="openReview()"
      >
        <i class="bi bi-pencil-square me-1"></i>{{ t('web.archivd.microstock.review') }}
      </button>
      <button
        v-if="showExportBtn"
        type="button"
        class="btn btn-outline-secondary btn-sm"
        :disabled="exportingCollection"
        @click="handleExportCollection"
      >
        <span v-if="exportingCollection" class="spinner-border spinner-border-sm me-1"></span>
        <i v-else class="bi bi-file-earmark-spreadsheet me-1"></i>{{ t('web.archivd.microstock.export_csv') }}
      </button>
      <button
        v-if="showDownloadBtn"
        type="button"
        class="btn btn-outline-secondary btn-sm"
        @click="handleDownloadCsv"
      >
        <i class="bi bi-download me-1"></i>{{ t('web.archivd.microstock.download_csv') }}
      </button>
      <div v-if="showUploadBtn" class="dropdown d-inline-block">
        <button
          type="button"
          class="btn btn-outline-primary btn-sm"
          :disabled="uploadingCollection"
          data-ar-upload-marketplace
          @click="toggleUploadPicker"
        >
          <span v-if="uploadingCollection" class="spinner-border spinner-border-sm me-1"></span>
          <i v-else class="bi bi-cloud-upload me-1"></i>{{ t('web.archivd.microstock.upload_marketplace') }}
        </button>
        <ul v-if="uploadPickerOpen" class="dropdown-menu show" data-ar-upload-picker>
          <li v-if="!uploadCredentials.length" class="dropdown-item-text small text-muted">
            {{ t('web.archivd.microstock.upload_no_credentials') }}
          </li>
          <li v-for="credential in uploadCredentials" :key="credential.id">
            <button type="button" class="dropdown-item" @click="handleUploadCollection(credential)">
              {{ credential.label }}
              <span class="text-muted small">— {{ credential.marketplace }}</span>
              <span v-if="credential.status === 'failed'" class="badge bg-danger ms-1">
                {{ t('web.archivd.microstock.credential_status_failed') }}
              </span>
            </button>
          </li>
          <li>
            <router-link
              class="dropdown-item small text-muted"
              :to="{ name: 'archivd.microstock-credentials.view' }"
            >{{ t('web.archivd.microstock.upload_manage_credentials') }}</router-link>
          </li>
        </ul>
      </div>
      <ArWorkspaceSwitcher
        :active-workspace-id="typeof route.query.workspace_id === 'string' ? route.query.workspace_id : null"
        :root-label="rootLabel"
        :workspaces="workspaces"
        :quota="quota"
        :slots="slots"
        @switch="switchWorkspace"
        @create-microstock="showCreateMs = true"
      />
    </div>

    <nav class="ar-breadcrumb" data-ar-breadcrumb aria-label="breadcrumb">
      <template v-if="!crumbs.length">
        <span class="ar-breadcrumb__item is-active">
          <i class="bi bi-folder2-open ar-breadcrumb__root-icon me-1"></i>{{ rootLabel }}
        </span>
      </template>
      <template v-else>
        <a
          class="ar-breadcrumb__item"
          :class="{ 'is-drop-target': drag.isDropTarget('root') }"
          :href="folderHref(null)"
          @click.prevent="navigateToRoot"
          @dragover="drag.onDropOver($event, 'root')"
          @dragleave="drag.onDropLeave($event, 'root')"
          @drop="drag.onDrop($event, 'root')"
        >
          <i class="bi bi-folder2-open ar-breadcrumb__root-icon me-1"></i>{{ rootLabel }}
        </a>
        <template v-for="(crumb, i) in crumbs" :key="crumb.id">
          <i class="bi bi-chevron-right ar-breadcrumb__sep"></i>
          <span v-if="i === crumbs.length - 1" class="ar-breadcrumb__item is-active">{{ crumb.name }}</span>
          <a
            v-else
            class="ar-breadcrumb__item"
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

    <div v-if="quota" data-ar-quota>
      <div class="ar-quota">
        <div class="ar-quota__header">
          <span class="ar-quota__label">{{ t('web.archivd.quota_used') }}</span>
          <span class="ar-quota__value">
            {{ quota.used_bytes_human || '0 B' }} /
            {{ Number(quota.quota_bytes) > 0 ? (quota.quota_bytes_human || '0 B') : t('web.archivd.quota_unlimited') }}
          </span>
        </div>
        <div class="ar-quota__track">
          <div
          class="ar-quota__fill"
          :class="{ 'is-warn': quotaPct >= 75 && quotaPct < 90, 'is-danger': quotaPct >= 90 }"
          :style="{ width: (Number(quota.quota_bytes) > 0 ? quotaPct : 3) + '%' }"
        ></div>
        </div>
        <div v-if="collectionProgressText || collectionStatusHint || uploadStatusLabel" class="small text-muted mt-1">
          <span v-if="collectionStatusHint">{{ collectionStatusHint }}</span>
          <span v-if="collectionProgressText">{{ collectionStatusHint ? ' — ' : '' }}{{ collectionProgressText }}</span>
          <span v-if="uploadStatusLabel" :class="uploadStatusClass">
            {{ (collectionStatusHint || collectionProgressText) ? ' — ' : '' }}{{ uploadStatusLabel }}
          </span>
        </div>
      </div>
    </div>

    <ArDropzone
      v-if="canCreateFile"
      :folder-id="uploadCtx.folderId"
      :user-id="uploadCtx.userId"
      :workspace-id="uploadCtx.workspaceId"
      :collection-locked="collectionLocked"
      :require-folder="requireFolder"
      @uploaded="onFileUploaded"
      @refresh="loadAll"
    />

    <div v-show="selectedCount > 0" class="ar-bulk-bar">
      <span class="ar-bulk-bar__count"><strong>{{ selectedCount }}</strong> {{ t('web.archivd.bulk.selected') }}</span>
      <div class="ar-bulk-bar__actions">
        <button
          v-if="canEditFile || canEditFolder"
          type="button"
          class="btn btn-outline-primary btn-sm"
          @click="openModal('move', { keys: [...selected] })"
        >
          <i class="bi bi-folder-symlink me-1"></i>{{ t('web.archivd.bulk.move') }}
        </button>
        <button
          v-if="canEditFile || canEditFolder"
          type="button"
          class="btn btn-outline-success btn-sm"
          @click="handleBulkVisibility(VIS_LINK)"
        >
          <i class="bi bi-share me-1"></i>{{ t('web.archivd.bulk.share') }}
        </button>
        <button
          v-if="canEditFile || canEditFolder"
          type="button"
          class="btn btn-outline-secondary btn-sm"
          @click="handleBulkVisibility('private')"
        >
          <i class="bi bi-shield-lock me-1"></i>{{ t('web.archivd.bulk.unshare') }}
        </button>
        <button
          v-if="canDeleteFile || canDeleteFolder"
          type="button"
          class="btn btn-outline-danger btn-sm"
          @click="handleBulkDelete"
        >
          <i class="bi bi-trash me-1"></i>{{ t('web.archivd.bulk.delete') }}
        </button>
      </div>
    </div>

    <div v-if="loading && !browse" class="card">
      <div class="card-body">
        <div v-for="i in 6" :key="i" class="d-flex align-items-center gap-3 py-2 border-bottom">
          <SkeletonBlock variant="avatar" width="1.5rem" />
          <SkeletonBlock variant="line" :lines="1" width="45%" class="mb-0" />
          <SkeletonBlock variant="line" :lines="1" width="5rem" class="ms-auto mb-0" />
        </div>
      </div>
    </div>

    <ErrorState
      v-else-if="browseError && !browse"
      :message="browseError"
      @retry="loadAll"
    />

    <div v-else data-ar-panel="browse">
      <div v-show="viewMode === 'table'" class="table-responsive">
        <table class="table ar-table">
          <thead>
            <tr>
              <th class="ar-table__select-cell">
                <input
                  type="checkbox"
                  class="form-check-input"
                  :checked="allSelected"
                  @change="selectAllKeys(allKeys, ($event.target as HTMLInputElement).checked)"
                />
              </th>
              <th class="ar-table__icon-cell"></th>
              <th>{{ t('web.archivd.columns.name') }}</th>
              <th>{{ t('web.archivd.columns.type') }}</th>
              <th>{{ t('web.archivd.columns.size') }}</th>
              <th>{{ t('web.archivd.columns.visibility') }}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-if="parentMeta"
              class="ar-parent-row"
              data-ar-row
              data-ar-entity="parent"
              :class="{ 'is-drop-target': drag.isDropTarget(parentMeta.id || 'root') }"
              @dragover="drag.onDropOver($event, parentMeta.id || 'root')"
              @dragleave="drag.onDropLeave($event, parentMeta.id || 'root')"
              @drop="drag.onDrop($event, parentMeta.id || 'root')"
            >
              <td class="ar-table__select-cell"></td>
              <td class="ar-table__icon-cell">
                <a :href="folderHref(parentMeta.id)" draggable="false" @click.prevent="parentMeta.id ? navigateToFolder(parentMeta.id) : navigateToRoot()">
                  <i class="bi bi-folder2 ar-parent-row__icon"></i>
                </a>
              </td>
              <td>
                <a class="ar-table__name" :href="folderHref(parentMeta.id)" draggable="false" @click.prevent="parentMeta.id ? navigateToFolder(parentMeta.id) : navigateToRoot()">
                  <span class="ar-table__name-text">...</span>
                </a>
              </td>
              <td class="ar-table__type text-muted">{{ t('web.archivd.parent') }}</td>
              <td class="ar-table__size">—</td>
              <td></td>
              <td></td>
            </tr>
            <tr
              v-for="folder in folders"
              :key="'f:' + folder.id"
              data-ar-row
              data-ar-entity="folder"
              :data-ar-id="folder.id"
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
              <td class="ar-table__select-cell">
                <input
                  type="checkbox"
                  class="form-check-input"
                  :checked="selected.has('folder:' + folder.id)"
                  @click.stop
                  @change="toggleSelect('folder:' + folder.id, ($event.target as HTMLInputElement).checked)"
                />
              </td>
              <td class="ar-table__icon-cell">
                <a :href="folderHref(folder.id)" draggable="false" @click="onBrowseSelect($event, 'folder', folder)" @dblclick="onBrowseOpen($event, 'folder', folder)">
                  <ArIcon is-folder />
                </a>
              </td>
              <td>
                <a class="ar-table__name" :href="folderHref(folder.id)" draggable="false" @click="onBrowseSelect($event, 'folder', folder)" @dblclick="onBrowseOpen($event, 'folder', folder)">
                  <span class="ar-table__name-text">{{ folder.name }}</span>
                </a>
              </td>
              <td class="ar-table__type">{{ t('web.archivd.type_folder') }}</td>
              <td class="ar-table__size">—</td>
              <td>
                <span class="ar-badge" :class="visBadgeClass(folder.visibility)">{{ visLabel(folder.visibility) }}</span>
              </td>
              <td class="ar-table__actions">
                <div class="ar-action-group">
                  <button
                    v-if="canLockCollection(folder)"
                    type="button"
                    class="ar-table__action-btn"
                    :title="t('web.archivd.microstock.lock_describe')"
                    @click="openCollectionModal(folder)"
                  ><i class="bi bi-lock-fill"></i></button>
                  <button v-if="canEdit('folder')" type="button" class="ar-table__action-btn" @click="openModal('rename', { entity: 'folder', id: folder.id, name: folder.name })"><i class="bi bi-pencil"></i></button>
                  <button v-if="canEdit('folder')" type="button" class="ar-table__action-btn" @click="openModal('move', { keys: ['folder:' + folder.id] })"><i class="bi bi-folder-symlink"></i></button>
                  <button v-if="canEdit('folder')" type="button" class="ar-table__action-btn" @click="openShare('folder', folder)"><i class="bi bi-share"></i></button>
                  <button v-if="canDelete('folder')" type="button" class="ar-table__action-btn is-danger" @click="openDelete('folder', folder.id)"><i class="bi bi-trash"></i></button>
                </div>
              </td>
            </tr>
            <tr
              v-for="file in files"
              :key="'file:' + file.id"
              data-ar-row
              data-ar-entity="file"
              :data-ar-id="file.id"
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
              <td class="ar-table__select-cell">
                <input
                  type="checkbox"
                  class="form-check-input"
                  :checked="selected.has('file:' + file.id)"
                  @click.stop
                  @change="toggleSelect('file:' + file.id, ($event.target as HTMLInputElement).checked)"
                />
              </td>
              <td class="ar-table__icon-cell">
                <a :href="fileHref(file.id)" draggable="false" @click="onBrowseSelect($event, 'file', file)" @dblclick="onBrowseOpen($event, 'file', file)">
                  <ArIcon :mime="file.mime" />
                </a>
              </td>
              <td>
                <a class="ar-table__name" :href="fileHref(file.id)" :title="file.name" draggable="false" @click="onBrowseSelect($event, 'file', file)" @dblclick="onBrowseOpen($event, 'file', file)">
                  <span class="ar-table__name-text">{{ file.name }}</span>
                </a>
                <span v-if="isMicrostock" class="badge ar-ms-badge ms-1" :class="msBadge(file).cls">{{ msBadge(file).label }}</span>
                <span v-if="file.is_hash_blocked" class="badge text-bg-danger ms-1">{{ t('web.archivd.blocked_badge') }}</span>
              </td>
              <td class="ar-table__type">{{ file.mime || t('web.archivd.type_file') }}</td>
              <td class="ar-table__size">{{ file.size_human || '—' }}</td>
              <td>
                <span class="ar-badge" :class="visBadgeClass(file.visibility)">{{ visLabel(file.visibility) }}</span>
              </td>
              <td class="ar-table__actions">
                <div class="ar-action-group">
                  <a class="ar-table__action-btn" :href="fileHref(file.id)" draggable="false" @click.prevent="openItem('file', file)"><i class="bi bi-eye"></i></a>
                  <button v-if="canEdit('file')" type="button" class="ar-table__action-btn" @click="openModal('rename', { entity: 'file', id: file.id, name: file.name })"><i class="bi bi-pencil"></i></button>
                  <button v-if="canEdit('file')" type="button" class="ar-table__action-btn" @click="openModal('move', { keys: ['file:' + file.id] })"><i class="bi bi-folder-symlink"></i></button>
                  <button v-if="canEdit('file')" type="button" class="ar-table__action-btn" @click="openShare('file', file)"><i class="bi bi-share"></i></button>
                  <button v-if="canDelete('file')" type="button" class="ar-table__action-btn is-danger" @click="openDelete('file', file.id)"><i class="bi bi-trash"></i></button>
                </div>
              </td>
            </tr>
            <tr v-if="isEmpty && !parentMeta">
              <td colspan="7">
                <div class="ar-empty">
                  <i class="bi bi-folder2-open ar-empty__icon"></i>
                  <div class="ar-empty__text">{{ t('web.archivd.empty') }}</div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-show="viewMode === 'grid'" class="ar-grid">
        <div
          v-if="parentMeta"
          class="ar-file-card is-parent"
          data-ar-row
          data-ar-entity="parent"
          :class="{ 'is-drop-target': drag.isDropTarget(parentMeta.id || 'root') }"
          @dragover="drag.onDropOver($event, parentMeta.id || 'root')"
          @dragleave="drag.onDropLeave($event, parentMeta.id || 'root')"
          @drop="drag.onDrop($event, parentMeta.id || 'root')"
        >
          <div class="ar-file-card__icon">
            <a :href="folderHref(parentMeta.id)" draggable="false" @click.prevent="parentMeta.id ? navigateToFolder(parentMeta.id) : navigateToRoot()">
              <i class="bi bi-folder2 ar-parent-row__icon"></i>
            </a>
          </div>
          <a class="ar-file-card__name" :href="folderHref(parentMeta.id)" draggable="false" @click.prevent="parentMeta.id ? navigateToFolder(parentMeta.id) : navigateToRoot()">...</a>
          <div class="ar-file-card__meta">{{ t('web.archivd.parent') }}</div>
        </div>
        <div
          v-for="folder in folders"
          :key="'gf:' + folder.id"
          class="ar-file-card"
          data-ar-row
          data-ar-entity="folder"
          :data-ar-id="folder.id"
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
            class="form-check-input ar-file-card__select"
            :checked="selected.has('folder:' + folder.id)"
            @click.stop
            @change="toggleSelect('folder:' + folder.id, ($event.target as HTMLInputElement).checked)"
          />
          <div class="ar-file-card__icon">
            <a :href="folderHref(folder.id)" draggable="false" @click="onBrowseSelect($event, 'folder', folder)" @dblclick="onBrowseOpen($event, 'folder', folder)">
              <ArIcon is-folder />
            </a>
          </div>
          <a class="ar-file-card__name" :href="folderHref(folder.id)" draggable="false" @click="onBrowseSelect($event, 'folder', folder)" @dblclick="onBrowseOpen($event, 'folder', folder)">{{ folder.name }}</a>
          <div class="ar-file-card__meta">{{ t('web.archivd.type_folder') }}</div>
        </div>
        <div
          v-for="file in files"
          :key="'gfile:' + file.id"
          class="ar-file-card"
          data-ar-row
          data-ar-entity="file"
          :data-ar-id="file.id"
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
            class="form-check-input ar-file-card__select"
            :checked="selected.has('file:' + file.id)"
            @click.stop
            @change="toggleSelect('file:' + file.id, ($event.target as HTMLInputElement).checked)"
          />
          <div class="ar-file-card__badge">
            <span v-if="isMicrostock" class="badge ar-ms-badge" :class="msBadge(file).cls">{{ msBadge(file).label }}</span>
          </div>
          <div class="ar-file-card__icon">
            <a :href="fileHref(file.id)" draggable="false" @click="onBrowseSelect($event, 'file', file)" @dblclick="onBrowseOpen($event, 'file', file)">
              <ArIcon :mime="file.mime" />
            </a>
          </div>
          <a class="ar-file-card__name" :href="fileHref(file.id)" draggable="false" @click="onBrowseSelect($event, 'file', file)" @dblclick="onBrowseOpen($event, 'file', file)">{{ file.name }}</a>
          <div class="ar-file-card__meta">{{ file.size_human || t('web.archivd.type_file') }}</div>
        </div>
        <div v-if="isEmpty && !parentMeta" class="ar-empty">
          <i class="bi bi-folder2-open ar-empty__icon"></i>
          <div class="ar-empty__text">{{ t('web.archivd.empty') }}</div>
        </div>
      </div>
    </div>

    <ArContextMenu
      v-if="contextMenu"
      :state="contextMenu"
      :can-edit="canEdit(contextMenu.entity)"
      :can-delete="canDelete(contextMenu.entity)"
      :is-microstock="isMicrostock"
      @action="ctxAction"
      @close="closeCtx"
    />

    <ArNameMoveModal
      v-if="modal"
      :modal="modal"
      :busy="isBusy"
      :move-targets="moveTargets"
      @submit="submitModal"
      @close="modal = null"
    />

    <ArShareModal
      v-model="showShare"
      v-model:visibility="shareVisibility"
      :share-url="shareUrl"
      @save="saveShare"
    />

    <ArCollectionDescribeModal
      v-model="showCollectionModal"
      :folder="collectionFolder"
      :file-count="files.length"
      :billing="billing"
      :locking="lockingCollection"
      @lock="handleLockCollection"
    />

    <ArMicrostockReviewModal
      v-model="showReview"
      v-model:file-id="reviewFileId"
      :file-ids="reviewFileIds"
      :download-ctx="ctxParams()"
      @saved="loadBrowse({ keepSelection: true })"
    />

    <Modal v-model="showCreateMs" :title="t('web.archivd.microstock.create_title')">
      <p class="small text-muted">{{ t('web.archivd.microstock.create_hint') }}</p>
      <label class="form-label" for="ar-ms-ws-name">{{ t('web.archivd.microstock.name_label') }}</label>
      <input
        id="ar-ms-ws-name"
        v-model="createMsName"
        type="text"
        class="form-control"
        maxlength="120"
        :placeholder="t('web.archivd.microstock.name_placeholder')"
        @keyup.enter="handleCreateMicrostock"
      />
      <template #footer>
        <button type="button" class="btn btn-outline-secondary" @click="showCreateMs = false">{{ t('web.archivd.cancel') }}</button>
        <button type="button" class="btn btn-primary" :disabled="creatingMs" @click="handleCreateMicrostock">
          <span v-if="creatingMs" class="spinner-border spinner-border-sm me-1"></span>
          {{ t('web.archivd.create') }}
        </button>
      </template>
    </Modal>
  </div>
</template>
