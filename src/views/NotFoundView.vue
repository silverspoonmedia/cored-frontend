<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div class="d-flex flex-column align-items-center justify-content-center py-5">
    <h1 class="display-1 fw-bold text-muted">404</h1>
    <p class="lead mb-3">{{ t('errors.not_found') }}</p>
    <router-link :to="{ name: 'dashboard.view' }" class="btn btn-primary">
      <i class="bi bi-house me-1"></i> {{ t('errors.back_home') }}
    </router-link>
  </div>
</template>
