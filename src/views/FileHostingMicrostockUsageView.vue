<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import { useMicrostockBilling } from '@/composables/useMicrostockBilling'
import { useFileHostingRealtime } from '@/composables/useFileHostingRealtime'
import { useEcho } from '@/composables/useEcho'
import { useAuth } from '@/stores/auth'
import { useAlert } from '@/composables/useAlert'
import type {
  MicrostockBillingSummary,
  MicrostockLedgerEntry,
  MicrostockUsageEvent,
  MicrostockPlatformOverview,
  InferenceUsageEvent,
} from '@/api/types'

const { t } = useI18n()
const { fetchBilling, fetchLedger, fetchUsageEvents, fetchAdminOverview, fetchAdminUsageEvents } =
  useMicrostockBilling()
const { hasPermission, token } = useAuth()
const { error: showError } = useAlert()
const { subscribe, unsubscribe } = useFileHostingRealtime()
const { connected: echoConnected } = useEcho(() => token.value)

const canViewPlatform = computed(() => hasPermission('view platform billing'))

const activeTab = ref<'ledger' | 'usage' | 'platform'>('ledger')

const billing = ref<MicrostockBillingSummary | null>(null)
const ledger = ref<MicrostockLedgerEntry[]>([])
const usageEvents = ref<MicrostockUsageEvent[]>([])
const platformOverview = ref<MicrostockPlatformOverview | null>(null)
const platformEvents = ref<InferenceUsageEvent[]>([])

const loading = ref(false)
const ledgerLoading = ref(false)
const usageLoading = ref(false)
const platformLoading = ref(false)
const platformEventsLoading = ref(false)

const ledgerHasMore = ref(false)
const usageHasMore = ref(false)
const platformEventsHasMore = ref(false)

const ledgerPage = ref(1)
const usagePage = ref(1)
const platformEventsPage = ref(1)

async function loadBilling(): Promise<void> {
  loading.value = true
  try {
    billing.value = await fetchBilling()
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.microstock.usage.load_failed_billing'))
  } finally {
    loading.value = false
  }
}

async function loadLedger(reset = true): Promise<void> {
  if (reset) {
    ledgerPage.value = 1
    ledger.value = []
    ledgerLoading.value = true
  } else {
    ledgerPage.value++
  }

  try {
    const res = await fetchLedger({ page: ledgerPage.value, per_page: 20 })
    if (reset) {
      ledger.value = res.items
    } else {
      ledger.value.push(...res.items)
    }
    ledgerHasMore.value = res.pagination.has_more
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.microstock.usage.load_failed_ledger'))
  } finally {
    ledgerLoading.value = false
  }
}

async function loadUsage(reset = true): Promise<void> {
  if (reset) {
    usagePage.value = 1
    usageEvents.value = []
    usageLoading.value = true
  } else {
    usagePage.value++
  }

  try {
    const res = await fetchUsageEvents({ page: usagePage.value, per_page: 20 })
    if (reset) {
      usageEvents.value = res.items
    } else {
      usageEvents.value.push(...res.items)
    }
    usageHasMore.value = res.pagination.has_more
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.microstock.usage.load_failed_usage'))
  } finally {
    usageLoading.value = false
  }
}

async function loadPlatform(): Promise<void> {
  platformLoading.value = true
  try {
    platformOverview.value = await fetchAdminOverview()
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.microstock.usage.load_failed_platform'))
  } finally {
    platformLoading.value = false
  }
}

async function loadPlatformEvents(reset = true): Promise<void> {
  if (reset) {
    platformEventsPage.value = 1
    platformEvents.value = []
    platformEventsLoading.value = true
  } else {
    platformEventsPage.value++
  }

  try {
    const res = await fetchAdminUsageEvents({ page: platformEventsPage.value, per_page: 20 })
    if (reset) {
      platformEvents.value = res.items
    } else {
      platformEvents.value.push(...res.items)
    }
    platformEventsHasMore.value = res.pagination.has_more
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.microstock.usage.load_failed_platform_events'))
  } finally {
    platformEventsLoading.value = false
  }
}

const msHandlers = {
  onCollectionAnalysisProgress: () => {
    loadBilling()
    loadLedger(true)
  },
  onAssetMetadataProgress: () => {
    loadBilling()
    loadLedger(true)
  },
}

let msPollTimer: ReturnType<typeof setInterval> | null = null
const MS_POLL_MS = 30_000

function startMsPolling(): void {
  if (msPollTimer) return
  msPollTimer = setInterval(() => {
    if (document.visibilityState !== 'visible') return
    if (echoConnected.value) {
      stopMsPolling()
      return
    }
    loadBilling()
    loadLedger(true)
  }, MS_POLL_MS)
}

function stopMsPolling(): void {
  if (msPollTimer) {
    clearInterval(msPollTimer)
    msPollTimer = null
  }
}

onMounted(async () => {
  await loadBilling()
  await loadLedger(true)
  subscribe(msHandlers)
  if (!echoConnected.value) {
    startMsPolling()
  }
})

onUnmounted(() => {
  unsubscribe(msHandlers)
  stopMsPolling()
})

async function switchTab(tab: 'ledger' | 'usage' | 'platform'): Promise<void> {
  activeTab.value = tab
  if (tab === 'usage' && usageEvents.value.length === 0) {
    await loadUsage(true)
  } else if (tab === 'platform' && canViewPlatform.value && !platformOverview.value) {
    await loadPlatform()
    await loadPlatformEvents(true)
  }
}
</script>

<template>
  <Card :title="t('web.microstock.usage.title')">
    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">{{ t('ui.loading') }}</span>
      </div>
    </div>

    <template v-else-if="billing">
      <div class="row g-3 mb-4">
        <div class="col-md-4">
          <div class="border rounded p-3 text-center">
            <div class="text-muted small">{{ t('web.microstock.usage.balance') }}</div>
            <div class="fs-5 fw-bold">{{ billing.balance_usd }}</div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="border rounded p-3 text-center">
            <div class="text-muted small">{{ t('web.microstock.usage.estimate') }}</div>
            <div class="fs-5 fw-bold">{{ billing.estimated_per_analysis_usd }}</div>
          </div>
        </div>
        <div v-if="billing.daily_free?.enabled" class="col-md-4">
          <div class="border rounded p-3 text-center">
            <div class="text-muted small">{{ t('web.microstock.usage.daily_free') }}</div>
            <div class="fs-5 fw-bold">{{ billing.daily_free.used }} / {{ billing.daily_free.limit }}</div>
          </div>
        </div>
      </div>

      <ul class="nav nav-tabs mb-3">
        <li class="nav-item">
          <button class="nav-link" :class="{ active: activeTab === 'ledger' }" @click="switchTab('ledger')">{{ t('web.microstock.usage.tabs.ledger') }}</button>
        </li>
        <li class="nav-item">
          <button class="nav-link" :class="{ active: activeTab === 'usage' }" @click="switchTab('usage')">{{ t('web.microstock.usage.tabs.usage') }}</button>
        </li>
        <li v-if="canViewPlatform" class="nav-item">
          <button class="nav-link" :class="{ active: activeTab === 'platform' }" @click="switchTab('platform')">{{ t('web.microstock.usage.tabs.platform') }}</button>
        </li>
      </ul>

      <!-- Ledger Tab -->
      <div v-if="activeTab === 'ledger'">
        <div v-if="ledgerLoading" class="text-center py-3">
          <div class="spinner-border spinner-border-sm text-primary" role="status">
            <span class="visually-hidden">{{ t('ui.loading') }}</span>
          </div>
        </div>
        <div v-else-if="ledger.length === 0" class="text-muted text-center py-3">{{ t('web.microstock.usage.no_ledger') }}</div>
        <div v-else>
          <div class="table-responsive">
            <table class="table table-sm table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>{{ t('web.microstock.usage.col_date') }}</th>
                  <th>{{ t('web.microstock.usage.col_description') }}</th>
                  <th class="text-end">{{ t('web.microstock.usage.col_amount') }}</th>
                  <th class="text-end">{{ t('web.microstock.usage.col_balance') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="entry in ledger" :key="entry.id">
                  <td class="small">{{ entry.created_at_formatted ?? entry.created_at ?? '—' }}</td>
                  <td class="small">{{ entry.description }}</td>
                  <td class="text-end small">{{ entry.amount_formatted }}</td>
                  <td class="text-end small">{{ entry.balance_formatted }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="ledgerHasMore" class="text-center mt-3">
            <button class="btn btn-outline-primary btn-sm" @click="loadLedger(false)">{{ t('web.microstock.usage.load_more') }}</button>
          </div>
        </div>
      </div>

      <!-- Usage Tab -->
      <div v-if="activeTab === 'usage'">
        <div v-if="usageLoading" class="text-center py-3">
          <div class="spinner-border spinner-border-sm text-primary" role="status">
            <span class="visually-hidden">{{ t('ui.loading') }}</span>
          </div>
        </div>
        <div v-else-if="usageEvents.length === 0" class="text-muted text-center py-3">{{ t('web.microstock.usage.no_usage_events') }}</div>
        <div v-else>
          <div class="table-responsive">
            <table class="table table-sm table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>{{ t('web.microstock.usage.col_date') }}</th>
                  <th>{{ t('web.microstock.usage.col_file') }}</th>
                  <th>{{ t('web.microstock.usage.col_stage') }}</th>
                  <th>{{ t('web.microstock.usage.col_model') }}</th>
                  <th class="text-end">{{ t('web.microstock.usage.col_tokens') }}</th>
                  <th class="text-end">{{ t('web.microstock.usage.col_cost') }}</th>
                  <th>{{ t('web.microstock.usage.col_source') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="ev in usageEvents" :key="ev.id">
                  <td class="small">{{ ev.created_at_formatted ?? ev.created_at ?? '—' }}</td>
                  <td class="small">{{ ev.file_name ?? '—' }}</td>
                  <td class="small">{{ ev.stage ?? '—' }}</td>
                  <td class="small"><code>{{ ev.resolved_model ?? '—' }}</code></td>
                  <td class="text-end small">{{ ev.total_tokens.toLocaleString() }}</td>
                  <td class="text-end small">{{ ev.billable_usd }}</td>
                  <td class="small">{{ ev.billing_source ?? '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="usageHasMore" class="text-center mt-3">
            <button class="btn btn-outline-primary btn-sm" @click="loadUsage(false)">{{ t('web.microstock.usage.load_more') }}</button>
          </div>
        </div>
      </div>

      <!-- Platform Tab -->
      <div v-if="activeTab === 'platform' && canViewPlatform">
        <div v-if="platformLoading" class="text-center py-3">
          <div class="spinner-border spinner-border-sm text-primary" role="status">
            <span class="visually-hidden">{{ t('ui.loading') }}</span>
          </div>
        </div>

        <template v-else-if="platformOverview">
          <div class="row g-3 mb-4">
            <div class="col-6 col-md-2">
              <div class="border rounded p-3 text-center">
                <div class="text-muted small">{{ t('web.microstock.usage.col_provider_cost') }}</div>
                <div class="fs-5 fw-bold">{{ platformOverview.totals.provider_cost_usd }}</div>
              </div>
            </div>
            <div class="col-6 col-md-2">
              <div class="border rounded p-3 text-center">
                <div class="text-muted small">{{ t('web.microstock.usage.col_billable') }}</div>
                <div class="fs-5 fw-bold">{{ platformOverview.totals.billable_usd }}</div>
              </div>
            </div>
            <div class="col-6 col-md-2">
              <div class="border rounded p-3 text-center">
                <div class="text-muted small">{{ t('web.microstock.usage.col_margin') }}</div>
                <div class="fs-5 fw-bold">{{ platformOverview.totals.margin_usd }}</div>
              </div>
            </div>
            <div class="col-6 col-md-2">
              <div class="border rounded p-3 text-center">
                <div class="text-muted small">{{ t('web.microstock.usage.col_events') }}</div>
                <div class="fs-5 fw-bold">{{ platformOverview.totals.event_count.toLocaleString() }}</div>
              </div>
            </div>
            <div class="col-6 col-md-2">
              <div class="border rounded p-3 text-center">
                <div class="text-muted small">{{ t('web.microstock.usage.col_users') }}</div>
                <div class="fs-5 fw-bold">{{ platformOverview.totals.unique_users.toLocaleString() }}</div>
              </div>
            </div>
            <div class="col-6 col-md-2">
              <div class="border rounded p-3 text-center">
                <div class="text-muted small">{{ t('web.microstock.usage.col_daily_free_cost') }}</div>
                <div class="fs-5 fw-bold">{{ platformOverview.daily_free.subsidized_provider_cost_usd }}</div>
              </div>
            </div>
          </div>

          <div class="row g-3 mb-4">
            <div class="col-md-4">
              <Card :title="t('web.microstock.usage.by_source')">
                <table class="table table-sm mb-0">
                  <tbody>
                    <tr v-for="(row, source) in platformOverview.by_billing_source" :key="source">
                      <td class="small">{{ source }}</td>
                      <td class="text-end small">{{ row.event_count }}</td>
                      <td class="text-end small">{{ row.billable_usd }}</td>
                    </tr>
                  </tbody>
                </table>
              </Card>
            </div>
            <div class="col-md-4">
              <Card :title="t('web.microstock.usage.by_stage')">
                <table class="table table-sm mb-0">
                  <tbody>
                    <tr v-for="row in platformOverview.by_stage" :key="row.stage">
                      <td class="small">{{ row.stage }}</td>
                      <td class="text-end small">{{ row.event_count }}</td>
                      <td class="text-end small">{{ row.billable_usd }}</td>
                    </tr>
                  </tbody>
                </table>
              </Card>
            </div>
            <div class="col-md-4">
              <Card :title="t('web.microstock.usage.by_model')">
                <table class="table table-sm mb-0">
                  <tbody>
                    <tr v-for="row in platformOverview.by_model" :key="row.resolved_model">
                      <td class="small"><code>{{ row.resolved_model }}</code></td>
                      <td class="text-end small">{{ row.event_count }}</td>
                      <td class="text-end small">{{ row.total_tokens.toLocaleString() }}</td>
                    </tr>
                  </tbody>
                </table>
              </Card>
            </div>
          </div>

          <Card :title="t('web.microstock.usage.all_usage_events')">
            <div v-if="platformEventsLoading" class="text-center py-3">
              <div class="spinner-border spinner-border-sm text-primary" role="status">
                <span class="visually-hidden">{{ t('ui.loading') }}</span>
              </div>
            </div>
            <div v-else-if="platformEvents.length === 0" class="text-muted text-center py-3">
              {{ t('web.microstock.usage.no_events') }}
            </div>
            <div v-else>
              <div class="table-responsive">
                <table class="table table-sm table-hover align-middle mb-0">
                  <thead>
                    <tr>
                      <th>{{ t('web.microstock.usage.col_date') }}</th>
                      <th>{{ t('web.microstock.usage.col_user') }}</th>
                      <th>{{ t('web.microstock.usage.col_file') }}</th>
                      <th>{{ t('web.microstock.usage.col_stage') }}</th>
                      <th class="text-end">{{ t('web.microstock.usage.col_provider_cost') }}</th>
                      <th class="text-end">{{ t('web.microstock.usage.col_cost') }}</th>
                      <th>{{ t('web.microstock.usage.col_source') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="ev in platformEvents" :key="ev.id">
                      <td class="small">{{ ev.created_at ?? '—' }}</td>
                      <td class="small">{{ ev.user?.name ?? '—' }}</td>
                      <td class="small">{{ ev.file_name ?? '—' }}</td>
                      <td class="small">{{ ev.stage ?? '—' }}</td>
                      <td class="text-end small">{{ ev.provider_cost_usd }}</td>
                      <td class="text-end small">{{ ev.billable_usd }}</td>
                      <td class="small">{{ ev.billing_source ?? '—' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-if="platformEventsHasMore" class="text-center mt-3">
                <button class="btn btn-outline-primary btn-sm" @click="loadPlatformEvents(false)">{{ t('web.microstock.usage.load_more') }}</button>
              </div>
            </div>
          </Card>
        </template>
      </div>
    </template>
  </Card>
</template>
