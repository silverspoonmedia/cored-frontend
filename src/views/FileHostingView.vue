<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import Modal from '@/components/Modal.vue'
import FhDropzone from '@/components/FhDropzone.vue'
import { useFileHosting } from '@/composables/useFileHosting'
import { useAlert } from '@/composables/useAlert'
import { useAuth } from '@/stores/auth'
import type { HostedFile, FhFolder, FhBrowsePayload, FhQuota, FhWorkspace } from '@/api/types'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const fh = useFileHosting()
const { hasPermission } = useAuth()
const { success: showSuccess, error: showError } = useAlert()

const browse = ref<FhBrowsePayload | null>(null)
const quota = ref<FhQuota | null>(null)
const loading = ref(true)
const viewMode = ref<'table' | 'grid'>('table')
const search = ref('')
const searchResults = ref<HostedFile[]>([])
const searchLoading = ref(false)
const workspaces = ref<FhWorkspace[]>([])

const selected = ref<Set<string>>(new Set())

// Modals
const showCreateFolder = ref(false)
const newFolderName = ref('')
const creatingFolder = ref(false)
const renameTarget = ref<{ type: 'folder' | 'file'; id: string; name: string } | null>(null)
const renameValue = ref('')
const showRename = ref(false)
const showDeleteConfirm = ref(false)
const deleteTarget = ref<{ type: 'folder' | 'file'; id: string; force: boolean } | null>(null)

const currentFolderId = computed(() => (route.params.folderId as string) ?? null)

function ctxParams(): Record<string, unknown> {
  const params: Record<string, unknown> = {}
  const ws = route.query.workspace_id
  const uid = route.query.user_id
  if (ws) params.workspace_id = ws
  if (uid) params.user_id = uid
  return params
}

async function loadBrowse(): Promise<void> {
  loading.value = true
  try {
    const params: Record<string, unknown> = { ...ctxParams() }
    if (currentFolderId.value) params.folder_id = currentFolderId.value
    browse.value = await fh.fetchBrowse(params)
    selected.value.clear()
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
    // non-critical
  }
}

async function loadAll(): Promise<void> {
  await Promise.all([loadBrowse(), loadQuota(), loadWorkspaces()])
}

async function loadWorkspaces(): Promise<void> {
  try {
    workspaces.value = await fh.fetchWorkspaces()
  } catch {
    workspaces.value = []
  }
}

function switchWorkspace(id: string | null): void {
  const query: Record<string, string> = {}
  if (id) query.workspace_id = id
  router.push({ name: 'file-hosting.index.view', query })
}

const currentWorkspaceName = computed(() => {
  const id = route.query.workspace_id as string | undefined
  if (!id) return t('web.file-hosting.personal')
  return workspaces.value.find((w) => w.id === id)?.name ?? t('web.file-hosting.personal')
})

const canCreateFile = computed(() => hasPermission('create file hosting file'))

const uploadCtx = computed(() => ({
  folderId: currentFolderId.value,
  userId: (route.query.user_id as string) ?? null,
  workspaceId: (route.query.workspace_id as string) ?? null,
}))

function onFileUploaded(file: HostedFile): void {
  if (browse.value) {
    browse.value.files.unshift(file)
  }
}

function onUploadRefresh(): void {
  loadAll()
}

// Collection describe modal
const showCollectionModal = ref(false)
const collectionFolder = ref<FhFolder | null>(null)
const collectionPrimary = ref('')
const collectionNotes = ref('')
const collectionBillingMode = ref<'free' | 'paid' | ''>('')
const lockingCollection = ref(false)

function openCollectionModal(folder: FhFolder): void {
  collectionFolder.value = folder
  collectionPrimary.value = ''
  collectionNotes.value = ''
  collectionBillingMode.value = ''
  showCollectionModal.value = true
}

function composeHint(): string {
  const parts: string[] = []
  if (collectionPrimary.value.trim()) {
    parts.push(`PRIMARY CONCEPT:\n${collectionPrimary.value.trim()}`)
  }
  if (collectionNotes.value.trim()) {
    parts.push(`ADDITIONAL NOTES:\n${collectionNotes.value.trim()}`)
  }
  return parts.join('\n\n')
}

async function handleLockCollection(): Promise<void> {
  if (!collectionFolder.value || lockingCollection.value) return
  lockingCollection.value = true
  try {
    const hint = composeHint()
    const billing = collectionBillingMode.value || null
    await fh.lockCollection(collectionFolder.value.id, hint || null, billing)
    showSuccess(t('web.file-hosting.collection_locked'))
    showCollectionModal.value = false
    await loadAll()
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.file-hosting.lock_collection_failed'))
  } finally {
    lockingCollection.value = false
  }
}

function canLockCollection(folder: FhFolder): boolean {
  if (!folder.collection_status) return false
  if (folder.collection_locked) return false
  return folder.collection_status === 'draft' || folder.collection_status === 'failed'
}

onMounted(loadAll)

watch(() => route.params.folderId, () => {
  if (route.name === 'file-hosting.index.view') {
    loadAll()
  }
})

let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(search, (q) => {
  if (searchTimer) clearTimeout(searchTimer)
  if (!q.trim()) {
    searchResults.value = []
    return
  }
  searchTimer = setTimeout(async () => {
    searchLoading.value = true
    try {
      searchResults.value = await fh.searchFiles(q, ctxParams())
    } catch {
      searchResults.value = []
    } finally {
      searchLoading.value = false
    }
  }, 300)
})

const displayFiles = computed(() => {
  if (search.value.trim() && searchResults.value.length > 0) {
    return searchResults.value
  }
  return browse.value?.files ?? []
})

const displayFolders = computed(() => {
  if (search.value.trim()) return []
  return browse.value?.folders ?? []
})

const selectedArray = computed(() => Array.from(selected.value))

function toggleSelect(key: string): void {
  if (selected.value.has(key)) {
    selected.value.delete(key)
  } else {
    selected.value.add(key)
  }
}

function selectAll(): void {
  const all = [...displayFolders.value.map((f) => `folder:${f.id}`), ...displayFiles.value.map((f) => `file:${f.id}`)]
  all.forEach((k) => selected.value.add(k))
}

function clearSelection(): void {
  selected.value.clear()
}

function navigateToFolder(folderId: string): void {
  router.push({
    name: 'file-hosting.index.view',
    params: { folderId },
    query: route.query,
  })
}

function navigateToBreadcrumb(item: { id: string }): void {
  if (item.id === currentFolderId.value) return
  router.push({
    name: 'file-hosting.index.view',
    params: { folderId: item.id },
    query: route.query,
  })
}

function navigateToRoot(): void {
  router.push({
    name: 'file-hosting.index.view',
    query: route.query,
  })
}

function openFile(file: HostedFile): void {
  router.push({
    name: 'file-hosting.show.view',
    params: { id: file.id },
    query: route.query,
  })
}

function visibilityBadge(visibility: string): string {
  if (visibility === 'anyone_with_link') return 'text-bg-success'
  if (visibility === 'workspace') return 'text-bg-info'
  return 'text-bg-secondary'
}

function visibilityLabel(visibility: string): string {
  if (visibility === 'anyone_with_link') return t('web.file-hosting.link')
  if (visibility === 'workspace') return t('web.file-hosting.workspace_team')
  return t('web.file-hosting.private')
}

function copyShareUrl(url: string): void {
  navigator.clipboard.writeText(url).then(() => showSuccess(t('web.file-hosting.share_url_copied')))
}

// Create folder
async function handleCreateFolder(): Promise<void> {
  if (!newFolderName.value.trim() || creatingFolder.value) return
  creatingFolder.value = true
  try {
    const params: Record<string, unknown> = { ...ctxParams() }
    if (currentFolderId.value) params.parent_id = currentFolderId.value
    await fh.createFolder(newFolderName.value.trim(), params)
    showSuccess(t('web.file-hosting.folder_created'))
    newFolderName.value = ''
    showCreateFolder.value = false
    await loadAll()
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.file-hosting.operation_failed'))
  } finally {
    creatingFolder.value = false
  }
}

// Rename
function openRename(type: 'folder' | 'file', id: string, name: string): void {
  renameTarget.value = { type, id, name }
  renameValue.value = name
  showRename.value = true
}

async function handleRename(): Promise<void> {
  if (!renameTarget.value || !renameValue.value.trim()) return
  const { type, id } = renameTarget.value
  try {
    if (type === 'folder') {
      await fh.renameFolder(id, renameValue.value.trim(), ctxParams())
    } else {
      await fh.renameFile(id, renameValue.value.trim(), ctxParams())
    }
    showSuccess(t('web.file-hosting.renamed'))
    renameTarget.value = null
    showRename.value = false
    await loadAll()
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.file-hosting.failed_rename'))
  }
}

// Delete
function openDelete(type: 'folder' | 'file', id: string, force = false): void {
  deleteTarget.value = { type, id, force }
  showDeleteConfirm.value = true
}

async function handleDelete(): Promise<void> {
  if (!deleteTarget.value) return
  const { type, id, force } = deleteTarget.value
  try {
    if (type === 'folder') {
      if (force) await fh.forceDeleteFolder(id, ctxParams())
      else await fh.deleteFolder(id, ctxParams())
    } else {
      if (force) await fh.forceDeleteFile(id, ctxParams())
      else await fh.deleteFile(id, ctxParams())
    }
    showSuccess(t('web.file-hosting.deleted'))
    showDeleteConfirm.value = false
    deleteTarget.value = null
    await loadAll()
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.file-hosting.failed_delete'))
  }
}

// Visibility
async function toggleVisibility(entity: 'folder' | 'file', id: string, current: string): Promise<void> {
  const next = current === 'anyone_with_link' ? 'private' : 'anyone_with_link'
  try {
    let updated: { share_url: string | null }
    if (entity === 'folder') {
      updated = await fh.setFolderVisibility(id, next, ctxParams())
    } else {
      updated = await fh.setFileVisibility(id, next, ctxParams())
    }
    if (next === 'anyone_with_link' && updated.share_url) {
      copyShareUrl(updated.share_url)
    } else {
      showSuccess(t('web.file-hosting.visibility_updated'))
    }
    await loadAll()
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.file-hosting.failed_visibility'))
  }
}

// Bulk delete
async function handleBulkDelete(): Promise<void> {
  const folderIds = selectedArray.value.filter((k) => k.startsWith('folder:')).map((k) => k.split(':')[1]!)
  const fileIds = selectedArray.value.filter((k) => k.startsWith('file:')).map((k) => k.split(':')[1]!)
  if (folderIds.length === 0 && fileIds.length === 0) return

  try {
    let total = 0
    if (folderIds.length > 0) total += await fh.bulkDeleteFolders(folderIds, ctxParams())
    if (fileIds.length > 0) total += await fh.bulkDeleteFiles(fileIds, ctxParams())
    showSuccess(t('web.file-hosting.items_deleted', { count: total }))
    clearSelection()
    await loadAll()
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.file-hosting.bulk_delete_failed'))
  }
}

const quotaPercent = computed(() => {
  if (!quota.value || quota.value.quota_bytes === 0) return 0
  return Math.min(100, (quota.value.used_bytes / quota.value.quota_bytes) * 100)
})

function fileIcon(mime: string): string {
  if (mime.startsWith('image/')) return 'bi-file-image'
  if (mime.startsWith('video/')) return 'bi-file-play'
  if (mime.startsWith('audio/')) return 'bi-file-music'
  if (mime.includes('pdf')) return 'bi-file-pdf'
  if (mime.includes('zip') || mime.includes('compressed')) return 'bi-file-zip'
  if (mime.includes('text')) return 'bi-file-text'
  return 'bi-file-earmark'
}
</script>

<template>
  <Card :title="t('web.file-hosting.title')">
    <template #actions>
      <div class="dropdown d-inline-block">
        <button class="btn btn-outline-secondary btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
          <i class="bi bi-people me-1"></i> {{ currentWorkspaceName }}
        </button>
        <ul class="dropdown-menu dropdown-menu-end">
          <li>
            <button class="dropdown-item" :class="{ active: !route.query.workspace_id }" type="button" @click="switchWorkspace(null)">
              <i class="bi bi-person me-2"></i> {{ t('web.file-hosting.personal') }}
            </button>
          </li>
          <li v-for="ws in workspaces" :key="ws.id">
            <button class="dropdown-item" :class="{ active: route.query.workspace_id === ws.id }" type="button" @click="switchWorkspace(ws.id)">
              <i class="bi bi-people me-2"></i> {{ ws.name }}
            </button>
          </li>
          <li><hr class="dropdown-divider" /></li>
          <li>
            <router-link class="dropdown-item" :to="{ name: 'file-hosting.workspaces.view' }">
              <i class="bi bi-gear me-2"></i> {{ t('web.file-hosting.manage_workspaces') }}
            </router-link>
          </li>
        </ul>
      </div>
      <div class="btn-group btn-group-sm ms-2">
        <button class="btn btn-outline-secondary" :class="{ active: viewMode === 'table' }" @click="viewMode = 'table'">
          <i class="bi bi-list"></i>
        </button>
        <button class="btn btn-outline-secondary" :class="{ active: viewMode === 'grid' }" @click="viewMode = 'grid'">
          <i class="bi bi-grid"></i>
        </button>
      </div>
      <button class="btn btn-primary btn-sm ms-2" @click="showCreateFolder = true">
        <i class="bi bi-folder-plus me-1"></i> {{ t('web.file-hosting.new_folder') }}
      </button>
    </template>

    <!-- Quota bar -->
    <div v-if="quota" class="mb-3">
      <div class="d-flex justify-content-between align-items-center mb-1">
        <span class="small text-muted">{{ t('web.file-hosting.quota_used') }}: {{ quota.used_bytes_human }} / {{ quota.quota_bytes_human }}</span>
        <span class="small text-muted">{{ quota.remaining_bytes_human ?? '∞' }} {{ t('web.file-hosting.quota_remaining') }}</span>
      </div>
      <div class="progress" style="height: 6px;">
        <div class="progress-bar" :class="{ 'bg-warning': quotaPercent > 80, 'bg-danger': quotaPercent > 95 }" :style="{ width: `${quotaPercent}%` }"></div>
      </div>
    </div>

    <!-- Upload dropzone -->
    <FhDropzone
      v-if="canCreateFile"
      :folder-id="uploadCtx.folderId"
      :user-id="uploadCtx.userId"
      :workspace-id="uploadCtx.workspaceId"
      @uploaded="onFileUploaded"
      @refresh="onUploadRefresh"
    />

    <!-- Search -->
    <div class="mb-3">
      <div class="input-group input-group-sm">
        <span class="input-group-text"><i class="bi bi-search"></i></span>
        <input type="text" class="form-control" :placeholder="t('web.file-hosting.search_placeholder')" v-model="search" />
        <button v-if="search" class="btn btn-outline-secondary" @click="search = ''"><i class="bi bi-x"></i></button>
      </div>
    </div>

    <!-- Breadcrumb -->
    <nav v-if="!search && browse?.breadcrumb && browse.breadcrumb.length > 0" aria-label="breadcrumb" class="mb-2">
      <ol class="breadcrumb breadcrumb-sm mb-0">
        <li class="breadcrumb-item">
          <a href="#" @click.prevent="navigateToRoot">{{ t('web.file-hosting.root') }}</a>
        </li>
        <li v-for="(crumb, i) in browse.breadcrumb" :key="crumb.id" class="breadcrumb-item" :class="{ active: i === browse.breadcrumb!.length - 1 }">
          <a v-if="i < browse.breadcrumb!.length - 1" href="#" @click.prevent="navigateToBreadcrumb(crumb)">{{ crumb.name }}</a>
          <span v-else>{{ crumb.name }}</span>
        </li>
      </ol>
    </nav>

    <!-- Bulk bar -->
    <div v-if="selectedArray.length > 0" class="d-flex align-items-center gap-2 mb-2 p-2 bg-light rounded">
      <span class="small">{{ selectedArray.length }} {{ t('web.file-hosting.bulk.selected') }}</span>
      <button class="btn btn-danger btn-sm" @click="handleBulkDelete">
        <i class="bi bi-trash me-1"></i> {{ t('web.file-hosting.delete') }}
      </button>
      <button class="btn btn-outline-secondary btn-sm" @click="clearSelection">{{ t('actions.cancel') }}</button>
    </div>

    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">{{ t('ui.loading') }}</span>
      </div>
    </div>

    <div v-else-if="displayFolders.length === 0 && displayFiles.length === 0" class="text-muted text-center py-4">
      <i class="bi bi-folder2-open fs-2 d-block mb-2"></i>
      <span v-if="search">{{ t('web.file-hosting.search_no_results') }}</span>
      <span v-else>{{ t('web.file-hosting.empty') }}</span>
    </div>

    <!-- Table view -->
    <div v-else-if="viewMode === 'table'" class="table-responsive">
      <table class="table table-sm table-hover align-middle mb-0">
        <thead>
          <tr>
            <th style="width: 30px;">
              <input type="checkbox" class="form-check-input" @change="($event.target as HTMLInputElement).checked ? selectAll() : clearSelection()" />
            </th>
            <th>{{ t('web.file-hosting.columns.name') }}</th>
            <th class="text-center">{{ t('web.file-hosting.columns.visibility') }}</th>
            <th>{{ t('web.file-hosting.columns.size') }}</th>
            <th>{{ t('web.file-hosting.columns.modified') }}</th>
            <th class="text-end">{{ t('web.file-hosting.columns.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="folder in displayFolders" :key="`folder:${folder.id}`">
            <td>
              <input type="checkbox" class="form-check-input" :checked="selected.has(`folder:${folder.id}`)" @change="toggleSelect(`folder:${folder.id}`)" />
            </td>
            <td>
              <a href="#" @click.prevent="navigateToFolder(folder.id)" class="text-decoration-none">
                <i class="bi bi-folder-fill text-warning me-1"></i>
                {{ folder.name }}
              </a>
            </td>
            <td class="text-center">
              <span class="badge" :class="visibilityBadge(folder.visibility)">{{ visibilityLabel(folder.visibility) }}</span>
            </td>
            <td class="text-muted small">—</td>
            <td class="small">{{ folder.updated_at_formatted ?? folder.updated_at ?? '—' }}</td>
            <td class="text-end">
              <div class="btn-group btn-group-sm">
                <button
                  v-if="canLockCollection(folder)"
                  class="btn btn-outline-success"
                  :title="t('web.file-hosting.microstock.lock_describe')"
                  @click.stop="openCollectionModal(folder)"
                >
                  <i class="bi bi-lock-fill"></i>
                </button>
                <button class="btn btn-outline-secondary" @click="toggleVisibility('folder', folder.id, folder.visibility)" :title="t('web.file-hosting.visibility.label')">
                  <i class="bi" :class="folder.visibility === 'anyone_with_link' ? 'bi-unlock' : 'bi-lock'"></i>
                </button>
                <button class="btn btn-outline-secondary" @click="openRename('folder', folder.id, folder.name)" :title="t('web.file-hosting.rename')">
                  <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-outline-danger" @click="openDelete('folder', folder.id)" :title="t('web.file-hosting.delete')">
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </td>
          </tr>
          <tr v-for="file in displayFiles" :key="`file:${file.id}`">
            <td>
              <input type="checkbox" class="form-check-input" :checked="selected.has(`file:${file.id}`)" @change="toggleSelect(`file:${file.id}`)" />
            </td>
            <td>
              <a href="#" @click.prevent="openFile(file)" class="text-decoration-none">
                <i class="bi me-1" :class="fileIcon(file.mime)"></i>
                {{ file.name }}
              </a>
              <span v-if="file.is_hash_blocked" class="badge text-bg-danger ms-1">{{ t('web.file-hosting.blocked_badge') }}</span>
            </td>
            <td class="text-center">
              <span class="badge" :class="visibilityBadge(file.visibility)">{{ visibilityLabel(file.visibility) }}</span>
            </td>
            <td class="small">{{ file.size_human ?? file.size ?? '—' }}</td>
            <td class="small">{{ file.updated_at_formatted ?? file.updated_at ?? '—' }}</td>
            <td class="text-end">
              <div class="btn-group btn-group-sm">
                <button class="btn btn-outline-secondary" @click="toggleVisibility('file', file.id, file.visibility)" :title="t('web.file-hosting.visibility.label')">
                  <i class="bi" :class="file.visibility === 'anyone_with_link' ? 'bi-unlock' : 'bi-lock'"></i>
                </button>
                <button class="btn btn-outline-secondary" @click="openRename('file', file.id, file.name)" :title="t('web.file-hosting.rename')">
                  <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-outline-danger" @click="openDelete('file', file.id)" :title="t('web.file-hosting.delete')">
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Grid view -->
    <div v-else class="row g-2">
      <div v-for="folder in displayFolders" :key="folder.id" class="col-6 col-md-2">
        <div class="card h-100" :class="{ 'border-primary': selected.has(`folder:${folder.id}`) }" @click="navigateToFolder(folder.id)">
          <div class="card-body text-center p-2">
            <i class="bi bi-folder-fill text-warning fs-2"></i>
            <div class="small text-truncate mt-1">{{ folder.name }}</div>
          </div>
        </div>
      </div>
      <div v-for="file in displayFiles" :key="file.id" class="col-6 col-md-2">
        <div class="card h-100" :class="{ 'border-primary': selected.has(`file:${file.id}`) }" @click="openFile(file)">
          <div class="card-body text-center p-2">
            <i class="bi fs-2" :class="fileIcon(file.mime)"></i>
            <div class="small text-truncate mt-1">{{ file.name }}</div>
            <div class="text-muted small">{{ file.size_human }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create folder modal -->
    <ConfirmModal
      v-model="showCreateFolder"
      :title="t('web.file-hosting.new_folder')"
      :confirm-label="t('web.file-hosting.create')"
      @confirm="handleCreateFolder"
    >
      <div class="mb-3">
        <label class="form-label">{{ t('web.file-hosting.folder_name') }}</label>
        <input type="text" class="form-control" v-model="newFolderName" @keyup.enter="handleCreateFolder" autofocus />
      </div>
    </ConfirmModal>

    <!-- Rename modal -->
    <ConfirmModal
      v-model="showRename"
      :title="t('web.file-hosting.rename')"
      :confirm-label="t('web.file-hosting.save')"
      @confirm="handleRename"
    >
      <div class="mb-3">
        <label class="form-label">{{ t('web.file-hosting.name_label') }}</label>
        <input type="text" class="form-control" v-model="renameValue" @keyup.enter="handleRename" autofocus />
      </div>
    </ConfirmModal>

    <!-- Delete confirm modal -->
    <ConfirmModal
      v-model="showDeleteConfirm"
      :title="t('web.file-hosting.modal_delete')"
      :confirm-label="deleteTarget?.force ? t('web.file-hosting.force_delete') : t('web.file-hosting.delete')"
      confirm-variant="danger"
      @confirm="handleDelete"
      @cancel="deleteTarget = null"
    >
      <p>{{ t('web.file-hosting.confirm_delete_item') }}</p>
      <p v-if="!deleteTarget?.force" class="text-muted small">{{ t('web.file-hosting.trash_hint') }}</p>
      <p v-else class="text-danger small">{{ t('web.file-hosting.trash_cannot_be_undone') }}</p>
    </ConfirmModal>

    <!-- Collection describe modal -->
    <Modal v-model="showCollectionModal" :title="t('web.file-hosting.lock_describe_title')" size="lg">
      <div v-if="collectionFolder" class="mb-3">
        <p class="text-muted small">{{ t('web.file-hosting.parent_folder') }}: <strong>{{ collectionFolder.name }}</strong></p>

        <div class="mb-3">
          <label class="form-label">{{ t('web.file-hosting.primary_concept') }}</label>
          <textarea v-model="collectionPrimary" class="form-control" rows="3" maxlength="2000" :placeholder="t('web.file-hosting.primary_concept_placeholder')"></textarea>
          <div class="form-text">{{ t('web.file-hosting.char_count', { count: collectionPrimary.length }) }}</div>
        </div>

        <div class="mb-3">
          <label class="form-label">{{ t('web.file-hosting.additional_notes') }}</label>
          <textarea v-model="collectionNotes" class="form-control" rows="2" maxlength="2000" :placeholder="t('web.file-hosting.additional_notes_placeholder')"></textarea>
        </div>

        <div class="mb-3">
          <label class="form-label">{{ t('web.file-hosting.billing_mode') }}</label>
          <div class="d-flex gap-3">
            <div class="form-check">
              <input v-model="collectionBillingMode" class="form-check-input" type="radio" value="free" id="billing-free" />
              <label class="form-check-label" for="billing-free">{{ t('web.file-hosting.billing_mode_free') }}</label>
            </div>
            <div class="form-check">
              <input v-model="collectionBillingMode" class="form-check-input" type="radio" value="paid" id="billing-paid" />
              <label class="form-check-label" for="billing-paid">{{ t('web.file-hosting.billing_mode_paid') }}</label>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <button type="button" class="btn btn-outline-secondary" @click="showCollectionModal = false">{{ t('web.file-hosting.cancel') }}</button>
        <button
          type="button"
          class="btn btn-success"
          :disabled="lockingCollection"
          @click="handleLockCollection"
        >
          <span v-if="lockingCollection" class="spinner-border spinner-border-sm me-1"></span>
          <i v-else class="bi bi-lock-fill me-1"></i>
          {{ t('web.file-hosting.lock_collection_button') }}
        </button>
      </template>
    </Modal>
  </Card>
</template>
