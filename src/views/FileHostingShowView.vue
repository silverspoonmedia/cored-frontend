<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import { useFileHosting } from '@/composables/useFileHosting'
import { useFileHostingRealtime } from '@/composables/useFileHostingRealtime'
import { useEcho } from '@/composables/useEcho'
import { useAlert } from '@/composables/useAlert'
import { useAuth } from '@/stores/auth'
import type { HostedFile } from '@/api/types'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const fh = useFileHosting()
const { token } = useAuth()
const { success: showSuccess, error: showError } = useAlert()
const { subscribe, unsubscribe } = useFileHostingRealtime()
const { connected: echoConnected } = useEcho(() => token.value)

const file = ref<HostedFile | null>(null)
const loading = ref(true)

const showRename = ref(false)
const renameValue = ref('')
const showDeleteConfirm = ref(false)
const showVisibilityConfirm = ref(false)

async function loadFile(): Promise<void> {
  loading.value = true
  try {
    file.value = await fh.fetchFile(route.params.id as string)
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.file-hosting.failed_load_file'))
  } finally {
    loading.value = false
  }
}

const showHandlers = {
  onListingChanged: () => loadFile(),
}

let showPollTimer: ReturnType<typeof setInterval> | null = null
const SHOW_POLL_MS = 30_000

function startShowPolling(): void {
  if (showPollTimer) return
  showPollTimer = setInterval(() => {
    if (document.visibilityState !== 'visible') return
    if (echoConnected.value) {
      stopShowPolling()
      return
    }
    loadFile()
  }, SHOW_POLL_MS)
}

function stopShowPolling(): void {
  if (showPollTimer) {
    clearInterval(showPollTimer)
    showPollTimer = null
  }
}

onMounted(() => {
  loadFile()
  subscribe(showHandlers)
  if (!echoConnected.value) {
    startShowPolling()
  }
})

onUnmounted(() => {
  unsubscribe(showHandlers)
  stopShowPolling()
})

function ctxParams(): Record<string, unknown> {
  const params: Record<string, unknown> = {}
  const ws = route.query.workspace_id
  const uid = route.query.user_id
  if (ws) params.workspace_id = ws
  if (uid) params.user_id = uid
  return params
}

function fileIcon(mime: string): string {
  if (mime.startsWith('image/')) return 'bi-file-image'
  if (mime.startsWith('video/')) return 'bi-file-play'
  if (mime.startsWith('audio/')) return 'bi-file-music'
  if (mime.includes('pdf')) return 'bi-file-pdf'
  if (mime.includes('zip') || mime.includes('compressed')) return 'bi-file-zip'
  if (mime.includes('text')) return 'bi-file-text'
  return 'bi-file-earmark'
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

function copyShareUrl(): void {
  if (file.value?.share_url) {
    navigator.clipboard.writeText(file.value.share_url).then(() => showSuccess(t('web.file-hosting.share_url_copied')))
  }
}

async function handleRename(): Promise<void> {
  if (!file.value || !renameValue.value.trim()) return
  try {
    file.value = await fh.renameFile(file.value.id, renameValue.value.trim(), ctxParams())
    showSuccess(t('web.file-hosting.renamed'))
    showRename.value = false
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.file-hosting.failed_rename'))
  }
}

async function handleDelete(): Promise<void> {
  if (!file.value) return
  try {
    await fh.deleteFile(file.value.id, ctxParams())
    showSuccess(t('web.file-hosting.deleted'))
    router.push({ name: 'file-hosting.index.view', query: route.query })
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.file-hosting.failed_delete'))
  }
}

async function toggleVisibility(): Promise<void> {
  if (!file.value) return
  const next = file.value.visibility === 'anyone_with_link' ? 'private' : 'anyone_with_link'
  try {
    file.value = await fh.setFileVisibility(file.value.id, next, ctxParams())
    if (next === 'anyone_with_link' && file.value.share_url) {
      copyShareUrl()
    } else {
      showSuccess(t('web.file-hosting.visibility_updated'))
    }
    showVisibilityConfirm.value = false
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.file-hosting.failed_visibility'))
  }
}
</script>

<template>
  <div v-if="loading" class="text-center py-4">
    <div class="spinner-border text-primary" role="status">
      <span class="visually-hidden">{{ t('ui.loading') }}</span>
    </div>
  </div>

  <div v-else-if="file" class="row g-3">
    <div class="col-lg-8">
      <Card :title="file.name">
        <template #actions>
          <button class="btn btn-outline-secondary btn-sm" @click="router.push({ name: 'file-hosting.index.view', query: route.query })">
            <i class="bi bi-arrow-left me-1"></i> {{ t('web.file-hosting.back') }}
          </button>
        </template>

        <div class="d-flex align-items-center gap-3 mb-3">
          <i class="bi fs-1" :class="fileIcon(file.mime)"></i>
          <div>
            <h4 class="mb-0">{{ file.name }}</h4>
            <div class="text-muted small">{{ file.mime }} · {{ file.size_human ?? file.size }}</div>
          </div>
          <span v-if="file.is_hash_blocked" class="badge text-bg-danger">{{ t('web.file-hosting.blocked_badge') }}</span>
          <span class="badge" :class="visibilityBadge(file.visibility)">{{ visibilityLabel(file.visibility) }}</span>
        </div>

        <div v-if="file.share_url" class="mb-3">
          <div class="input-group input-group-sm">
            <input type="text" class="form-control" :value="file.share_url" readonly />
            <button class="btn btn-outline-secondary" @click="copyShareUrl">{{ t('web.file-hosting.copy') }}</button>
          </div>
        </div>

        <dl class="row mb-0">
          <dt class="col-sm-3">{{ t('web.file-hosting.columns.size') }}</dt>
          <dd class="col-sm-9">{{ file.size_human ?? file.size }}</dd>

          <dt class="col-sm-3">{{ t('web.file-hosting.type_file') }}</dt>
          <dd class="col-sm-9">{{ file.mime }}</dd>

          <dt class="col-sm-3">{{ t('web.file-hosting.checksum') }}</dt>
          <dd class="col-sm-9"><code class="small text-break">{{ file.checksum ?? '—' }}</code></dd>

          <dt class="col-sm-3">{{ t('web.file-hosting.disk_region') }}</dt>
          <dd class="col-sm-9">{{ file.disk }} ({{ file.region }})</dd>

          <dt class="col-sm-3">{{ t('web.file-hosting.stats.downloads') }}</dt>
          <dd class="col-sm-9">{{ file.download_count }}</dd>

          <dt class="col-sm-3">{{ t('web.file-hosting.stats.views') }}</dt>
          <dd class="col-sm-9">{{ file.view_count }}</dd>

          <dt class="col-sm-3">{{ t('web.file-hosting.last_downloaded') }}</dt>
          <dd class="col-sm-9">{{ file.last_downloaded_at_formatted ?? file.last_downloaded_at ?? '—' }}</dd>

          <dt class="col-sm-3">{{ t('web.file-hosting.last_viewed') }}</dt>
          <dd class="col-sm-9">{{ file.last_viewed_at_formatted ?? file.last_viewed_at ?? '—' }}</dd>

          <dt class="col-sm-3">{{ t('web.file-hosting.created') }}</dt>
          <dd class="col-sm-9">{{ file.created_at_formatted ?? file.created_at ?? '—' }}</dd>

          <dt class="col-sm-3">{{ t('web.file-hosting.updated') }}</dt>
          <dd class="col-sm-9">{{ file.updated_at_formatted ?? file.updated_at ?? '—' }}</dd>
        </dl>

        <div class="mt-3 d-flex gap-2">
          <button class="btn btn-outline-primary btn-sm" @click="showRename = true; renameValue = file.name">
            <i class="bi bi-pencil me-1"></i> {{ t('web.file-hosting.rename') }}
          </button>
          <button class="btn btn-outline-secondary btn-sm" @click="showVisibilityConfirm = true">
            <i class="bi me-1" :class="file.visibility === 'anyone_with_link' ? 'bi-unlock' : 'bi-lock'"></i>
            {{ file.visibility === 'anyone_with_link' ? t('web.file-hosting.make_private') : t('web.file-hosting.share') }}
          </button>
          <button class="btn btn-outline-danger btn-sm" @click="showDeleteConfirm = true">
            <i class="bi bi-trash me-1"></i> {{ t('web.file-hosting.delete') }}
          </button>
        </div>
      </Card>
    </div>

    <div class="col-lg-4">
      <Card :title="t('web.file-hosting.microstock_title')">
        <div v-if="file.microstock" class="small">
          <p class="mb-1"><strong>{{ t('web.file-hosting.title_label') }}</strong> {{ file.microstock.title ?? '—' }}</p>
          <p class="mb-1"><strong>{{ t('web.file-hosting.status_label') }}</strong> {{ file.microstock.status ?? '—' }}</p>
          <p class="mb-1"><strong>{{ t('web.file-hosting.phase_label') }}</strong> {{ file.microstock.phase ?? '—' }}</p>
          <div v-if="file.microstock.keywords.length > 0">
            <strong>{{ t('web.file-hosting.keywords_label') }}</strong>
            <div class="d-flex flex-wrap gap-1 mt-1">
              <span v-for="kw in file.microstock.keywords" :key="kw" class="badge text-bg-light">{{ kw }}</span>
            </div>
          </div>
        </div>
        <div v-else class="text-muted small">{{ t('web.file-hosting.microstock.no_metadata') }}</div>
      </Card>
    </div>

    <ConfirmModal
      v-model="showRename"
      :title="t('web.file-hosting.rename')"
      :confirm-label="t('web.file-hosting.save')"
      @confirm="handleRename"
      @cancel="showRename = false"
    >
      <input type="text" class="form-control" v-model="renameValue" @keyup.enter="handleRename" autofocus />
    </ConfirmModal>

    <ConfirmModal
      v-model="showDeleteConfirm"
      :title="t('web.file-hosting.modal_delete')"
      :confirm-label="t('web.file-hosting.delete')"
      confirm-variant="danger"
      @confirm="handleDelete"
      @cancel="showDeleteConfirm = false"
    >
      <p>{{ t('web.file-hosting.confirm_delete_file') }}</p>
      <p class="text-muted small">{{ t('web.file-hosting.trash_hint') }}</p>
    </ConfirmModal>

    <ConfirmModal
      v-model="showVisibilityConfirm"
      :title="t('web.file-hosting.visibility.label')"
      :confirm-label="file.visibility === 'anyone_with_link' ? t('web.file-hosting.make_private') : t('web.file-hosting.share_publicly')"
      @confirm="toggleVisibility"
      @cancel="showVisibilityConfirm = false"
    >
      <p v-if="file.visibility === 'anyone_with_link'">{{ t('web.file-hosting.make_private_confirm') }}</p>
      <p v-else>{{ t('web.file-hosting.share_file_confirm') }}</p>
    </ConfirmModal>
  </div>
</template>
