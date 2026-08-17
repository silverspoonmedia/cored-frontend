<script setup lang="ts">
import { useSlots } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from './Modal.vue'

const slots = useSlots()
const { t } = useI18n()

const props = withDefaults(defineProps<{
  modelValue?: boolean
  title?: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  confirmVariant?: string
}>(), {
  modelValue: false,
  title: '',
  message: '',
  confirmLabel: '',
  cancelLabel: '',
  confirmVariant: 'danger',
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
  cancel: []
}>()

function onConfirm(): void {
  emit('confirm')
  emit('update:modelValue', false)
}

function onCancel(): void {
  emit('cancel')
  emit('update:modelValue', false)
}
</script>

<template>
  <Modal
    :model-value="modelValue"
    :title="title || t('ui.dialog.confirm_title')"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <p v-if="message || !slots.default" class="mb-0">{{ message || t('ui.dialog.confirm_message') }}</p>
    <slot v-else />

    <template #footer>
      <button
        type="button"
        class="btn btn-outline-secondary"
        @click="onCancel"
      >{{ cancelLabel || t('ui.actions.cancel') }}</button>
      <button
        type="button"
        class="btn"
        :class="`btn-${confirmVariant}`"
        @click="onConfirm"
      >{{ confirmLabel || t('ui.dialog.confirm') }}</button>
    </template>
  </Modal>
</template>
