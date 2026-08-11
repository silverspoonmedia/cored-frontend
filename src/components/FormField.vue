<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  name: string
  label?: string | null
  hint?: string | null
  required?: boolean
  error?: string | string[] | null
}>()

const errorText = computed<string | null>(() => {
  if (!props.error) return null
  if (Array.isArray(props.error)) return props.error[0] ?? null
  return props.error
})
</script>

<template>
  <div class="mb-3" :data-form-field="name">
    <label v-if="label" :for="name" class="form-label">
      {{ label }}
      <span v-if="required" class="text-danger">*</span>
    </label>

    <slot />

    <div
      v-if="errorText"
      class="invalid-feedback d-block"
      :data-field-error="name"
    >
      {{ errorText }}
    </div>

    <small v-if="hint" class="form-text text-muted">{{ hint }}</small>
  </div>
</template>
