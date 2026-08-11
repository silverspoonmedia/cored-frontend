<script setup lang="ts">
import { useAlert } from '@/composables/useAlert'

const { alerts, dismiss } = useAlert()
</script>

<template>
  <div v-if="alerts.length > 0">
    <div
      v-for="alert in alerts"
      :key="alert.id"
      :class="{
        'alert-success': alert.type === 'success',
        'alert-danger': alert.type === 'error',
        'alert-info': alert.type === 'info',
      }"
      class="alert alert-dismissible fade show"
      role="alert"
    >
      <i
        :class="{
          'bi bi-check-circle': alert.type === 'success',
          'bi bi-exclamation-triangle': alert.type === 'error',
          'bi bi-info-circle': alert.type === 'info',
        }"
        class="me-1"
      ></i>
      {{ alert.message }}
      <button
        type="button"
        class="btn-close"
        aria-label="Close"
        @click="dismiss(alert.id)"
      ></button>
    </div>
  </div>
</template>
