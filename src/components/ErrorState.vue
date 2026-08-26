<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(defineProps<{
  icon?: string
  title?: string | null
  message?: string | null
  retryLabel?: string | null
}>(), {
  icon: 'bi-exclamation-triangle',
  title: null,
  message: null,
  retryLabel: null,
})

const emit = defineEmits<{
  (e: 'retry'): void
}>()

const { t } = useI18n()

const resolvedTitle = computed(() => props.title || t('ui.error_state.title'))
const resolvedMessage = computed(() => props.message || t('ui.error_state.message'))
const resolvedRetryLabel = computed(() => props.retryLabel || t('ui.error_state.retry'))
</script>

<template>
  <div class="text-center text-muted py-5" role="alert">
    <i class="bi" :class="icon" style="font-size: 2.5rem; opacity: 0.4;" aria-hidden="true"></i>
    <p class="fw-semibold mb-1 d-block">{{ resolvedTitle }}</p>
    <p v-if="resolvedMessage" class="small mb-0">{{ resolvedMessage }}</p>
    <button
      type="button"
      class="btn btn-outline-primary btn-sm mt-3"
      @click="emit('retry')"
    >
      <i class="bi bi-arrow-clockwise me-1" aria-hidden="true"></i>
      {{ resolvedRetryLabel }}
    </button>
    <slot />
  </div>
</template>
