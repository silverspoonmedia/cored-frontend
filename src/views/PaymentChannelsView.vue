<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import { usePaymentChannels } from '@/composables/usePaymentChannels'
import { useAuth } from '@/stores/auth'
import { useAlert } from '@/composables/useAlert'
import type { PaymentChannel } from '@/api/types'

const { t } = useI18n()
const { fetchList, updateChannel, updateRoute, syncPolicy } = usePaymentChannels()
const { hasPermission } = useAuth()
const { success: showSuccess, error: showError } = useAlert()

const channels = ref<PaymentChannel[]>([])
const loading = ref(true)
const syncing = ref(false)
const canManage = computed(() => hasPermission('manage payment gateway'))
const search = ref('')

const filteredChannels = computed(() => {
  if (!search.value) return channels.value
  const q = search.value.toLowerCase()
  return channels.value.filter(
    (c) =>
      c.display_name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q),
  )
})

onMounted(async () => {
  loading.value = true
  try {
    channels.value = await fetchList()
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.payments.channels.updated'))
  } finally {
    loading.value = false
  }
})

async function toggleChannel(ch: PaymentChannel): Promise<void> {
  try {
    await updateChannel(ch.code, { is_active: !ch.is_active })
    ch.is_active = !ch.is_active
    showSuccess(t('web.payments.channels.updated'))
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.payments.channels.updated'))
  }
}

async function toggleRoute(ch: PaymentChannel, routeId: string): Promise<void> {
  const route = ch.routes?.find((r) => r.id === routeId)
  if (!route) return
  try {
    await updateRoute(routeId, { is_active: !route.is_active })
    route.is_active = !route.is_active
    showSuccess(t('web.payments.channels.route_updated'))
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.payments.channels.route_updated'))
  }
}

async function updatePriority(ch: PaymentChannel, routeId: string, event: Event): Promise<void> {
  const target = event.target as HTMLInputElement
  const priority = parseInt(target.value, 10) || 0
  const route = ch.routes?.find((r) => r.id === routeId)
  if (!route) return
  try {
    await updateRoute(routeId, { priority })
    route.priority = priority
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.payments.channels.route_updated'))
  }
}

async function handleSyncPolicy(): Promise<void> {
  syncing.value = true
  try {
    const stats = await syncPolicy()
    showSuccess(t('web.payments.channels.sync_policy_done', { channels: stats.channels, routes: stats.routes }))
    channels.value = await fetchList()
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.payments.channels.sync_policy_done', { channels: 0, routes: 0 }))
  } finally {
    syncing.value = false
  }
}
</script>

<template>
  <Card :title="t('web.payments.channels.title')">
    <template #actions>
      <button
        v-if="canManage"
        class="btn btn-outline-secondary btn-sm"
        :disabled="syncing"
        @click="handleSyncPolicy"
      >
        <span v-if="syncing" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
        <i v-else class="bi bi-arrow-repeat me-1"></i>
        {{ t('web.payments.channels.sync_policy') }}
      </button>
    </template>

    <div class="mb-3">
      <input
        type="text"
        class="form-control"
        :placeholder="t('web.payments.channels.search_placeholder')"
        v-model="search"
      />
    </div>

    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">{{ t('ui.loading') }}</span>
      </div>
    </div>

    <div v-else-if="filteredChannels.length === 0" class="text-muted text-center py-4">
      {{ t('web.payments.channels.no_results') }}
    </div>

    <div v-else class="row g-3">
      <div v-for="ch in filteredChannels" :key="ch.code" class="col-md-6">
        <div class="card h-100">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <div>
                <strong>{{ ch.display_name }}</strong>
                <code class="ms-2 small">{{ ch.code }}</code>
              </div>
              <div class="form-check form-switch" v-if="canManage">
                <input
                  type="checkbox"
                  class="form-check-input"
                  :checked="ch.is_active"
                  @change="toggleChannel(ch)"
                />
              </div>
              <span v-else class="badge" :class="ch.is_active ? 'text-bg-success' : 'text-bg-secondary'">
                {{ ch.is_active ? t('web.payments.channels.status.active') : t('web.payments.channels.status.inactive') }}
              </span>
            </div>

            <div v-if="ch.routes && ch.routes.length > 0" class="mt-2">
              <h6 class="small fw-semibold mb-1">{{ t('web.payments.channels.routes_title') }}</h6>
              <table class="table table-sm mb-0">
                <thead>
                  <tr>
                    <th>{{ t('web.payments.channels.intro.gateway') }}</th>
                    <th class="text-center">{{ t('web.payments.gateways.form.priority') }}</th>
                    <th class="text-center">{{ t('web.payments.gateways.form.is_active') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="route in ch.routes" :key="route.id">
                    <td class="small">{{ route.gateway?.display_name ?? '—' }}</td>
                    <td class="text-center">
                      <input
                        v-if="canManage && !route.is_policy_managed"
                        type="number"
                        class="form-control form-control-sm text-center"
                        style="width: 60px; display: inline-block;"
                        :value="route.priority"
                        @change="updatePriority(ch, route.id, $event)"
                      />
                      <span v-else class="small">{{ route.priority }}</span>
                    </td>
                    <td class="text-center">
                      <div v-if="canManage" class="form-check form-switch d-inline-block">
                        <input
                          type="checkbox"
                          class="form-check-input"
                          :checked="route.is_active"
                          @change="toggleRoute(ch, route.id)"
                        />
                      </div>
                      <span v-else class="badge" :class="route.is_active ? 'text-bg-success' : 'text-bg-secondary'">
                        {{ route.is_active ? t('web.payments.channels.status.active') : t('web.payments.channels.status.inactive') }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Card>
</template>
