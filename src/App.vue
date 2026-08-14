<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { usePageTitle } from '@/composables/usePageTitle'

const route = useRoute()
const { t } = useI18n()
const { documentTitle, applyDocumentTitle } = usePageTitle()

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

onMounted(() => {
  applyBodyClass()
  applyDocumentTitle()
})
watch(() => route.path, applyBodyClass)
watch(documentTitle, applyDocumentTitle)
</script>

<template>
  <a href="#main-content" class="visually-hidden-focusable skip-link p-2">
    {{ t('ui.skip_to_content') }}
  </a>
  <router-view />
</template>
