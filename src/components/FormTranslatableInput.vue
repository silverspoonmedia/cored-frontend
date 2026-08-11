<script setup lang="ts">
import { computed } from 'vue'

const SUPPORTED_LOCALES = ['en', 'id', 'ja'] as const

const props = withDefaults(defineProps<{
  name: string
  label?: string | null
  modelValue?: Record<string, string>
  required?: boolean
  hint?: string | null
  error?: string | string[] | null
  disabled?: boolean
}>(), {
  label: null,
  modelValue: () => ({}),
  required: false,
  hint: null,
  error: null,
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, string>]
}>()

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

function onInput(locale: string, event: Event): void {
  const target = event.target as HTMLInputElement
  const next = { ...props.modelValue, [locale]: target.value }
  emit('update:modelValue', next)
}

function valueFor(locale: string): string {
  return props.modelValue?.[locale] ?? ''
}
</script>

<template>
  <div class="mb-3" :data-form-field="name">
    <label v-if="label" class="form-label d-block">
      {{ label }}
      <span v-if="required" class="text-danger">*</span>
    </label>

    <div v-if="hint" class="form-text mb-2">{{ hint }}</div>

    <div
      v-for="locale in SUPPORTED_LOCALES"
      :key="locale"
      class="mb-2"
    >
      <label
        :for="`${name}_${locale}`"
        class="form-label small text-muted text-uppercase mb-1"
      >{{ locale }}</label>
      <input
        type="text"
        :name="`${name}[${locale}]`"
        :id="`${name}_${locale}`"
        :value="valueFor(locale)"
        :required="required"
        :disabled="disabled"
        :class="['form-control', { 'is-invalid': hasError }]"
        @input="onInput(locale, $event)"
      >
    </div>

    <div
      v-if="errorText"
      class="invalid-feedback d-block"
      :data-field-error="name"
    >
      {{ errorText }}
    </div>
  </div>
</template>
