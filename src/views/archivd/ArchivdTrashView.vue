<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { confirmDialog } from '@/lib/swal'
import ErrorState from '@/components/ErrorState.vue'
import SkeletonBlock from '@/components/SkeletonBlock.vue'
import ArIcon from '@/components/archivd/ArIcon.vue'
import { useArchivd } from '@/composables/archivd/useArchivd'
import { useArchivdRealtime } from '@/composables/archivd/useArchivdRealtime'
import { useAlert } from '@/composables/useAlert'
import type { ArTrashPayload } from '@/api/types'

const route = useRoute()
const { t } = useI18n()
const ar = useArchivd()
const { success: showSuccess, error: showError } = useAlert()
const { subscribe, unsubscribe } = useArchivdRealtime()

const trash = ref<ArTrashPayload | null>(null)
const loading = ref(true)
const loadError = ref<string | null>(null)
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
  loadError.value = null
  try {
    trash.value = await ar.fetchTrash(ctxParams())
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : t('web.archivd.trash_failed_load')
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
    title: action === 'restore' ? t('web.archivd.trash_restore_title') : t('web.archivd.trash_force_delete_title'),
    html:
      action === 'restore'
        ? `<p>${t('web.archivd.trash_confirm_restore')}</p>`
        : `<p>${t('web.archivd.trash_confirm_force_delete')}</p><p class="text-danger small">${t('web.archivd.trash_cannot_be_undone')}</p>`,
    confirmText: action === 'restore' ? t('web.archivd.trash_restore_button') : t('web.archivd.trash_delete_forever_button'),
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
      if (action === 'restore') await ar.restoreFolder(id, ctxParams())
      else await ar.forceDeleteFolder(id, ctxParams())
    } else {
      if (action === 'restore') await ar.restoreFile(id, ctxParams())
      else await ar.forceDeleteFile(id, ctxParams())
    }
    showSuccess(action === 'restore' ? t('web.archivd.trash_restored') : t('web.archivd.trash_permanently_deleted'))
    actionTarget.value = null
    await loadTrash()
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.archivd.trash_action_failed'))
  } finally {
    isBusy.value = false
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

    <div class="ar-toolbar">
      <router-link class="btn btn-outline-secondary btn-sm" :to="{ name: 'archivd.index.view', query: route.query }">
        <i class="bi bi-arrow-left me-1"></i>{{ t('web.archivd.trash_back_to_files') }}
      </router-link>
    </div>

    <div data-ar-panel="trash">
      <div v-if="loading" class="py-2">
        <div v-for="i in 5" :key="i" class="d-flex align-items-center gap-3 py-2 border-bottom">
          <SkeletonBlock variant="avatar" width="1.5rem" />
          <SkeletonBlock variant="line" :lines="1" width="45%" class="mb-0" />
          <SkeletonBlock variant="line" :lines="1" width="6rem" class="ms-auto mb-0" />
        </div>
      </div>

      <ErrorState v-else-if="loadError" :message="loadError" @retry="loadTrash" />

      <div v-else class="table-responsive">
        <table class="table ar-table">
          <tbody data-ar-trash-body>
            <tr v-for="folder in (trash?.folders ?? [])" :key="'tf:' + folder.id">
              <td class="ar-table__icon-cell"><ArIcon is-folder /></td>
              <td><span class="ar-table__name-text">{{ folder.name }}</span></td>
              <td class="ar-table__type">{{ t('web.archivd.type_folder') }}</td>
              <td class="ar-table__size">{{ folder.deleted_at_formatted ?? folder.deleted_at ?? '' }}</td>
              <td class="ar-table__actions">
                <button type="button" class="ar-table__action-btn" :title="t('web.archivd.restore')" @click="openConfirm('folder', folder.id, 'restore')">
                  <i class="bi bi-arrow-counterclockwise"></i>
                </button>
                <button type="button" class="ar-table__action-btn is-danger" :title="t('web.archivd.trash_delete_permanently_title')" @click="openConfirm('folder', folder.id, 'force-delete')">
                  <i class="bi bi-trash"></i>
                </button>
              </td>
            </tr>
            <tr v-for="file in (trash?.files ?? [])" :key="'tfile:' + file.id">
              <td class="ar-table__icon-cell"><ArIcon :mime="file.mime" /></td>
              <td><span class="ar-table__name-text">{{ file.name }}</span></td>
              <td class="ar-table__type">{{ file.mime || t('web.archivd.type_file') }}</td>
              <td class="ar-table__size">{{ file.deleted_at_formatted ?? file.deleted_at ?? '' }}</td>
              <td class="ar-table__actions">
                <button type="button" class="ar-table__action-btn" :title="t('web.archivd.restore')" @click="openConfirm('file', file.id, 'restore')">
                  <i class="bi bi-arrow-counterclockwise"></i>
                </button>
                <button type="button" class="ar-table__action-btn is-danger" :title="t('web.archivd.trash_delete_permanently_title')" @click="openConfirm('file', file.id, 'force-delete')">
                  <i class="bi bi-trash"></i>
                </button>
              </td>
            </tr>
            <tr v-if="!trash || (trash.folders.length === 0 && trash.files.length === 0)">
              <td colspan="5">
                <div class="ar-empty">
                  <i class="bi bi-trash ar-empty__icon"></i>
                  <div class="ar-empty__text">{{ t('web.archivd.trash_empty') }}</div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
