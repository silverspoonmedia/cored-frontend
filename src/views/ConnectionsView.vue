<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'

const { t } = useI18n()

const monolithWebUrl = import.meta.env.VITE_MONOLITH_WEB_URL ?? ''

function connectDiscord(): void {
  if (!monolithWebUrl) return
  const url = `${monolithWebUrl}/auth/discord/redirect?intent=profile`
  window.open(url, '_blank')
}

function openConnectionsPage(): void {
  if (!monolithWebUrl) return
  window.open(`${monolithWebUrl}/profile/connections`, '_blank')
}
</script>

<template>
  <Card :title="t('web.identity-connections.card_title')">
    <h5 class="h6 mb-2">{{ t('web.identity-connections.discord_heading') }}</h5>

    <p class="text-muted small mb-3">
      Discord connection management is handled through the main Monolith web application.
      Use the button below to connect your Discord account or manage existing connections.
    </p>

    <div class="d-flex gap-2 flex-wrap">
      <button class="btn btn-primary btn-sm" @click="connectDiscord">
        <i class="bi bi-discord me-1"></i> Connect Discord
      </button>
      <button class="btn btn-outline-secondary btn-sm" @click="openConnectionsPage">
        <i class="bi bi-box-arrow-up-right me-1"></i> Open Connections Page
      </button>
    </div>

    <div class="mt-3">
      <router-link :to="{ name: 'dashboard.view' }" class="btn btn-outline-secondary btn-sm">
        Cancel
      </router-link>
    </div>
  </Card>
</template>
