<script setup lang="ts">
import { computed } from 'vue'
import FormField from './FormField.vue'

const props = withDefaults(defineProps<{
  name: string
  label?: string | null
  modelValue?: string
  hint?: string | null
  required?: boolean
  rows?: number
  placeholder?: string
  error?: string | string[] | null
  disabled?: boolean
  readonly?: boolean
}>(), {
  modelValue: '',
  hint: null,
  required: false,
  rows: 3,
  placeholder: undefined,
  error: null,
  disabled: false,
  readonly: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  blur: [event: FocusEvent]
}>()

const hasError = computed(() => {
  if (!props.error) return false
  if (Array.isArray(props.error)) return props.error.length > 0
  return !!props.error
})

const textareaClasses = computed(() => ({
  'form-control': true,
  'is-invalid': hasError.value,
}))

function onInput(event: Event): void {
  const target = event.target as HTMLTextAreaElement
  emit('update:modelValue', target.value)
}
</script>

<template>
  <FormField
    :name="name"
    :label="label"
    :hint="hint"
    :required="required"
    :error="error"
  >
    <textarea
      :name="name"
      :id="name"
      :value="modelValue"
      :rows="rows"
      :placeholder="placeholder"
      :required="required"
      :disabled="disabled"
      :readonly="readonly"
      :class="textareaClasses"
      @input="onInput"
      @blur="emit('blur', $event)"
    ></textarea>
  </FormField>
</template>
