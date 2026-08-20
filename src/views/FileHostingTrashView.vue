<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { confirmDialog } from '@/lib/swal'
import FhIcon from '@/components/FhIcon.vue'
import { useFileHosting } from '@/composables/useFileHosting'
import { useFileHostingRealtime } from '@/composables/useFileHostingRealtime'
import { useAlert } from '@/composables/useAlert'
import type { FhTrashPayload } from '@/api/types'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const fh = useFileHosting()
const { success: showSuccess, error: showError } = useAlert()
const { subscribe, unsubscribe } = useFileHostingRealtime()

const trash = ref<FhTrashPayload | null>(null)
const loading = ref(true)
const isBusy = ref(false)
const actionTarget = ref<{ type: 'folder' | 'file'; id: string; action: 'restore' | 'force-delete' } | null>(null)

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

const trashHandlers = {
  onListingChanged: () => loadTrash(),
}

onMounted(() => {
  loadTrash()
  subscribe(trashHandlers)
})

onUnmounted(() => {
  unsubscribe(trashHandlers)
})

async function openConfirm(type: 'folder' | 'file', id: string, action: 'restore' | 'force-delete'): Promise<void> {
  actionTarget.value = { type, id, action }
  const confirmed = await confirmDialog({
    title: action === 'restore' ? t('web.file-hosting.trash_restore_title') : t('web.file-hosting.trash_force_delete_title'),
    html:
      action === 'restore'
        ? `<p>${t('web.file-hosting.trash_confirm_restore')}</p>`
        : `<p>${t('web.file-hosting.trash_confirm_force_delete')}</p><p class="text-danger small">${t('web.file-hosting.trash_cannot_be_undone')}</p>`,
    confirmText: action === 'restore' ? t('web.file-hosting.trash_restore_button') : t('web.file-hosting.trash_delete_forever_button'),
    danger: action !== 'restore',
  })
  if (confirmed) {
    await handleAction()
  } else {
    actionTarget.value = null
  }
}

async function handleAction(): Promise<void> {
  if (!actionTarget.value) return
  const { type, id, action } = actionTarget.value
  isBusy.value = true
  try {
    if (type === 'folder') {
      if (action === 'restore') await fh.restoreFolder(id, ctxParams())
      else await fh.forceDeleteFolder(id, ctxParams())
    } else {
      if (action === 'restore') await fh.restoreFile(id, ctxParams())
      else await fh.forceDeleteFile(id, ctxParams())
    }
    showSuccess(action === 'restore' ? t('web.file-hosting.trash_restored') : t('web.file-hosting.trash_permanently_deleted'))
    actionTarget.value = null
    await loadTrash()
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.file-hosting.trash_action_failed'))
  } finally {
    isBusy.value = false
  }
}
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
      <button class="btn btn-outline-secondary btn-sm" type="button" @click="router.push({ name: 'file-hosting.index.view', query: route.query })">
        <i class="bi bi-arrow-left me-1"></i>{{ t('web.file-hosting.trash_back_to_files') }}
      </button>
    </div>

    <div data-fh-panel="trash">
      <div v-if="loading" class="text-center py-4">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">{{ t('ui.loading') }}</span>
        </div>
      </div>

      <div v-else class="table-responsive">
        <table class="table fh-table">
          <tbody data-fh-trash-body>
            <tr v-for="folder in (trash?.folders ?? [])" :key="'tf:' + folder.id">
              <td class="fh-table__icon-cell"><FhIcon is-folder /></td>
              <td><span class="fh-table__name-text">{{ folder.name }}</span></td>
              <td class="fh-table__type">{{ t('web.file-hosting.type_folder') }}</td>
              <td class="fh-table__size">{{ folder.deleted_at_formatted ?? folder.deleted_at ?? '' }}</td>
              <td class="fh-table__actions">
                <button type="button" class="fh-table__action-btn" :title="t('web.file-hosting.restore')" @click="openConfirm('folder', folder.id, 'restore')">
                  <i class="bi bi-arrow-counterclockwise"></i>
                </button>
                <button type="button" class="fh-table__action-btn is-danger" :title="t('web.file-hosting.trash_delete_permanently_title')" @click="openConfirm('folder', folder.id, 'force-delete')">
                  <i class="bi bi-trash"></i>
                </button>
              </td>
            </tr>
            <tr v-for="file in (trash?.files ?? [])" :key="'tfile:' + file.id">
              <td class="fh-table__icon-cell"><FhIcon :mime="file.mime" /></td>
              <td><span class="fh-table__name-text">{{ file.name }}</span></td>
              <td class="fh-table__type">{{ file.mime || t('web.file-hosting.type_file') }}</td>
              <td class="fh-table__size">{{ file.deleted_at_formatted ?? file.deleted_at ?? '' }}</td>
              <td class="fh-table__actions">
                <button type="button" class="fh-table__action-btn" :title="t('web.file-hosting.restore')" @click="openConfirm('file', file.id, 'restore')">
                  <i class="bi bi-arrow-counterclockwise"></i>
                </button>
                <button type="button" class="fh-table__action-btn is-danger" :title="t('web.file-hosting.trash_delete_permanently_title')" @click="openConfirm('file', file.id, 'force-delete')">
                  <i class="bi bi-trash"></i>
                </button>
              </td>
            </tr>
            <tr v-if="!trash || (trash.folders.length === 0 && trash.files.length === 0)">
              <td colspan="5">
                <div class="fh-empty">
                  <i class="bi bi-trash fh-empty__icon"></i>
                  <div class="fh-empty__text">{{ t('web.file-hosting.trash_empty') }}</div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
