<script setup lang="ts">
import { useI18n } from 'vue-i18n'

export interface RowAction {
  key: string
  icon: string
  label: string
  variant?: string
  disabled?: boolean
  onClick: () => void
}

const props = defineProps<{
  actions: RowAction[]
}>()

const { t } = useI18n()

function iconClass(icon: string): string {
  return `bi bi-${icon.replace(/^bi-/, '')}`
}
</script>

<template>
  <div class="btn-group btn-group-sm" role="group" :aria-label="t('ui.labels.actions')">
    <button
      v-for="action in props.actions"
      :key="action.key"
      type="button"
      :class="`btn btn-outline-${action.variant ?? 'secondary'} btn-sm`"
      :aria-label="action.label"
      :title="action.label"
      :disabled="action.disabled"
      @click.stop="action.onClick()"
    >
      <i :class="iconClass(action.icon)" aria-hidden="true"></i>
    </button>
  </div>
</template>
