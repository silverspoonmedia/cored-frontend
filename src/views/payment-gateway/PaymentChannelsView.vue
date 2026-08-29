<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import ErrorState from '@/components/ErrorState.vue'
import SkeletonBlock from '@/components/SkeletonBlock.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { usePaymentChannels } from '@/composables/payment-gateway/usePaymentChannels'
import { useAuth } from '@/stores/auth'
import { useAlert } from '@/composables/useAlert'
import type { PaymentChannel, PaymentChannelRoute } from '@/api/types'

const KIND_META: Record<string, { icon: string; className: string }> = {
  qris: { icon: 'bi-qr-code', className: 'pc-kind-qris' },
  va: { icon: 'bi-bank', className: 'pc-kind-va' },
  ewallet: { icon: 'bi-wallet2', className: 'pc-kind-ewallet' },
}

const ROLE_RANK: Record<string, number> = {
  only: 0,
  primary: 0,
  fallback: 1,
}

const { t, te } = useI18n()
const { fetchList, updateChannel, updateRoute, syncPolicy } = usePaymentChannels()
const { hasPermission } = useAuth()
const { success: showSuccess, error: showError } = useAlert()

const channels = ref<PaymentChannel[]>([])
const loading = ref(true)
const loadError = ref<string | null>(null)
const syncing = ref(false)
const canManage = computed(() => hasPermission('manage payment gateway'))
const search = ref('')

const introSteps = computed(() =>
  [0, 1, 2].map((i) => ({
    title: t(`web.payments.channels.intro.steps.${i}.title`),
    body: t(`web.payments.channels.intro.steps.${i}.body`),
  })),
)

const filteredChannels = computed(() => {
  if (!search.value) return channels.value
  const q = search.value.toLowerCase()
  return channels.value.filter(
    (c) =>
      c.display_name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      c.kind.toLowerCase().includes(q),
  )
})

const activeChannelCount = computed(() => channels.value.filter((c) => c.is_active).length)
const allRoutes = computed(() => channels.value.flatMap((c) => c.routes ?? []))
const activeRouteCount = computed(() => allRoutes.value.filter((r) => r.is_active).length)

function laravelChoice(key: string, count: number): string {
  const raw = t(key, { count })
  const parts = raw.split('|').map((p) => p.trim())
  const idx = count === 0 ? 0 : count === 1 ? 1 : Math.min(2, parts.length - 1)
  const chosen = parts[idx] ?? parts[parts.length - 1] ?? raw
  return chosen.replace(/^\{0\}\s*|^\{1\}\s*|^\[\d+,\*\]\s*/, '')
}

function kindMeta(kind: string): { icon: string; className: string } {
  return KIND_META[kind] ?? { icon: 'bi-credit-card', className: '' }
}

function kindLabel(kind: string): string {
  const key = `web.payments.channels.kinds.${kind}`
  return te(key) ? t(key) : kind
}

function gatewayClass(name: string | undefined): string {
  if (name === 'midtrans') return 'pc-gateway-midtrans'
  if (name === 'ipaymu') return 'pc-gateway-ipaymu'
  return ''
}

function sortedRoutes(ch: PaymentChannel): PaymentChannelRoute[] {
  return [...(ch.routes ?? [])].sort((a, b) => {
    const roleA = ROLE_RANK[a.route_role ?? ''] ?? 2
    const roleB = ROLE_RANK[b.route_role ?? ''] ?? 2
    if (roleA !== roleB) return roleA - roleB
    return a.priority - b.priority
  })
}

function isPrimaryRoute(ch: PaymentChannel, route: PaymentChannelRoute): boolean {
  if (!route.is_active) return false
  const first = sortedRoutes(ch).find((r) => r.is_active)
  return first?.id === route.id
}

function roleLabel(role: string | null): string {
  if (!role) return ''
  const key = `web.payments.channels.route_roles.${role}`
  return te(key) ? t(key) : role
}

async function loadChannels(): Promise<void> {
  loading.value = true
  loadError.value = null
  try {
    channels.value = await fetchList()
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : t('web.payments.channels.load_failed')
  } finally {
    loading.value = false
  }
}

onMounted(loadChannels)

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
  <div class="pc-admin">
    <Card :title="t('web.payments.channels.list_title')">
      <div class="pc-admin__intro mb-4">
        <div class="d-flex align-items-start gap-3 mb-3">
          <span class="pc-admin__intro-icon" aria-hidden="true">
            <i class="bi bi-diagram-3"></i>
          </span>
          <div>
            <h2 class="h5 mb-1">{{ t('web.payments.channels.intro.title') }}</h2>
            <p class="text-muted mb-0">{{ t('web.payments.channels.intro.lead') }}</p>
          </div>
        </div>

        <div class="pc-admin__steps">
          <div v-for="(step, index) in introSteps" :key="index" class="pc-admin__step">
            <span class="pc-admin__step-num">{{ index + 1 }}</span>
            <div class="fw-semibold small">{{ step.title }}</div>
            <div class="text-muted small mb-0">{{ step.body }}</div>
          </div>
        </div>
      </div>

      <div class="pc-admin__stats mb-4">
        <div class="pc-admin__stat">
          <div class="text-muted small">{{ t('web.payments.channels.stats.channels_active') }}</div>
          <div class="pc-admin__stat-value">
            {{ activeChannelCount }}<span class="fs-6 text-muted fw-normal"> / {{ channels.length }}</span>
          </div>
        </div>
        <div class="pc-admin__stat">
          <div class="text-muted small">{{ t('web.payments.channels.stats.routes_active') }}</div>
          <div class="pc-admin__stat-value">
            {{ activeRouteCount }}<span class="fs-6 text-muted fw-normal"> / {{ allRoutes.length }}</span>
          </div>
        </div>
        <div class="pc-admin__stat">
          <div class="text-muted small">{{ t('web.payments.channels.stats.checkout_hint') }}</div>
          <div class="small fw-semibold mb-0 text-body">{{ t('web.payments.channels.stats.checkout_body') }}</div>
        </div>
      </div>

      <div class="pc-admin__toolbar mb-3">
        <div class="pc-admin__search flex-grow-1">
          <label class="form-label small text-muted mb-1" for="pc-channel-search">
            {{ t('web.payments.channels.search_label') }}
          </label>
          <div class="input-group">
            <span class="input-group-text"><i class="bi bi-search"></i></span>
            <input
              id="pc-channel-search"
              type="search"
              class="form-control"
              :placeholder="t('web.payments.channels.search_placeholder')"
              :disabled="channels.length === 0"
              v-model="search"
            >
          </div>
        </div>
        <div class="text-muted small align-self-end">
          {{ laravelChoice('web.payments.channels.visible_count', filteredChannels.length) }}
        </div>
        <div v-if="canManage" class="align-self-end">
          <button
            type="button"
            class="btn btn-outline-primary btn-sm"
            :disabled="syncing"
            :title="t('web.payments.channels.sync_policy_hint')"
            @click="handleSyncPolicy"
          >
            <span v-if="syncing" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
            <i v-else class="bi bi-arrow-repeat me-1"></i>
            {{ t('web.payments.channels.sync_policy') }}
          </button>
        </div>
      </div>

      <div v-if="loading" class="d-grid gap-3 py-1">
        <div v-for="i in 3" :key="i" class="border rounded p-3">
          <div class="d-flex align-items-center gap-3 mb-3">
            <SkeletonBlock variant="avatar" width="2.5rem" />
            <SkeletonBlock variant="line" :lines="1" width="40%" class="mb-0" />
            <SkeletonBlock variant="button" width="5rem" class="ms-auto mb-0" />
          </div>
          <SkeletonBlock variant="line" :lines="2" />
        </div>
      </div>

      <ErrorState v-else-if="loadError" :message="loadError" @retry="loadChannels" />

      <div v-else-if="channels.length === 0" class="pc-admin__empty">
        <i class="bi bi-credit-card-2-front fs-2 d-block mb-2"></i>
        <p class="mb-0">{{ t('web.payments.channels.empty', { sync: ':sync' }) }}</p>
      </div>

      <div v-else-if="filteredChannels.length === 0" class="pc-admin__empty">
        <p class="mb-0">{{ t('web.payments.channels.no_results') }}</p>
      </div>

      <div v-else class="d-grid gap-3">
        <article
          v-for="ch in filteredChannels"
          :key="ch.code"
          class="pc-channel-card"
          :class="[kindMeta(ch.kind).className, { 'is-inactive': !ch.is_active }]"
        >
          <header class="pc-channel-card__head">
            <span class="pc-channel-card__icon" aria-hidden="true">
              <i class="bi" :class="kindMeta(ch.kind).icon"></i>
            </span>

            <div class="flex-grow-1 min-w-0">
              <h3 class="pc-channel-card__title">{{ ch.display_name }}</h3>
              <div class="pc-channel-card__meta">
                <span class="badge text-bg-light border"><code>{{ ch.code }}</code></span>
                <span class="badge text-bg-light border">{{ kindLabel(ch.kind) }}</span>
                <span class="badge text-bg-light border">
                  {{ t('web.payments.channels.columns.sort_order') }}: {{ ch.sort_order }}
                </span>
                <span v-if="!ch.is_active" class="badge text-bg-secondary">
                  {{ t('web.payments.channels.inactive_channel') }}
                </span>
              </div>
            </div>

            <div class="pc-channel-card__actions">
              <div v-if="canManage" class="form-check form-switch m-0">
                <input
                  class="form-check-input"
                  type="checkbox"
                  role="switch"
                  :id="`channel-toggle-${ch.code}`"
                  :checked="ch.is_active"
                  @change="toggleChannel(ch)"
                >
                <label class="form-check-label small" :for="`channel-toggle-${ch.code}`">
                  {{ t('web.payments.channels.columns.is_active') }}
                </label>
              </div>
              <StatusBadge
                v-else
                :status="ch.is_active ? 'active' : 'inactive'"
                :label="ch.is_active ? t('web.payments.channels.status.active') : t('web.payments.channels.status.inactive')"
              />
            </div>
          </header>

          <div class="pc-channel-card__body">
            <div class="pc-routes-heading">
              <div>
                <div class="fw-semibold">{{ t('web.payments.channels.routes_title') }}</div>
                <div class="text-muted small">{{ t('web.payments.channels.routes_lead') }}</div>
              </div>
              <span class="badge text-bg-light border">
                {{ laravelChoice('web.payments.channels.route_count', ch.routes?.length ?? 0) }}
              </span>
            </div>

            <p v-if="!ch.routes || ch.routes.length === 0" class="text-muted small mb-0">
              {{ t('web.payments.channels.no_routes') }}
            </p>
            <div v-else class="pc-route-list">
              <div
                v-for="(route, index) in sortedRoutes(ch)"
                :key="route.id"
                class="pc-route-item"
                :class="{
                  'is-inactive': !route.is_active,
                  'is-primary': isPrimaryRoute(ch, route),
                }"
              >
                <span class="pc-route-rank" :title="t('web.payments.channels.priority_hint')">
                  {{ index + 1 }}
                </span>

                <div class="min-w-0">
                  <div class="pc-route-gateway" :class="gatewayClass(route.gateway?.name)">
                    {{ route.gateway?.display_name ?? route.gateway?.name ?? '—' }}
                    <span v-if="isPrimaryRoute(ch, route)" class="badge text-bg-success ms-1">
                      {{ t('web.payments.channels.primary_route') }}
                    </span>
                  </div>
                  <div class="pc-route-meta">
                    <span>{{ t('web.payments.channels.route_columns.provider_type') }}:</span>
                    <code>{{ route.provider_payment_type }}</code>
                    <span class="mx-1">·</span>
                    <span>{{ t('web.payments.channels.route_columns.provider_channel') }}:</span>
                    <span>{{ route.provider_payment_channel || '—' }}</span>
                    <span class="mx-1">·</span>
                    <span>{{ t('web.payments.channels.route_columns.settlement') }}:</span>
                    <span>{{ route.settlement_label || '—' }}</span>
                    <span class="mx-1">·</span>
                    <span>{{ t('web.payments.channels.route_columns.fee') }}:</span>
                    <span>{{ route.fee_label || '—' }}</span>
                    <template v-if="route.route_role">
                      <span class="mx-1">·</span>
                      <span class="badge text-bg-light border">{{ roleLabel(route.route_role) }}</span>
                    </template>
                  </div>
                </div>

                <div class="pc-route-controls">
                  <template v-if="canManage">
                    <div>
                      <label class="form-label small text-muted mb-0" :for="`route-priority-${route.id}`">
                        {{ t('web.payments.channels.route_columns.priority') }}
                        <span v-if="route.is_policy_managed" class="text-muted fst-italic">
                          ({{ t('web.payments.channels.route_columns.policy_managed') }})
                        </span>
                        <span v-else class="text-muted fst-italic">
                          ({{ t('web.payments.channels.priority_autosave_hint') }})
                        </span>
                      </label>
                      <input
                        :id="`route-priority-${route.id}`"
                        type="number"
                        class="form-control form-control-sm text-center pc-route-priority"
                        min="0"
                        max="9999"
                        :value="route.priority"
                        :disabled="route.is_policy_managed"
                        :title="t('web.payments.channels.priority_hint')"
                        @change="updatePriority(ch, route.id, $event)"
                      >
                    </div>
                    <div class="form-check form-switch m-0">
                      <input
                        class="form-check-input"
                        type="checkbox"
                        role="switch"
                        :id="`route-toggle-${route.id}`"
                        :checked="route.is_active"
                        @change="toggleRoute(ch, route.id)"
                      >
                      <label class="form-check-label small" :for="`route-toggle-${route.id}`">
                        {{ t('web.payments.channels.route_columns.is_active') }}
                      </label>
                    </div>
                  </template>
                  <template v-else>
                    <StatusBadge
                      :status="route.is_active ? 'active' : 'inactive'"
                      :label="route.is_active ? t('web.payments.channels.status.active') : t('web.payments.channels.status.inactive')"
                    />
                    <span class="text-muted small">{{ route.priority }}</span>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>
    </Card>
  </div>
</template>
