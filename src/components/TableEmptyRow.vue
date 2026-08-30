<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue'

withDefaults(defineProps<{
  colspan: number
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
  <tr>
    <td :colspan="colspan" class="p-0">
      <EmptyState :icon="icon" :title="title" :message="message" />
    </td>
  </tr>
</template>
