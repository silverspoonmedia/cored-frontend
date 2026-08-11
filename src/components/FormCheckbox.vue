<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  name: string
  label: string
  modelValue?: boolean
  hint?: string | null
  error?: string | string[] | null
  switch?: boolean
  disabled?: boolean
}>(), {
  modelValue: false,
  hint: null,
  error: null,
  switch: false,
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const wrapperClass = computed(() =>
  props.switch ? 'form-check form-switch' : 'form-check',
)

const hasError = computed(() => {
  if (!props.error) return false
  if (Array.isArray(props.error)) return props.error.length > 0
  return !!props.error
})

const errorText = computed<string | null>(() => {
  if (!props.error) return null
  if (Array.isArray(props.error)) return props.error[0] ?? null
  return props.error
})

const inputClasses = computed(() => ({
  'form-check-input': true,
  'is-invalid': hasError.value,
}))

function onChange(event: Event): void {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.checked)
}
</script>

<template>
  <div class="mb-3" :data-form-field="name">
    <div :class="wrapperClass">
      <input
        type="checkbox"
        :name="name"
        :id="name"
        :checked="modelValue"
        :disabled="disabled"
        :class="inputClasses"
        @change="onChange"
      />
      <label class="form-check-label" :for="name">{{ label }}</label>
    </div>

    <div
      v-if="errorText"
      class="invalid-feedback d-block"
      :data-field-error="name"
    >
      {{ errorText }}
    </div>

    <small v-if="hint" class="form-text text-muted d-block">{{ hint }}</small>
  </div>
</template>
