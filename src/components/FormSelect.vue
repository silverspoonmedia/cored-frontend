<script setup lang="ts">
import { computed } from 'vue'
import FormField from './FormField.vue'

export interface SelectOption {
  value: string | number
  label: string
}

const props = withDefaults(defineProps<{
  name: string
  label?: string | null
  options?: SelectOption[] | Record<string, string>
  modelValue?: string | number | null
  hint?: string | null
  required?: boolean
  placeholder?: string | null
  error?: string | string[] | null
  disabled?: boolean
}>(), {
  label: null,
  options: () => [] as SelectOption[],
  modelValue: null,
  hint: null,
  required: false,
  placeholder: null,
  error: null,
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  change: [value: string]
}>()

const normalizedOptions = computed<SelectOption[]>(() => {
  if (Array.isArray(props.options)) return props.options
  return Object.entries(props.options).map(([value, label]) => ({
    value,
    label,
  }))
})

const hasError = computed(() => {
  if (!props.error) return false
  if (Array.isArray(props.error)) return props.error.length > 0
  return !!props.error
})

const selectClasses = computed(() => ({
  'form-select': true,
  'is-invalid': hasError.value,
}))

function onChange(event: Event): void {
  const target = event.target as HTMLSelectElement
  const value = target.value
  emit('update:modelValue', value)
  emit('change', value)
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
    <select
      :name="name"
      :id="name"
      :value="modelValue ?? ''"
      :required="required"
      :disabled="disabled"
      :class="selectClasses"
      @change="onChange"
    >
      <option v-if="placeholder" value="">{{ placeholder }}</option>
      <option
        v-for="opt in normalizedOptions"
        :key="opt.value"
        :value="opt.value"
      >{{ opt.label }}</option>
    </select>
  </FormField>
</template>
