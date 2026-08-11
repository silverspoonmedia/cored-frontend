<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Card from '@/components/Card.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import { useFileHosting } from '@/composables/useFileHosting'
import { useAlert } from '@/composables/useAlert'
import type { HostedFile } from '@/api/types'

const route = useRoute()
const router = useRouter()
const fh = useFileHosting()
const { success: showSuccess, error: showError } = useAlert()

const file = ref<HostedFile | null>(null)
const loading = ref(true)

const showRename = ref(false)
const renameValue = ref('')
const showDeleteConfirm = ref(false)
const showVisibilityConfirm = ref(false)

onMounted(async () => {
  loading.value = true
  try {
    file.value = await fh.fetchFile(route.params.id as string)
  } catch (e) {
    showError(e instanceof Error ? e.message : 'Failed to load file')
  } finally {
    loading.value = false
  }
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
  if (visibility === 'anyone_with_link') return 'Public'
  if (visibility === 'workspace') return 'Workspace'
  return 'Private'
}

function copyShareUrl(): void {
  if (file.value?.share_url) {
    navigator.clipboard.writeText(file.value.share_url).then(() => showSuccess('Share URL copied.'))
  }
}

async function handleRename(): Promise<void> {
  if (!file.value || !renameValue.value.trim()) return
  try {
    file.value = await fh.renameFile(file.value.id, renameValue.value.trim(), ctxParams())
    showSuccess('Renamed.')
    showRename.value = false
  } catch (e) {
    showError(e instanceof Error ? e.message : 'Failed to rename')
  }
}

async function handleDelete(): Promise<void> {
  if (!file.value) return
  try {
    await fh.deleteFile(file.value.id, ctxParams())
    showSuccess('Deleted.')
    router.push({ name: 'file-hosting.index.view', query: route.query })
  } catch (e) {
    showError(e instanceof Error ? e.message : 'Failed to delete')
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
      showSuccess('Visibility updated.')
    }
    showVisibilityConfirm.value = false
  } catch (e) {
    showError(e instanceof Error ? e.message : 'Failed to update visibility')
  }
}
</script>

<template>
  <div v-if="loading" class="text-center py-4">
    <div class="spinner-border text-primary" role="status">
      <span class="visually-hidden">Loading…</span>
    </div>
  </div>

  <div v-else-if="file" class="row g-3">
    <div class="col-lg-8">
      <Card :title="file.name">
        <template #actions>
          <button class="btn btn-outline-secondary btn-sm" @click="router.push({ name: 'file-hosting.index.view', query: route.query })">
            <i class="bi bi-arrow-left me-1"></i> Back
          </button>
        </template>

        <div class="d-flex align-items-center gap-3 mb-3">
          <i class="bi fs-1" :class="fileIcon(file.mime)"></i>
          <div>
            <h4 class="mb-0">{{ file.name }}</h4>
            <div class="text-muted small">{{ file.mime }} · {{ file.size_human ?? file.size }}</div>
          </div>
          <span v-if="file.is_hash_blocked" class="badge text-bg-danger">Hash Blocked</span>
          <span class="badge" :class="visibilityBadge(file.visibility)">{{ visibilityLabel(file.visibility) }}</span>
        </div>

        <div v-if="file.share_url" class="mb-3">
          <div class="input-group input-group-sm">
            <input type="text" class="form-control" :value="file.share_url" readonly />
            <button class="btn btn-outline-secondary" @click="copyShareUrl">Copy</button>
          </div>
        </div>

        <dl class="row mb-0">
          <dt class="col-sm-3">Size</dt>
          <dd class="col-sm-9">{{ file.size_human ?? file.size }}</dd>

          <dt class="col-sm-3">MIME Type</dt>
          <dd class="col-sm-9">{{ file.mime }}</dd>

          <dt class="col-sm-3">Checksum</dt>
          <dd class="col-sm-9"><code class="small text-break">{{ file.checksum ?? '—' }}</code></dd>

          <dt class="col-sm-3">Disk</dt>
          <dd class="col-sm-9">{{ file.disk }} ({{ file.region }})</dd>

          <dt class="col-sm-3">Download Count</dt>
          <dd class="col-sm-9">{{ file.download_count }}</dd>

          <dt class="col-sm-3">View Count</dt>
          <dd class="col-sm-9">{{ file.view_count }}</dd>

          <dt class="col-sm-3">Last Downloaded</dt>
          <dd class="col-sm-9">{{ file.last_downloaded_at_formatted ?? file.last_downloaded_at ?? '—' }}</dd>

          <dt class="col-sm-3">Last Viewed</dt>
          <dd class="col-sm-9">{{ file.last_viewed_at_formatted ?? file.last_viewed_at ?? '—' }}</dd>

          <dt class="col-sm-3">Created At</dt>
          <dd class="col-sm-9">{{ file.created_at_formatted ?? file.created_at ?? '—' }}</dd>

          <dt class="col-sm-3">Updated At</dt>
          <dd class="col-sm-9">{{ file.updated_at_formatted ?? file.updated_at ?? '—' }}</dd>
        </dl>

        <div class="mt-3 d-flex gap-2">
          <button class="btn btn-outline-primary btn-sm" @click="showRename = true; renameValue = file.name">
            <i class="bi bi-pencil me-1"></i> Rename
          </button>
          <button class="btn btn-outline-secondary btn-sm" @click="showVisibilityConfirm = true">
            <i class="bi me-1" :class="file.visibility === 'anyone_with_link' ? 'bi-unlock' : 'bi-lock'"></i>
            {{ file.visibility === 'anyone_with_link' ? 'Make Private' : 'Share' }}
          </button>
          <button class="btn btn-outline-danger btn-sm" @click="showDeleteConfirm = true">
            <i class="bi bi-trash me-1"></i> Delete
          </button>
        </div>
      </Card>
    </div>

    <div class="col-lg-4">
      <Card title="Microstock">
        <div v-if="file.microstock" class="small">
          <p class="mb-1"><strong>Title:</strong> {{ file.microstock.title ?? '—' }}</p>
          <p class="mb-1"><strong>Status:</strong> {{ file.microstock.status ?? '—' }}</p>
          <p class="mb-1"><strong>Phase:</strong> {{ file.microstock.phase ?? '—' }}</p>
          <div v-if="file.microstock.keywords.length > 0">
            <strong>Keywords:</strong>
            <div class="d-flex flex-wrap gap-1 mt-1">
              <span v-for="kw in file.microstock.keywords" :key="kw" class="badge text-bg-light">{{ kw }}</span>
            </div>
          </div>
        </div>
        <div v-else class="text-muted small">No microstock metadata.</div>
      </Card>
    </div>

    <ConfirmModal
      :show="showRename"
      title="Rename File"
      confirm-text="Save"
      :confirm-disabled="!renameValue.trim()"
      @confirm="handleRename"
      @cancel="showRename = false"
    >
      <input type="text" class="form-control" v-model="renameValue" @keyup.enter="handleRename" autofocus />
    </ConfirmModal>

    <ConfirmModal
      :show="showDeleteConfirm"
      title="Delete File"
      confirm-text="Delete"
      confirm-class="btn-danger"
      @confirm="handleDelete"
      @cancel="showDeleteConfirm = false"
    >
      <p>Are you sure you want to delete this file?</p>
      <p class="text-muted small">It will be moved to trash.</p>
    </ConfirmModal>

    <ConfirmModal
      :show="showVisibilityConfirm"
      title="Change Visibility"
      :confirm-text="file.visibility === 'anyone_with_link' ? 'Make Private' : 'Share Publicly'"
      @confirm="toggleVisibility"
      @cancel="showVisibilityConfirm = false"
    >
      <p v-if="file.visibility === 'anyone_with_link'">Make this file private?</p>
      <p v-else>Share this file publicly? Anyone with the link can view it.</p>
    </ConfirmModal>
  </div>
</template>
