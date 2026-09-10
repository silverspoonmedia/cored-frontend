<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import ConfirmModal from '@/components/ConfirmModal.vue'
import { confirmDialog } from '@/lib/swal'
import ErrorState from '@/components/ErrorState.vue'
import SkeletonBlock from '@/components/SkeletonBlock.vue'
import ArIcon from '@/components/archivd/ArIcon.vue'
import ArShareModal from '@/components/archivd/ArShareModal.vue'
import ArMicrostockReviewModal from '@/components/archivd/ArMicrostockReviewModal.vue'
import { useArchivd } from '@/composables/archivd/useArchivd'
import { useArchivdRealtime } from '@/composables/archivd/useArchivdRealtime'
import { useEchoResync } from '@/composables/useEcho'
import { useAlert } from '@/composables/useAlert'
import { useAuth } from '@/stores/auth'
import type { HostedFile } from '@/api/types'
import { safeHttpUrl } from '@/utils/safeUrl'

const VIS_LINK = 'anyone_with_link'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const ar = useArchivd()
const { hasPermission } = useAuth()
const { success: showSuccess, error: showError } = useAlert()
const { subscribe, unsubscribe } = useArchivdRealtime()

const file = ref<HostedFile | null>(null)
const loading = ref(true)
const loadError = ref<string | null>(null)
const isBusy = ref(false)

const showRename = ref(false)
const renameValue = ref('')
const showShare = ref(false)
const shareVisibility = ref('private')
const shareUrl = ref<string | null>(null)
const showReview = ref(false)

const canEdit = computed(() => hasPermission('edit archivd file'))
const canDelete = computed(() => hasPermission('delete archivd file'))
const isMicrostock = computed(() => file.value?.workspace?.kind === 'microstock')

function ctxParams(): Record<string, unknown> {
  const params: Record<string, unknown> = {}
  const ws = route.query.workspace_id
  const uid = route.query.user_id
  if (ws) params.workspace_id = ws
  if (uid) params.user_id = uid
  return params
}

async function loadFile(): Promise<void> {
  loading.value = true
  loadError.value = null
  try {
    file.value = await ar.fetchFile(route.params.id as string)
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : t('web.archivd.failed_load_file')
  } finally {
    loading.value = false
  }
}

const showHandlers = {
  onListingChanged: () => loadFile(),
}

// Socket-outage recovery: re-pull the file the realtime handler reloads.
useEchoResync(() => { void loadFile() })

onMounted(() => {
  loadFile()
  subscribe(showHandlers)
})

onUnmounted(() => {
  unsubscribe(showHandlers)
})

function visLabel(v: string): string {
  if (v === VIS_LINK) return t('web.archivd.visibility.anyone_with_link')
  if (v === 'workspace') return t('web.archivd.workspace_team')
  return t('web.archivd.visibility.private')
}

function visBadgeClass(v: string): string {
  return v === VIS_LINK ? 'ar-badge--link' : 'ar-badge--private'
}

function browseBack(): void {
  const folderId = file.value?.folder_id
  if (folderId) {
    router.push({ name: 'archivd.index.folder', params: { folderId }, query: route.query })
  } else {
    router.push({ name: 'archivd.index.view', query: route.query })
  }
}

function openShare(): void {
  if (!file.value) return
  shareVisibility.value = file.value.visibility || 'private'
  shareUrl.value = file.value.share_url
  showShare.value = true
}

async function saveShare(): Promise<void> {
  if (!file.value) return
  isBusy.value = true
  try {
    file.value = await ar.setFileVisibility(file.value.id, shareVisibility.value, ctxParams())
    shareUrl.value = file.value.share_url
    if (shareVisibility.value === VIS_LINK && file.value.share_url) {
      await navigator.clipboard.writeText(file.value.share_url)
      showSuccess(t('web.archivd.share_url_copied'))
    } else {
      showSuccess(t('web.archivd.visibility_updated'))
    }
    showShare.value = false
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.archivd.failed_visibility'))
  } finally {
    isBusy.value = false
  }
}

async function handleRename(): Promise<void> {
  if (!file.value || !renameValue.value.trim()) return
  isBusy.value = true
  try {
    file.value = await ar.renameFile(file.value.id, renameValue.value.trim(), ctxParams())
    showSuccess(t('web.archivd.renamed'))
    showRename.value = false
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.archivd.failed_rename'))
  } finally {
    isBusy.value = false
  }
}

async function confirmDelete(): Promise<void> {
  if (!file.value) return
  const confirmed = await confirmDialog({
    title: t('web.archivd.modal_delete'),
    html: `<p>${t('web.archivd.confirm_delete_file')}</p><p class="text-muted small">${t('web.archivd.trash_hint')}</p>`,
    confirmText: t('web.archivd.delete'),
  })
  if (confirmed) await handleDelete()
}

async function handleDelete(): Promise<void> {
  if (!file.value) return
  isBusy.value = true
  try {
    await ar.deleteFile(file.value.id, ctxParams())
    showSuccess(t('web.archivd.deleted'))
    router.push({ name: 'archivd.index.view', query: route.query })
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.archivd.failed_delete'))
  } finally {
    isBusy.value = false
  }
}

async function handleDownload(): Promise<void> {
  if (!file.value) return
  try {
    const payload = await ar.fetchFileDownload(file.value.id, ctxParams())
    const safeUrl = safeHttpUrl(payload.url)
    if (!safeUrl) {
      await showError(t('web.archivd.failed_download_url'))
      return
    }
    window.location.assign(safeUrl)
  } catch (e) {
    await showError(e instanceof Error ? e.message : t('web.archivd.failed_download_url'))
  }
}
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

    <div v-if="loading" class="card">
      <div class="card-body">
        <SkeletonBlock variant="line" :lines="1" width="40%" />
        <SkeletonBlock variant="block" height="8rem" />
        <SkeletonBlock variant="line" :lines="4" />
      </div>
    </div>

    <ErrorState v-else-if="loadError" :message="loadError" @retry="loadFile" />

    <div v-else-if="file" data-ar-panel="show">
      <div class="row g-3">
        <div class="col-lg-8">
          <div class="card card-outline card-primary">
            <div class="card-body">
              <div class="ar-detail__hero">
                <div class="ar-detail__hero-icon"><ArIcon :mime="file.mime" /></div>
                <div class="flex-grow-1 min-w-0">
                  <div class="ar-detail__hero-name">{{ file.name }}</div>
                  <div class="ar-detail__hero-meta">{{ file.mime }} Â· {{ file.size_human }}</div>
                </div>
              </div>
              <div class="ar-stats mt-3">
                <div class="ar-stat">
                  <div class="ar-stat__value">{{ file.view_count || 0 }}</div>
                  <div class="ar-stat__label">{{ t('web.archivd.stats.views') }}</div>
                </div>
                <div class="ar-stat">
                  <div class="ar-stat__value">{{ file.download_count || 0 }}</div>
                  <div class="ar-stat__label">{{ t('web.archivd.stats.downloads') }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-lg-4">
          <div class="d-flex flex-wrap gap-2 mb-3">
            <button type="button" class="btn btn-outline-secondary btn-sm" @click="browseBack">
              <i class="bi bi-arrow-left me-1"></i>{{ t('web.archivd.back') }}
            </button>
            <button type="button" class="btn btn-primary btn-sm" @click="handleDownload">
              <i class="bi bi-download me-1"></i>{{ t('web.archivd.download') }}
            </button>
            <button v-if="canEdit" type="button" class="btn btn-outline-secondary btn-sm" @click="showRename = true; renameValue = file.name">
              {{ t('web.archivd.rename') }}
            </button>
            <button v-if="canEdit" type="button" class="btn btn-outline-secondary btn-sm" @click="openShare">
              {{ t('web.archivd.share') }}
            </button>
            <button v-if="canDelete" type="button" class="btn btn-outline-danger btn-sm" @click="confirmDelete">
              {{ t('web.archivd.delete') }}
            </button>
          </div>
          <div class="small text-muted mb-1">{{ t('web.archivd.visibility.label') }}</div>
          <span class="ar-badge" :class="visBadgeClass(file.visibility)">{{ visLabel(file.visibility) }}</span>

          <div v-if="isMicrostock" class="card mt-3">
            <div class="card-header d-flex align-items-center justify-content-between">
              <span>{{ t('web.archivd.microstock_title') }}</span>
              <button
                v-if="'microstock' in file"
                type="button"
                class="btn btn-outline-secondary btn-sm"
                @click="showReview = true"
              >
                <i class="bi bi-pencil-square me-1"></i>{{ t('web.archivd.microstock.review') }}
              </button>
            </div>
            <div class="card-body">
              <div v-if="file.microstock" class="small">
                <p class="mb-1"><strong>{{ t('web.archivd.title_label') }}</strong> {{ file.microstock.title ?? '—' }}</p>
                <p class="mb-1"><strong>{{ t('web.archivd.status_label') }}</strong> {{ file.microstock.status ?? '—' }}</p>
                <p class="mb-1"><strong>{{ t('web.archivd.phase_label') }}</strong> {{ file.microstock.phase ?? '—' }}</p>
                <div v-if="file.microstock.keywords.length > 0">
                  <strong>{{ t('web.archivd.keywords_label') }}</strong>
                  <div class="d-flex flex-wrap gap-1 mt-1">
                    <span v-for="kw in file.microstock.keywords" :key="kw" class="badge text-bg-light">{{ kw }}</span>
                  </div>
                </div>
              </div>
              <div v-else class="text-muted small">{{ t('web.archivd.microstock.no_metadata') }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <ConfirmModal
      v-model="showRename"
      :title="t('web.archivd.rename')"
      :confirm-label="t('web.archivd.save')"
      @confirm="handleRename"
      @cancel="showRename = false"
    >
      <input type="text" class="form-control" v-model="renameValue" @keyup.enter="handleRename" autofocus />
    </ConfirmModal>

    <ArShareModal
      v-model="showShare"
      v-model:visibility="shareVisibility"
      :share-url="shareUrl"
      @save="saveShare"
    />

    <ArMicrostockReviewModal
      v-if="file && isMicrostock"
      v-model="showReview"
      :file-id="file.id"
      :file-ids="[file.id]"
      :download-ctx="ctxParams()"
      @saved="loadFile"
    />
  </div>
</template>
