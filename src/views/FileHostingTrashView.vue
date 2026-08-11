<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Card from '@/components/Card.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import { useFileHosting } from '@/composables/useFileHosting'
import { useAlert } from '@/composables/useAlert'
import type { FhTrashPayload } from '@/api/types'

const route = useRoute()
const router = useRouter()
const fh = useFileHosting()
const { success: showSuccess, error: showError } = useAlert()

const trash = ref<FhTrashPayload | null>(null)
const loading = ref(true)
const actionTarget = ref<{ type: 'folder' | 'file'; id: string; action: 'restore' | 'force-delete' } | null>(null)
const showConfirm = ref(false)

function ctxParams(): Record<string, unknown> {
  const params: Record<string, unknown> = {}
  const ws = route.query.workspace_id
  const uid = route.query.user_id
  if (ws) params.workspace_id = ws
  if (uid) params.user_id = uid
  return params
}

async function loadTrash(): Promise<void> {
  loading.value = true
  try {
    trash.value = await fh.fetchTrash(ctxParams())
  } catch (e) {
    showError(e instanceof Error ? e.message : 'Failed to load trash')
  } finally {
    loading.value = false
  }
}

onMounted(loadTrash)

function openConfirm(type: 'folder' | 'file', id: string, action: 'restore' | 'force-delete'): void {
  actionTarget.value = { type, id, action }
  showConfirm.value = true
}

async function handleAction(): Promise<void> {
  if (!actionTarget.value) return
  const { type, id, action } = actionTarget.value
  try {
    if (type === 'folder') {
      if (action === 'restore') await fh.restoreFolder(id, ctxParams())
      else await fh.forceDeleteFolder(id, ctxParams())
    } else {
      if (action === 'restore') await fh.restoreFile(id, ctxParams())
      else await fh.forceDeleteFile(id, ctxParams())
    }
    showSuccess(action === 'restore' ? 'Restored.' : 'Permanently deleted.')
    showConfirm.value = false
    actionTarget.value = null
    await loadTrash()
  } catch (e) {
    showError(e instanceof Error ? e.message : 'Action failed')
  }
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
</script>

<template>
  <Card title="Trash">
    <template #actions>
      <button class="btn btn-outline-secondary btn-sm" @click="router.push({ name: 'file-hosting.index.view', query: route.query })">
        <i class="bi bi-arrow-left me-1"></i> Back to Files
      </button>
    </template>

    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading…</span>
      </div>
    </div>

    <div v-else-if="!trash || (trash.folders.length === 0 && trash.files.length === 0)" class="text-muted text-center py-4">
      <i class="bi bi-trash fs-2 d-block mb-2"></i>
      Trash is empty.
    </div>

    <div v-else>
      <div v-if="trash.folders.length > 0" class="mb-4">
        <h6 class="text-muted">Folders ({{ trash.folders.length }})</h6>
        <div class="table-responsive">
          <table class="table table-sm table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Name</th>
                <th>Deleted At</th>
                <th class="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="folder in trash.folders" :key="folder.id">
                <td>
                  <i class="bi bi-folder-fill text-warning me-1"></i>
                  {{ folder.name }}
                </td>
                <td class="small">{{ folder.deleted_at_formatted ?? folder.deleted_at ?? '—' }}</td>
                <td class="text-end">
                  <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-success" @click="openConfirm('folder', folder.id, 'restore')" title="Restore">
                      <i class="bi bi-arrow-counterclockwise"></i>
                    </button>
                    <button class="btn btn-outline-danger" @click="openConfirm('folder', folder.id, 'force-delete')" title="Delete Permanently">
                      <i class="bi bi-x-circle"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-if="trash.files.length > 0">
        <h6 class="text-muted">Files ({{ trash.files.length }})</h6>
        <div class="table-responsive">
          <table class="table table-sm table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Name</th>
                <th>Size</th>
                <th>Deleted At</th>
                <th class="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="file in trash.files" :key="file.id">
                <td>
                  <i class="bi me-1" :class="fileIcon(file.mime)"></i>
                  {{ file.name }}
                </td>
                <td class="small">{{ file.size_human ?? file.size ?? '—' }}</td>
                <td class="small">{{ file.deleted_at_formatted ?? file.deleted_at ?? '—' }}</td>
                <td class="text-end">
                  <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-success" @click="openConfirm('file', file.id, 'restore')" title="Restore">
                      <i class="bi bi-arrow-counterclockwise"></i>
                    </button>
                    <button class="btn btn-outline-danger" @click="openConfirm('file', file.id, 'force-delete')" title="Delete Permanently">
                      <i class="bi bi-x-circle"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <ConfirmModal
      :show="showConfirm"
      :title="actionTarget?.action === 'restore' ? 'Restore Item' : 'Delete Permanently'"
      :confirm-text="actionTarget?.action === 'restore' ? 'Restore' : 'Delete Forever'"
      :confirm-class="actionTarget?.action === 'restore' ? 'btn-success' : 'btn-danger'"
      @confirm="handleAction"
      @cancel="showConfirm = false; actionTarget = null"
    >
      <p v-if="actionTarget?.action === 'restore'">Restore this item back to its original location?</p>
      <div v-else>
        <p>Permanently delete this item?</p>
        <p class="text-danger small">This action cannot be undone.</p>
      </div>
    </ConfirmModal>
  </Card>
</template>
