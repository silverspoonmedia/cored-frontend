<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'

const route = useRoute()
const { t } = useI18n()

function applyBodyClass(): void {
  const body = document.body
  const isAuth = route.matched.some((record) => record.meta.guestOnly === true)

  body.className = ''
  if (isAuth) {
    body.classList.add('login-page', 'bg-body-secondary')
  } else {
    body.classList.add('layout-fixed', 'sidebar-expand-lg', 'bg-body-tertiary')
  }
}

onMounted(applyBodyClass)
watch(() => route.path, applyBodyClass)
</script>

<template>
  <a href="#main-content" class="visually-hidden-focusable skip-link p-2">
    {{ t('ui.skip_to_content') }}
  </a>
  <router-view />
</template>
