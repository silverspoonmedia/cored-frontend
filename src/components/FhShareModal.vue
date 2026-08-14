<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Modal from '@/components/Modal.vue'

const VIS_LINK = 'anyone_with_link'

const open = defineModel<boolean>({ default: false })
const visibility = defineModel<string>('visibility', { default: 'private' })

defineProps<{
  shareUrl?: string | null
}>()

const emit = defineEmits<{
  save: []
}>()

const { t } = useI18n()

function onSave(): void {
  emit('save')
}
</script>

<template>
  <Modal v-model="open" :title="t('web.file-hosting.modal_share')">
    <div class="mb-3">
      <label class="form-label">{{ t('web.file-hosting.visibility.label') }}</label>
      <select v-model="visibility" class="form-select">
        <option value="private">{{ t('web.file-hosting.visibility.private') }}</option>
        <option :value="VIS_LINK">{{ t('web.file-hosting.visibility.anyone_with_link') }}</option>
      </select>
      <input
        v-if="shareUrl && visibility === VIS_LINK"
        :value="shareUrl"
        type="text"
        class="form-control mt-2"
        readonly
      />
    </div>
    <template #footer>
      <button type="button" class="btn btn-secondary btn-sm" @click="open = false">{{ t('web.file-hosting.cancel') }}</button>
      <button type="button" class="btn btn-primary btn-sm" @click="onSave">{{ t('web.file-hosting.save') }}</button>
    </template>
  </Modal>
</template>
