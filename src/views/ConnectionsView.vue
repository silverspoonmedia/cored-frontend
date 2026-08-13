<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import { useAlert } from '@/composables/useAlert'

const { t } = useI18n()
const { success: showSuccess, error: showError } = useAlert()

const monolithWebUrl = import.meta.env.VITE_MONOLITH_WEB_URL ?? ''
const redirecting = ref(false)

function connectDiscord(): void {
  if (!monolithWebUrl) {
    showError(t('web.identity-connections.discord_not_configured'))
    return
  }
  redirecting.value = true
  const url = `${monolithWebUrl}/auth/discord/redirect?intent=profile`
  window.location.href = url
}

function openConnectionsPage(): void {
  if (!monolithWebUrl) return
  window.open(`${monolithWebUrl}/profile/connections`, '_blank')
}

onMounted(() => {
  const params = new URLSearchParams(window.location.search)
  const status = params.get('discord')
  if (status === 'connected') {
    showSuccess(t('web.identity-connections.discord_connected_flash'))
  } else if (status === 'denied') {
    showError(t('web.identity-connections.discord_denied'))
  } else if (status === 'error') {
    showError(t('web.identity-connections.discord_callback_invalid'))
  }
  if (status) {
    const url = new URL(window.location.href)
    url.searchParams.delete('discord')
    window.history.replaceState({}, '', url.toString())
  }
})
</script>

<template>
  <div class="row">
    <div class="col-lg-8">
      <Card :title="t('web.identity-connections.card_title')">
        <h5 class="h6 mb-2">{{ t('web.identity-connections.discord_heading') }}</h5>

        <p class="text-muted small mb-3">{{ t('web.identity-connections.discord_not_connected') }}</p>

        <div class="d-flex gap-2 flex-wrap">
          <button class="btn btn-primary btn-sm" :disabled="redirecting" @click="connectDiscord">
            <span v-if="redirecting" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
            <i v-else class="bi bi-discord me-1"></i>
            {{ t('web.identity-connections.discord_connect') }}
          </button>
          <button class="btn btn-outline-secondary btn-sm" @click="openConnectionsPage">
            <i class="bi bi-box-arrow-up-right me-1"></i>
            {{ t('web.identity-connections.card_title') }}
          </button>
        </div>

        <div class="mt-3">
          <router-link :to="{ name: 'dashboard.view' }" class="btn btn-outline-secondary btn-sm">
            {{ t('ui.actions.cancel') }}
          </router-link>
        </div>
      </Card>
    </div>
  </div>
</template>
