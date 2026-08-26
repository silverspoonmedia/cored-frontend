<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(defineProps<{
  variant?: 'line' | 'block' | 'avatar' | 'button'
  lines?: number
  width?: string
  height?: string
  animation?: 'wave' | 'glow' | 'none'
}>(), {
  variant: 'line',
  lines: 1,
  width: '',
  height: '',
  animation: 'wave',
})

const { t } = useI18n()

const animClass = computed(() => {
  if (props.animation === 'wave') return 'placeholder-wave'
  if (props.animation === 'glow') return 'placeholder-glow'
  return ''
})

const baseStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.width) style.width = props.width
  if (props.height) style.height = props.height
  return style
})

// Vary line widths so multi-line skeletons read as paragraphs, not a wall of identical bars.
const LINE_WIDTHS = ['col-12', 'col-11', 'col-9', 'col-10', 'col-7']
</script>

<template>
  <div :class="animClass" role="status" :aria-label="t('ui.loading')">
    <template v-if="variant === 'line'">
      <span
        v-for="i in lines"
        :key="i"
        class="placeholder d-block mb-2"
        :class="lines > 1 ? LINE_WIDTHS[(i - 1) % LINE_WIDTHS.length] : 'col-12'"
        :style="baseStyle"
      ></span>
    </template>
    <span
      v-else-if="variant === 'block'"
      class="placeholder d-block col-12"
      :style="{ minHeight: height || '8rem', ...baseStyle }"
    ></span>
    <span
      v-else-if="variant === 'avatar'"
      class="placeholder rounded-circle d-inline-block"
      :style="{ width: width || '3rem', height: height || width || '3rem' }"
    ></span>
    <span
      v-else
      class="placeholder btn btn-secondary disabled col-3"
      :style="baseStyle"
    ></span>
  </div>
</template>
