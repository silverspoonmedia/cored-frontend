<script setup lang="ts">
withDefaults(defineProps<{
  icon?: string
  title?: string | null
  message?: string | null
}>(), {
  icon: 'bi-inbox',
  title: null,
  message: null,
})
</script>

<template>
  <div class="text-center text-muted py-5" role="status">
    <i class="bi" :class="icon" style="font-size: 2.5rem; opacity: 0.4;" aria-hidden="true"></i>
    <p v-if="title" class="fw-semibold mb-1 d-block">{{ title }}</p>
    <p v-if="message" class="small mb-0">{{ message }}</p>
    <slot />
  </div>
</template>
