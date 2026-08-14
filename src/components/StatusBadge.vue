<script setup lang="ts">
import { computed } from 'vue'
import {
  resolveBadgeColor,
  type BadgeColor,
} from '@/utils/statusBadge'

const props = withDefaults(defineProps<{
  status?: string | null
  mapping?: Record<string, BadgeColor>
  label?: string | null
  extraClass?: string
  fallback?: BadgeColor
}>(), {
  status: '',
  mapping: () => ({}),
  label: null,
  extraClass: '',
  fallback: 'secondary',
})

const color = computed(() => resolveBadgeColor(props.status, props.mapping, props.fallback))

const displayLabel = computed(() => {
  if (props.label != null && props.label !== '') return props.label
  const raw = (props.status ?? '').trim()
  return raw || '—'
})

const badgeClass = computed(() => {
  const classes = ['badge', `text-bg-${color.value}`]
  if (color.value === 'light') classes.push('border')
  if (props.extraClass) classes.push(props.extraClass)
  return classes
})
</script>

<template>
  <span :class="badgeClass">{{ displayLabel }}</span>
</template>
