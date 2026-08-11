<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import { useFileHosting } from '@/composables/useFileHosting'
import { useAlert } from '@/composables/useAlert'
import type { FhTrashPayload } from '@/api/types'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
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
    showError(e instanceof Error ? e.message : t('web.file-hosting.trash_failed_load'))
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
    showSuccess(action === 'restore' ? t('web.file-hosting.trash_restored') : t('web.file-hosting.trash_permanently_deleted'))
    showConfirm.value = false
    actionTarget.value = null
    await loadTrash()
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.file-hosting.trash_action_failed'))
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
  <Card :title="t('web.file-hosting.trash_title')">
    <template #actions>
      <button class="btn btn-outline-secondary btn-sm" @click="router.push({ name: 'file-hosting.index.view', query: route.query })">
        <i class="bi bi-arrow-left me-1"></i> {{ t('web.file-hosting.trash_back_to_files') }}
      </button>
    </template>

    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">{{ t('ui.loading') }}</span>
      </div>
    </div>

    <div v-else-if="!trash || (trash.folders.length === 0 && trash.files.length === 0)" class="text-muted text-center py-4">
      <i class="bi bi-trash fs-2 d-block mb-2"></i>
      {{ t('web.file-hosting.trash_empty') }}
    </div>

    <div v-else>
      <div v-if="trash.folders.length > 0" class="mb-4">
        <h6 class="text-muted">{{ t('web.file-hosting.type_folder') }} ({{ trash.folders.length }})</h6>
        <div class="table-responsive">
          <table class="table table-sm table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>{{ t('web.file-hosting.columns.name') }}</th>
                <th>{{ t('web.file-hosting.columns.deleted_at') }}</th>
                <th class="text-end">{{ t('web.file-hosting.columns.actions') }}</th>
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
                    <button class="btn btn-outline-success" @click="openConfirm('folder', folder.id, 'restore')" :title="t('web.file-hosting.restore')">
                      <i class="bi bi-arrow-counterclockwise"></i>
                    </button>
                    <button class="btn btn-outline-danger" @click="openConfirm('folder', folder.id, 'force-delete')" :title="t('web.file-hosting.trash_delete_permanently_title')">
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
        <h6 class="text-muted">{{ t('web.file-hosting.type_file') }} ({{ trash.files.length }})</h6>
        <div class="table-responsive">
          <table class="table table-sm table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>{{ t('web.file-hosting.columns.name') }}</th>
                <th>{{ t('web.file-hosting.columns.size') }}</th>
                <th>{{ t('web.file-hosting.columns.deleted_at') }}</th>
                <th class="text-end">{{ t('web.file-hosting.columns.actions') }}</th>
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
                    <button class="btn btn-outline-success" @click="openConfirm('file', file.id, 'restore')" :title="t('web.file-hosting.restore')">
                      <i class="bi bi-arrow-counterclockwise"></i>
                    </button>
                    <button class="btn btn-outline-danger" @click="openConfirm('file', file.id, 'force-delete')" :title="t('web.file-hosting.trash_delete_permanently_title')">
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
      v-model="showConfirm"
      :title="actionTarget?.action === 'restore' ? t('web.file-hosting.trash_restore_title') : t('web.file-hosting.trash_force_delete_title')"
      :confirm-label="actionTarget?.action === 'restore' ? t('web.file-hosting.trash_restore_button') : t('web.file-hosting.trash_delete_forever_button')"
      :confirm-variant="actionTarget?.action === 'restore' ? 'success' : 'danger'"
      @confirm="handleAction"
      @cancel="showConfirm = false; actionTarget = null"
    >
      <p v-if="actionTarget?.action === 'restore'">{{ t('web.file-hosting.trash_confirm_restore') }}</p>
      <div v-else>
        <p>{{ t('web.file-hosting.trash_confirm_force_delete') }}</p>
        <p class="text-danger small">{{ t('web.file-hosting.trash_cannot_be_undone') }}</p>
      </div>
    </ConfirmModal>
  </Card>
</template>
