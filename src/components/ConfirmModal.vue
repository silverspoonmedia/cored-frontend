<script setup lang="ts">
import Modal from './Modal.vue'

const props = withDefaults(defineProps<{
  modelValue?: boolean
  title?: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  confirmVariant?: string
}>(), {
  modelValue: false,
  title: 'Confirm',
  message: 'Are you sure?',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
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
    :title="title"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <p class="mb-0">{{ message }}</p>

    <template #footer>
      <button
        type="button"
        class="btn btn-outline-secondary"
        @click="onCancel"
      >{{ cancelLabel }}</button>
      <button
        type="button"
        class="btn"
        :class="`btn-${confirmVariant}`"
        @click="onConfirm"
      >{{ confirmLabel }}</button>
    </template>
  </Modal>
</template>
