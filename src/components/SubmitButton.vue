<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  label?: string
  loading?: boolean
  variant?: string
  size?: 'sm' | 'lg' | null
  disabled?: boolean
  type?: 'submit' | 'button'
  icon?: string | null
}>(), {
  label: 'Save',
  loading: false,
  variant: 'primary',
  size: null,
  disabled: false,
  type: 'submit',
  icon: null,
})

const buttonClasses = computed(() => {
  const classes: Record<string, boolean> = {
    btn: true,
    [`btn-${props.variant}`]: true,
    disabled: props.disabled || props.loading,
  }
  if (props.size) classes[`btn-${props.size}`] = true
  return classes
})
</script>

<template>
  <button
    :type="type"
    :class="buttonClasses"
    :disabled="disabled || loading"
  >
    <span
      v-if="loading"
      class="spinner-border spinner-border-sm me-1"
      role="status"
      aria-hidden="true"
    ></span>
    <i v-if="icon && !loading" class="bi" :class="icon" aria-hidden="true"></i>
    <span v-if="label">{{ label }}</span>
  </button>
</template>
