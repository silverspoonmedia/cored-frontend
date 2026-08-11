<script lang="ts">
const DEFAULT_MAPPING: Record<string, string> = {
  active: 'success',
  pending: 'warning',
  archived: 'secondary',
  revoked: 'dark',
  inactive: 'secondary',
  verified: 'success',
  unverified: 'warning',
  enabled: 'success',
  disabled: 'danger',
  draft: 'secondary',
  published: 'success',
  suspended: 'danger',
  expired: 'dark',
}
</script>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  status?: string
  mapping?: Record<string, string>
  label?: string | null
}>(), {
  status: 'active',
  mapping: () => ({ ...DEFAULT_MAPPING }),
  label: null,
})

const color = computed<string>(() => {
  const key = props.status.toLowerCase()
  return props.mapping[key] ?? 'secondary'
})

const displayLabel = computed(() => props.label ?? props.status)
</script>

<template>
  <span class="badge" :class="`text-bg-${color}`">{{ displayLabel }}</span>
</template>
