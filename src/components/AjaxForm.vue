<script setup lang="ts">
import { watch } from 'vue'
import { useForm } from '@/composables/useForm'
import { useAlert } from '@/composables/useAlert'
import type { ApiError } from '@/api/types'

type Method = 'POST' | 'PUT' | 'PATCH' | 'DELETE'

const props = withDefaults(defineProps<{
  action: string
  method?: Method
  modelValue?: Record<string, unknown>
  showAlert?: boolean
  successMessage?: string | null
}>(), {
  method: 'POST',
  modelValue: () => ({}),
  showAlert: true,
  successMessage: null,
})

const emit = defineEmits<{
  success: [data: unknown]
  error: [error: ApiError | Error]
}>()

const { submitting, errors, error, submit, resetErrors, fieldError } = useForm(props.action, props.method)
const { success: showSuccess, error: showError } = useAlert()

async function handleSubmit(): Promise<void> {
  try {
    const data = await submit(props.modelValue)
    if (props.showAlert && props.successMessage) {
      showSuccess(props.successMessage)
    }
    emit('success', data)
  } catch (e) {
    if (props.showAlert && error.value) {
      showError(error.value)
    }
    emit('error', e as ApiError | Error)
  }
}

function handleReset(): void {
  resetErrors()
}

watch(() => props.action, () => resetErrors())
</script>

<template>
  <form
    novalidate
    @submit.prevent="handleSubmit"
    @reset.prevent="handleReset"
  >
    <slot
      :submitting="submitting"
      :errors="errors"
      :error="error"
      :field-error="fieldError"
      :submit="handleSubmit"
    />
  </form>
</template>
