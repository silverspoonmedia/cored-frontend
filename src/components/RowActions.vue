<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { RouteLocationRaw } from 'vue-router'

export interface RowAction {
  key: string
  icon: string
  label: string
  variant?: string
  disabled?: boolean
  to?: RouteLocationRaw
  onClick?: () => void
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
    <template v-for="action in props.actions" :key="action.key">
      <router-link
        v-if="action.to"
        :to="action.to"
        class="btn btn-outline-secondary btn-sm"
        :class="[`btn-outline-${action.variant ?? 'secondary'}`, { disabled: action.disabled }]"
        :aria-label="action.label"
        :title="action.label"
        :aria-disabled="action.disabled ? 'true' : undefined"
        :tabindex="action.disabled ? -1 : undefined"
        @click.stop
      >
        <i :class="iconClass(action.icon)" aria-hidden="true"></i>
      </router-link>
      <button
        v-else
        type="button"
        class="btn btn-sm"
        :class="`btn-outline-${action.variant ?? 'secondary'}`"
        :aria-label="action.label"
        :title="action.label"
        :disabled="action.disabled"
        @click.stop="action.onClick?.()"
      >
        <i :class="iconClass(action.icon)" aria-hidden="true"></i>
      </button>
    </template>
  </div>
</template>
