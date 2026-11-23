<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import ErrorState from '@/components/ErrorState.vue'
import SkeletonBlock from '@/components/SkeletonBlock.vue'
import TableEmptyRow from '@/components/TableEmptyRow.vue'
import ArMicrostockPlatformTab from '@/features/archivd/components/ArMicrostockPlatformTab.vue'
import { useMicrostockUsageTabs } from '@/features/microstock/composables/useMicrostockUsageTabs'
import { useEchoResync } from '@/composables/useEcho'
import type { MicrostockLedgerEntry, MicrostockUsageEvent } from '@/features/microstock/types'

/**
 * Microstock usage/billing view — thin shell over useMicrostockUsageTabs
 * composable + ArMicrostockPlatformTab for the admin platform tab.
 */
const { t, locale } = useI18n()

const formatNumber = (value: number): string => new Intl.NumberFormat(locale.value).format(value)

const {
  canViewPlatform,
  activeTab,
  billing,
  ledger,
  usageEvents,
  platformOverview,
  platformEvents,
  loading,
  billingError,
  ledgerLoading,
  ledgerError,
  usageLoading,
  usageError,
  platformLoading,
  platformError,
  platformEventsLoading,
  platformEventsError,
  ledgerHasMore,
  usageHasMore,
  platformEventsHasMore,
  loadBilling,
  loadLedger,
  loadUsage,
  loadPlatform,
  loadPlatformEvents,
  switchTab,
} = useMicrostockUsageTabs()

// Socket-outage recovery: re-pull what onMounted loads (billing + ledger) and
// the platform tab data when the admin tab is available.
useEchoResync(() => {
  void loadBilling().then(() => {
    if (ledger.value.length === 0 && !ledgerHasMore.value) {
      void loadLedger(true)
    }
  })
  void loadUsage(true)
  if (canViewPlatform.value) {
    void loadPlatform()
    if (platformEvents.value.length === 0 && !platformEventsHasMore.value) {
      void loadPlatformEvents(true)
    }
  }
})

const ledgerRows = computed<MicrostockLedgerEntry[]>(() => ledger.value)
const usageRows = computed<MicrostockUsageEvent[]>(() => usageEvents.value)
</script>

<template>
  <Card :title="t('web.microstock.usage.title')">
    <div v-if="loading" class="py-2">
      <div class="row g-3 mb-4">
        <div v-for="i in 3" :key="i" class="col-md-4">
          <div class="border rounded p-3 text-center">
            <SkeletonBlock variant="line" :lines="1" width="60%" class="mx-auto" />
            <SkeletonBlock variant="line" :lines="1" width="40%" class="mx-auto mb-0" />
          </div>
        </div>
      </div>
      <SkeletonBlock variant="block" height="4rem" />
    </div>

    <ErrorState
      v-else-if="billingError"
      :message="billingError"
      @retry="loadBilling"
    />

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
        <div v-if="ledgerLoading" class="py-2">
          <div v-for="i in 5" :key="i" class="d-flex align-items-center gap-3 py-2 border-bottom">
            <SkeletonBlock variant="line" :lines="1" width="50%" class="mb-0" />
            <SkeletonBlock variant="line" :lines="1" width="5rem" class="ms-auto mb-0" />
          </div>
        </div>
        <ErrorState
          v-else-if="ledgerError"
          :message="ledgerError"
          @retry="loadLedger(true)"
        />
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
                <TableEmptyRow
                  v-if="ledgerRows.length === 0"
                  :colspan="4"
                  icon="bi-journal-text"
                  :title="t('web.microstock.usage.no_ledger')"
                />
                <tr v-for="entry in ledgerRows" :key="entry.id">
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
        <div v-if="usageLoading" class="py-2">
          <div v-for="i in 5" :key="i" class="d-flex align-items-center gap-3 py-2 border-bottom">
            <SkeletonBlock variant="line" :lines="1" width="50%" class="mb-0" />
            <SkeletonBlock variant="line" :lines="1" width="5rem" class="ms-auto mb-0" />
          </div>
        </div>
        <ErrorState
          v-else-if="usageError"
          :message="usageError"
          @retry="loadUsage(true)"
        />
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
                <TableEmptyRow
                  v-if="usageRows.length === 0"
                  :colspan="7"
                  icon="bi-graph-up"
                  :title="t('web.microstock.usage.no_usage_events')"
                />
                <tr v-for="ev in usageRows" :key="ev.id">
                  <td class="small">{{ ev.created_at_formatted ?? ev.created_at ?? '—' }}</td>
                  <td class="small">{{ ev.file_name ?? '—' }}</td>
                  <td class="small">{{ ev.stage ?? '—' }}</td>
                  <td class="small"><code>{{ ev.resolved_model ?? '—' }}</code></td>
                  <td class="text-end small">{{ formatNumber(ev.total_tokens) }}</td>
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
        <ArMicrostockPlatformTab
          :loading="platformLoading"
          :error="platformError"
          :overview="platformOverview"
          :events="platformEvents"
          :events-loading="platformEventsLoading"
          :events-error="platformEventsError"
          :events-has-more="platformEventsHasMore"
          @retry-overview="loadPlatform"
          @load-more-events="platformEvents.length === 0 ? loadPlatformEvents(true) : loadPlatformEvents(false)"
        />
      </div>
    </template>
  </Card>
</template>
