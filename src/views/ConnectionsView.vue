<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import { useAlert } from '@/composables/useAlert'
import { useConnections } from '@/composables/useConnections'
import type { ProfileConnections } from '@/api/types'

const { t } = useI18n()
const { success: showSuccess, error: showError } = useAlert()
const { fetchConnections, disconnectDiscord, authorizeUrl } = useConnections()

const loading = ref(true)
const acting = ref(false)
const snapshot = ref<ProfileConnections | null>(null)

function consumeDiscordQuery(): void {
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
}

async function load(): Promise<void> {
  loading.value = true
  try {
    snapshot.value = await fetchConnections()
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.file-hosting.operation_failed'))
  } finally {
    loading.value = false
  }
}

async function connectDiscord(): Promise<void> {
  if (acting.value) return
  acting.value = true
  try {
    const url = await authorizeUrl({
      intent: 'profile',
      return_path: '/apps/profile/connections',
    })
    window.location.href = url
  } catch (e) {
    acting.value = false
    showError(e instanceof Error ? e.message : t('web.identity-connections.discord_not_configured'))
  }
}

async function handleDisconnect(): Promise<void> {
  if (acting.value) return
  acting.value = true
  try {
    await disconnectDiscord()
    showSuccess(t('web.identity-connections.discord_disconnected'))
    await load()
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.identity-connections.discord_disconnect_failed'))
  } finally {
    acting.value = false
  }
}

onMounted(() => {
  consumeDiscordQuery()
  void load()
})
</script>

<template>
  <div class="row">
    <div class="col-lg-8">
      <Card :title="t('web.identity-connections.card_title')">
        <div v-if="loading" class="text-center py-3">
          <div class="spinner-border spinner-border-sm text-primary" role="status">
            <span class="visually-hidden">{{ t('ui.loading') }}</span>
          </div>
        </div>

        <template v-else-if="snapshot">
          <h5 class="h6 mb-2">{{ t('web.identity-connections.discord_heading') }}</h5>

          <template v-if="snapshot.discord_connected">
            <p class="text-muted small mb-3">{{ t('web.identity-connections.discord_connected') }}</p>
            <p v-if="snapshot.discord_synced_at_formatted" class="text-muted small mb-3">
              {{ t('web.identity-connections.synced_at', { at: snapshot.discord_synced_at_formatted }) }}
            </p>

            <h6 class="small fw-semibold mb-2">{{ t('web.identity-connections.linked_accounts_heading') }}</h6>
            <p v-if="snapshot.connections.length === 0" class="text-muted small mb-3">
              {{ t('web.identity-connections.linked_accounts_empty') }}
            </p>
            <ul v-else class="list-group list-group-flush mb-3">
              <li
                v-for="connection in snapshot.connections"
                :key="`${connection.type}-${connection.id}`"
                class="list-group-item px-0 d-flex justify-content-between align-items-center"
              >
                <span>
                  <span class="badge text-bg-light border">{{ (connection.type || '').toUpperCase() }}</span>
                  <span class="ms-1">{{ connection.name || connection.id || '' }}</span>
                </span>
                <span class="d-flex gap-1 align-items-center">
                  <span v-if="connection.revoked" class="badge text-bg-warning">{{ t('web.identity-connections.linked_revoked') }}</span>
                  <span class="badge" :class="connection.verified ? 'text-bg-success' : 'text-bg-secondary'">
                    {{ connection.verified
                      ? t('web.identity-connections.linked_verified')
                      : t('web.identity-connections.linked_unverified') }}
                  </span>
                </span>
              </li>
            </ul>

            <button class="btn btn-outline-danger btn-sm" :disabled="acting" @click="handleDisconnect">
              <span v-if="acting" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
              {{ t('web.identity-connections.discord_disconnect') }}
            </button>
          </template>

          <template v-else-if="snapshot.discord_oauth_configured">
            <p class="text-muted small mb-3">{{ t('web.identity-connections.discord_not_connected') }}</p>
            <button class="btn btn-primary btn-sm" :disabled="acting" @click="connectDiscord">
              <span v-if="acting" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
              <i v-else class="bi bi-discord me-1"></i>
              {{ t('web.identity-connections.discord_connect') }}
            </button>
          </template>

          <p v-else class="text-muted small mb-3">{{ t('web.identity-connections.discord_not_configured') }}</p>
        </template>

        <div class="mt-3">
          <router-link :to="{ name: 'dashboard.view' }" class="btn btn-outline-secondary btn-sm">
            {{ t('ui.actions.cancel') }}
          </router-link>
        </div>
      </Card>
    </div>
  </div>
</template>
