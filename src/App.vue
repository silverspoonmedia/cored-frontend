<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuth } from '@/stores/auth'
import { usePageTitle } from '@/composables/usePageTitle'
import { useChunkLoadError } from '@/composables/useChunkLoadError'
import ErrorState from '@/components/ErrorState.vue'

const route = useRoute()
const { t } = useI18n()
const { isAuthenticated } = useAuth()
const { documentTitle, applyDocumentTitle } = usePageTitle()
const { chunkLoadFailed } = useChunkLoadError()

function reloadPage(): void {
  window.location.reload()
}

const AUTH_BODY_CLASSES = ['login-page', 'bg-body-secondary'] as const
const APP_BODY_CLASSES = ['layout-fixed', 'sidebar-expand-lg', 'bg-body-tertiary'] as const
const VK3_BODY_CLASSES = ['vk3-page'] as const
const MANAGED_BODY_CLASSES = [...AUTH_BODY_CLASSES, ...APP_BODY_CLASSES, ...VK3_BODY_CLASSES]

function applyBodyClass(): void {
  const body = document.body
  const isValkivid = route.matched.some((record) => record.meta.template === 'valkivid3')
  const isAuth = route.matched.some(
    (record) => record.meta.guestOnly === true || record.meta.authChrome === true,
  )

  body.classList.remove(...MANAGED_BODY_CLASSES)
  body.classList.add(
    ...(isValkivid ? VK3_BODY_CLASSES : isAuth ? AUTH_BODY_CLASSES : APP_BODY_CLASSES),
  )
}

onMounted(() => {
  applyBodyClass()
  applyDocumentTitle()
})
watch(() => route.path, applyBodyClass)
watch(isAuthenticated, (authenticated) => {
  if (!authenticated) {
    void import('@/router').then((m) => m.revokeCurrentProtectedRoute())
  }
})
watch(documentTitle, applyDocumentTitle)
</script>

<template>
  <a href="#main-content" class="visually-hidden-focusable skip-link p-2">
    {{ t('ui.skip_to_content') }}
  </a>
  <ErrorState
    v-if="chunkLoadFailed"
    :title="t('ui.error_state.title')"
    :message="t('ui.ajax.server_unreachable')"
    :retry-label="t('ui.error_state.retry')"
    @retry="reloadPage"
  />
  <router-view v-else />
</template>
