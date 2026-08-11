<script setup lang="ts">
defineProps<{
  title?: string | null
}>()
</script>

<template>
  <div class="card mb-4">
    <div v-if="title || $slots.actions" class="card-header d-flex align-items-center gap-2">
      <h3 v-if="title" class="card-title mb-0 flex-grow-1 float-none">{{ title }}</h3>
      <div v-if="$slots.actions" class="card-tools float-none me-0 flex-shrink-0">
        <slot name="actions" />
      </div>
    </div>
    <div class="card-body">
      <slot />
    </div>
  </div>
</template>
