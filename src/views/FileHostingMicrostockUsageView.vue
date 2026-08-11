<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import Card from '@/components/Card.vue'
import { useFileHostingUsage } from '@/composables/useFileHostingUsage'
import { useAuth } from '@/stores/auth'
import { useAlert } from '@/composables/useAlert'
import type {
  MicrostockBillingSummary,
  MicrostockLedgerEntry,
  MicrostockUsageEvent,
  MicrostockPlatformOverview,
  InferenceUsageEvent,
} from '@/api/types'

const { fetchBilling, fetchLedger, fetchUsageEvents, fetchAdminOverview, fetchAdminUsageEvents } =
  useFileHostingUsage()
const { hasPermission } = useAuth()
const { error: showError } = useAlert()

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
    showError(e instanceof Error ? e.message : 'Failed to load billing')
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
    showError(e instanceof Error ? e.message : 'Failed to load ledger')
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
    showError(e instanceof Error ? e.message : 'Failed to load usage events')
  } finally {
    usageLoading.value = false
  }
}

async function loadPlatform(): Promise<void> {
  platformLoading.value = true
  try {
    platformOverview.value = await fetchAdminOverview()
  } catch (e) {
    showError(e instanceof Error ? e.message : 'Failed to load platform overview')
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
    showError(e instanceof Error ? e.message : 'Failed to load platform events')
  } finally {
    platformEventsLoading.value = false
  }
}

onMounted(async () => {
  await loadBilling()
  await loadLedger(true)
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
  <Card title="Microstock Usage">
    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading…</span>
      </div>
    </div>

    <template v-else-if="billing">
      <div class="row g-3 mb-4">
        <div class="col-md-4">
          <div class="border rounded p-3 text-center">
            <div class="text-muted small">Balance</div>
            <div class="fs-5 fw-bold">{{ billing.balance_formatted }}</div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="border rounded p-3 text-center">
            <div class="text-muted small">Estimate</div>
            <div class="fs-5 fw-bold">{{ billing.estimate_formatted }}</div>
          </div>
        </div>
        <div v-if="billing.daily_free?.enabled" class="col-md-4">
          <div class="border rounded p-3 text-center">
            <div class="text-muted small">Daily Free</div>
            <div class="fs-5 fw-bold">{{ billing.daily_free.slots_consumed_today }} / {{ billing.daily_free.daily_limit }}</div>
          </div>
        </div>
      </div>

      <ul class="nav nav-tabs mb-3">
        <li class="nav-item">
          <button class="nav-link" :class="{ active: activeTab === 'ledger' }" @click="switchTab('ledger')">Ledger</button>
        </li>
        <li class="nav-item">
          <button class="nav-link" :class="{ active: activeTab === 'usage' }" @click="switchTab('usage')">Usage</button>
        </li>
        <li v-if="canViewPlatform" class="nav-item">
          <button class="nav-link" :class="{ active: activeTab === 'platform' }" @click="switchTab('platform')">Platform</button>
        </li>
      </ul>

      <!-- Ledger Tab -->
      <div v-if="activeTab === 'ledger'">
        <div v-if="ledgerLoading" class="text-center py-3">
          <div class="spinner-border spinner-border-sm text-primary" role="status">
            <span class="visually-hidden">Loading…</span>
          </div>
        </div>
        <div v-else-if="ledger.length === 0" class="text-muted text-center py-3">No ledger entries found.</div>
        <div v-else>
          <div class="table-responsive">
            <table class="table table-sm table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th class="text-end">Amount</th>
                  <th class="text-end">Balance</th>
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
            <button class="btn btn-outline-primary btn-sm" @click="loadLedger(false)">Load More</button>
          </div>
        </div>
      </div>

      <!-- Usage Tab -->
      <div v-if="activeTab === 'usage'">
        <div v-if="usageLoading" class="text-center py-3">
          <div class="spinner-border spinner-border-sm text-primary" role="status">
            <span class="visually-hidden">Loading…</span>
          </div>
        </div>
        <div v-else-if="usageEvents.length === 0" class="text-muted text-center py-3">No usage events found.</div>
        <div v-else>
          <div class="table-responsive">
            <table class="table table-sm table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>File</th>
                  <th>Stage</th>
                  <th>Model</th>
                  <th class="text-end">Tokens</th>
                  <th class="text-end">Cost</th>
                  <th>Source</th>
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
            <button class="btn btn-outline-primary btn-sm" @click="loadUsage(false)">Load More</button>
          </div>
        </div>
      </div>

      <!-- Platform Tab -->
      <div v-if="activeTab === 'platform' && canViewPlatform">
        <div v-if="platformLoading" class="text-center py-3">
          <div class="spinner-border spinner-border-sm text-primary" role="status">
            <span class="visually-hidden">Loading…</span>
          </div>
        </div>

        <template v-else-if="platformOverview">
          <div class="row g-3 mb-4">
            <div class="col-6 col-md-2">
              <div class="border rounded p-3 text-center">
                <div class="text-muted small">Provider Cost</div>
                <div class="fs-5 fw-bold">{{ platformOverview.totals.provider_cost_usd }}</div>
              </div>
            </div>
            <div class="col-6 col-md-2">
              <div class="border rounded p-3 text-center">
                <div class="text-muted small">Billable</div>
                <div class="fs-5 fw-bold">{{ platformOverview.totals.billable_usd }}</div>
              </div>
            </div>
            <div class="col-6 col-md-2">
              <div class="border rounded p-3 text-center">
                <div class="text-muted small">Margin</div>
                <div class="fs-5 fw-bold">{{ platformOverview.totals.margin_usd }}</div>
              </div>
            </div>
            <div class="col-6 col-md-2">
              <div class="border rounded p-3 text-center">
                <div class="text-muted small">Events</div>
                <div class="fs-5 fw-bold">{{ platformOverview.totals.event_count.toLocaleString() }}</div>
              </div>
            </div>
            <div class="col-6 col-md-2">
              <div class="border rounded p-3 text-center">
                <div class="text-muted small">Users</div>
                <div class="fs-5 fw-bold">{{ platformOverview.totals.unique_users.toLocaleString() }}</div>
              </div>
            </div>
            <div class="col-6 col-md-2">
              <div class="border rounded p-3 text-center">
                <div class="text-muted small">Daily Free Cost</div>
                <div class="fs-5 fw-bold">{{ platformOverview.daily_free.subsidized_provider_cost_usd }}</div>
              </div>
            </div>
          </div>

          <div class="row g-3 mb-4">
            <div class="col-md-4">
              <Card title="By Source">
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
              <Card title="By Stage">
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
              <Card title="By Model">
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

          <Card title="All Usage Events">
            <div v-if="platformEventsLoading" class="text-center py-3">
              <div class="spinner-border spinner-border-sm text-primary" role="status">
                <span class="visually-hidden">Loading…</span>
              </div>
            </div>
            <div v-else-if="platformEvents.length === 0" class="text-muted text-center py-3">
              No events found.
            </div>
            <div v-else>
              <div class="table-responsive">
                <table class="table table-sm table-hover align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>User</th>
                      <th>File</th>
                      <th>Stage</th>
                      <th class="text-end">Provider Cost</th>
                      <th class="text-end">Cost</th>
                      <th>Source</th>
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
                <button class="btn btn-outline-primary btn-sm" @click="loadPlatformEvents(false)">Load More</button>
              </div>
            </div>
          </Card>
        </template>
      </div>
    </template>
  </Card>
</template>
