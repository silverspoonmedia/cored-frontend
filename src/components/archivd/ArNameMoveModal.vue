<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

/**
 * Name / move modal for Archivd (create folder, rename, move).
 * Extracted from ArchivdView. Parent owns visibility + submission.
 */
export type ArNameMoveModal =
  | { type: 'folder'; name: string }
  | { type: 'rename'; entity: 'folder' | 'file'; id: string; name: string }
  | { type: 'move'; keys: string[]; target: string }

const props = defineProps<{
  modal: ArNameMoveModal
  busy: boolean
  moveTargets: Array<{ id: string; name: string }>
}>()

const emit = defineEmits<{
  submit: []
  close: []
}>()

const { t } = useI18n()

const title = computed(() => {
  if (props.modal.type === 'folder') return t('web.archivd.new_folder')
  if (props.modal.type === 'rename') return t('web.archivd.rename')
  return t('web.archivd.modal_move')
})

function setName(v: string): void {
  if (props.modal.type === 'folder' || props.modal.type === 'rename') props.modal.name = v
}

function setTarget(v: string): void {
  if (props.modal.type === 'move') props.modal.target = v
}

function onEnter(): void {
  if (props.modal.type !== 'move') emit('submit')
}
</script>

<template>
  <div class="modal fade show d-block" tabindex="-1" style="background:rgba(0,0,0,.4)" @click.self="emit('close')">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">{{ title }}</h5>
          <button type="button" class="btn-close" @click="emit('close')"></button>
        </div>
        <div class="modal-body">
          <div v-if="modal.type === 'folder' || modal.type === 'rename'">
            <label class="form-label">{{ t('web.archivd.name_label') }}</label>
            <input
              :value="modal.name"
              type="text"
              class="form-control"
              autofocus
              @input="setName(($event.target as HTMLInputElement).value)"
              @keyup.enter="onEnter"
            />
          </div>
          <div v-else-if="modal.type === 'move'">
            <label class="form-label">{{ t('web.archivd.target_folder_label') }}</label>
            <input
              :value="modal.target"
              type="text"
              class="form-control mb-2"
              :placeholder="t('web.archivd.target_folder_placeholder')"
              @input="setTarget(($event.target as HTMLInputElement).value)"
            />
            <div class="list-group list-group-flush">
              <button type="button" class="list-group-item list-group-item-action" @click="setTarget('')">{{ t('web.archivd.root') }}</button>
              <button
                v-for="f in moveTargets"
                :key="'mv:' + f.id"
                type="button"
                class="list-group-item list-group-item-action"
                @click="setTarget(f.id)"
              >
                <i class="bi bi-folder-fill me-1"></i>{{ f.name }}
              </button>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary btn-sm" @click="emit('close')">{{ t('web.archivd.cancel') }}</button>
          <button type="button" class="btn btn-primary btn-sm" :disabled="busy" @click="emit('submit')">{{ t('web.archivd.save') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>
