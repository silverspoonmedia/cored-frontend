<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from '@/components/Modal.vue'
import { safeHttpUrl } from '@/utils/safeUrl'

const VIS_LINK = 'anyone_with_link'

const open = defineModel<boolean>({ default: false })
const visibility = defineModel<string>('visibility', { default: 'private' })

const emit = defineEmits<{
  save: []
}>()

const { t } = useI18n()
const props = defineProps<{
  shareUrl?: string | null
}>()
const safeShareUrl = computed(() => safeHttpUrl(props.shareUrl))

function onSave(): void {
  emit('save')
}
</script>

<template>
  <Modal v-model="open" :title="t('web.archivd.modal_share')">
    <div class="mb-3">
      <label class="form-label">{{ t('web.archivd.visibility.label') }}</label>
      <select v-model="visibility" class="form-select">
        <option value="private">{{ t('web.archivd.visibility.private') }}</option>
        <option :value="VIS_LINK">{{ t('web.archivd.visibility.anyone_with_link') }}</option>
      </select>
      <input
        v-if="safeShareUrl && visibility === VIS_LINK"
        :value="safeShareUrl"
        type="text"
        class="form-control mt-2"
        readonly
      />
    </div>
    <template #footer>
      <button type="button" class="btn btn-secondary btn-sm" @click="open = false">{{ t('web.archivd.cancel') }}</button>
      <button type="button" class="btn btn-primary btn-sm" @click="onSave">{{ t('web.archivd.save') }}</button>
    </template>
  </Modal>
</template>
