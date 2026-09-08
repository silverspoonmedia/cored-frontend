<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import { useAlert } from '@/composables/useAlert'
import { useConnections } from '@/composables/identity/useConnections'
import type { OAuthProviderConnection, ProfileConnections } from '@/api/types'
import { safeDiscordAuthorizeUrl } from '@/utils/safeUrl'

interface ProviderCatalogEntry {
  icon: string
  headingKey: string
  connectedKey: string
  notConnectedKey: string
  connectKey: string
  disconnectKey: string
  notConfiguredKey: string
  linkedHeadingKey: string
  linkedEmptyKey: string
  canConnect: boolean
}

const PROVIDER_CATALOG: Record<string, ProviderCatalogEntry> = {
  discord: {
    icon: 'bi-discord',
    headingKey: 'web.identity-connections.discord_heading',
    connectedKey: 'web.identity-connections.discord_connected',
    notConnectedKey: 'web.identity-connections.discord_not_connected',
    connectKey: 'web.identity-connections.discord_connect',
    disconnectKey: 'web.identity-connections.discord_disconnect',
    notConfiguredKey: 'web.identity-connections.discord_not_configured',
    linkedHeadingKey: 'web.identity-connections.linked_accounts_heading',
    linkedEmptyKey: 'web.identity-connections.linked_accounts_empty',
    canConnect: true,
  },
}

const FALLBACK_CATALOG: ProviderCatalogEntry = {
  icon: 'bi-link-45deg',
  headingKey: 'web.identity-connections.provider_heading',
  connectedKey: 'web.identity-connections.connected',
  notConnectedKey: 'web.identity-connections.not_connected',
  connectKey: 'web.identity-connections.connect',
  disconnectKey: 'web.identity-connections.disconnect',
  notConfiguredKey: 'web.identity-connections.not_configured',
  linkedHeadingKey: 'web.identity-connections.linked_accounts_heading_generic',
  linkedEmptyKey: 'web.identity-connections.linked_accounts_empty_generic',
  canConnect: false,
}

type ActingAction = 'connect' | 'sync' | 'disconnect'

const { t } = useI18n()
const { success: showSuccess, error: showError } = useAlert()
const { fetchConnections, syncProvider, disconnectProvider, authorizeUrl } = useConnections()

const loading = ref(true)
const acting = ref<Record<string, ActingAction | undefined>>({})
const snapshot = ref<ProfileConnections | null>(null)

function catalogFor(key: string): ProviderCatalogEntry {
  return PROVIDER_CATALOG[key] ?? FALLBACK_CATALOG
}

function headingFor(provider: OAuthProviderConnection): string {
  const catalog = catalogFor(provider.key)
  if (catalog === FALLBACK_CATALOG) {
    return t(catalog.headingKey, { name: provider.key })
  }
  return t(catalog.headingKey)
}

function isBusy(key: string): boolean {
  return acting.value[key] != null
}

function isActing(key: string, action: ActingAction): boolean {
  return acting.value[key] === action
}

function setActing(key: string, action: ActingAction | undefined): void {
  acting.value = { ...acting.value, [key]: action }
}

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
    showError(e instanceof Error ? e.message : t('web.archivd.operation_failed'))
  } finally {
    loading.value = false
  }
}

async function connectProvider(provider: OAuthProviderConnection): Promise<void> {
  if (isBusy(provider.key) || !catalogFor(provider.key).canConnect) return
  setActing(provider.key, 'connect')
  try {
    const url = await authorizeUrl({
      intent: 'profile',
      return_path: '/apps/profile/connections',
    })
    const safeUrl = safeDiscordAuthorizeUrl(url)
    if (!safeUrl) {
      setActing(provider.key, undefined)
      await showError(t('web.identity-connections.authorization_failed'))
      return
    }
    window.location.assign(safeUrl)
  } catch (e) {
    setActing(provider.key, undefined)
    await showError(e instanceof Error ? e.message : t(catalogFor(provider.key).notConfiguredKey))
  }
}

async function handleSync(provider: OAuthProviderConnection): Promise<void> {
  if (isBusy(provider.key) || !provider.supports_sync) return
  setActing(provider.key, 'sync')
  try {
    snapshot.value = await syncProvider(provider.key)
    showSuccess(t('web.identity-connections.synced'))
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.identity-connections.sync_failed'))
  } finally {
    setActing(provider.key, undefined)
  }
}

async function handleDisconnect(provider: OAuthProviderConnection): Promise<void> {
  if (isBusy(provider.key)) return
  setActing(provider.key, 'disconnect')
  try {
    await disconnectProvider(provider.key)
    showSuccess(
      provider.key === 'discord'
        ? t('web.identity-connections.discord_disconnected')
        : t('web.identity-connections.disconnected'),
    )
    await load()
  } catch (e) {
    showError(
      e instanceof Error
        ? e.message
        : t(
            provider.key === 'discord'
              ? 'web.identity-connections.discord_disconnect_failed'
              : 'web.identity-connections.disconnect_failed',
          ),
    )
  } finally {
    setActing(provider.key, undefined)
  }
}

onMounted(() => {
  consumeDiscordQuery()
  void load()
})
</script>

<template>
  <Card :title="t('web.identity-connections.card_title')">
    <div v-if="loading" class="text-center py-3">
      <div class="spinner-border spinner-border-sm text-primary" role="status">
        <span class="visually-hidden">{{ t('ui.loading') }}</span>
      </div>
    </div>

    <template v-else-if="snapshot">
      <section
        v-for="(provider, index) in snapshot.providers"
        :key="provider.key"
        :class="{ 'mb-4 pb-3 border-bottom': index < snapshot.providers.length - 1 }"
      >
        <h5 class="h6 mb-2">
          <i :class="['bi', catalogFor(provider.key).icon, 'me-1']" aria-hidden="true"></i>
          {{ headingFor(provider) }}
        </h5>

        <template v-if="provider.connected">
          <p class="text-muted small mb-3">{{ t(catalogFor(provider.key).connectedKey) }}</p>
          <p v-if="provider.synced_at_formatted" class="text-muted small mb-3">
            {{ t('web.identity-connections.synced_at', { at: provider.synced_at_formatted }) }}
          </p>

          <h6 class="small fw-semibold mb-2">{{ t(catalogFor(provider.key).linkedHeadingKey) }}</h6>
          <p v-if="provider.connections.length === 0" class="text-muted small mb-3">
            {{ t(catalogFor(provider.key).linkedEmptyKey) }}
          </p>
          <ul v-else class="list-group list-group-flush mb-3">
            <li
              v-for="connection in provider.connections"
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

          <div class="d-flex flex-wrap gap-2">
            <button
              v-if="provider.supports_sync"
              class="btn btn-outline-primary btn-sm"
              :disabled="isBusy(provider.key)"
              @click="handleSync(provider)"
            >
              <span v-if="isActing(provider.key, 'sync')" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
              {{ t('web.identity-connections.sync') }}
            </button>
            <button
              class="btn btn-outline-danger btn-sm"
              :disabled="isBusy(provider.key)"
              @click="handleDisconnect(provider)"
            >
              <span v-if="isActing(provider.key, 'disconnect')" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
              {{ t(catalogFor(provider.key).disconnectKey) }}
            </button>
          </div>
        </template>

        <template v-else-if="provider.oauth_configured">
          <p class="text-muted small mb-3">{{ t(catalogFor(provider.key).notConnectedKey) }}</p>
          <button
            v-if="catalogFor(provider.key).canConnect"
            class="btn btn-primary btn-sm"
            :disabled="isBusy(provider.key)"
            @click="connectProvider(provider)"
          >
            <span v-if="isActing(provider.key, 'connect')" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
            <i v-else :class="['bi', catalogFor(provider.key).icon, 'me-1']" aria-hidden="true"></i>
            {{ t(catalogFor(provider.key).connectKey) }}
          </button>
        </template>

        <p v-else class="text-muted small mb-0">{{ t(catalogFor(provider.key).notConfiguredKey) }}</p>
      </section>
    </template>

    <div class="mt-3">
      <router-link :to="{ name: 'dashboard.view' }" class="btn btn-outline-secondary btn-sm">
        {{ t('ui.actions.cancel') }}
      </router-link>
    </div>
  </Card>
</template>
