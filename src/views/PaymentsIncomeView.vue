<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import ErrorState from '@/components/ErrorState.vue'
import SkeletonBlock from '@/components/SkeletonBlock.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import FormInput from '@/components/FormInput.vue'
import FormSelect from '@/components/FormSelect.vue'
import { usePaymentsIncome } from '@/composables/usePaymentsIncome'
import { useInvoices } from '@/composables/useInvoices'
import { usePaymentsHydrate } from '@/composables/usePaymentsHydrate'
import { usePaymentRealtime } from '@/composables/usePaymentRealtime'
import { useAlert } from '@/composables/useAlert'
import type { PaymentIncomeOverview, Invoice } from '@/api/types'
import { INVOICE_STATUS_BADGE } from '@/utils/statusBadge'

const { t } = useI18n()
const { fetchOverview, fetchInvoices } = usePaymentsIncome()
const { exportCsv } = useInvoices()
const { hydrateIncome } = usePaymentsHydrate()
const { error: showError } = useAlert()
const exporting = ref(false)

const overview = ref<PaymentIncomeOverview | null>(null)
const invoices = ref<Invoice[]>([])
const loading = ref(false)
const overviewError = ref<string | null>(null)
const invoicesLoading = ref(false)
const invoicesError = ref<string | null>(null)
const loadingMore = ref(false)
const hasMorePages = ref(false)
const currentPage = ref(1)

const filters = reactive({
  from: '',
  to: '',
  basis: 'paid_at',
  gateway: '',
})

const basisOptions = computed(() => [
  { value: 'paid_at', label: t('web.payments.income.filters.basis_paid_at') },
  { value: 'withdrawable_at', label: t('web.payments.income.filters.basis_withdrawable_at') },
])

const gatewayOptions = computed(() => [
  { value: '', label: t('web.payments.income.filters.all_gateways') },
  { value: 'midtrans', label: t('web.payments.income.filters.gateway_midtrans') },
  { value: 'ipaymu', label: t('web.payments.income.filters.gateway_ipaymu') },
])

const pipelineBuckets = computed(() => {
  if (!overview.value?.pipeline) return []
  return [
    { key: 'awaiting_settlement', label: t('web.payments.income.pipeline.awaiting_settlement') },
    { key: 'ready_to_disburse', label: t('web.payments.income.pipeline.ready_to_disburse') },
    { key: 'in_payout', label: t('web.payments.income.pipeline.in_payout') },
    { key: 'disbursed', label: t('web.payments.income.pipeline.disbursed') },
    { key: 'failed_payout', label: t('web.payments.income.pipeline.failed_payout') },
  ].map((b) => ({
    ...b,
    data: overview.value!.pipeline[b.key] ?? { invoice_count: 0, service_revenue: 0, service_revenue_formatted: '—' },
  }))
})

function buildParams(): Record<string, unknown> {
  const params: Record<string, unknown> = { basis: filters.basis }
  if (filters.from) params.from = filters.from
  if (filters.to) params.to = filters.to
  if (filters.gateway) params.gateway = filters.gateway
  return params
}

async function loadOverview(): Promise<void> {
  loading.value = true
  overviewError.value = null
  try {
    overview.value = await fetchOverview(buildParams())
  } catch (e) {
    overviewError.value = e instanceof Error ? e.message : t('web.payments.income.load_overview_failed')
  } finally {
    loading.value = false
  }
}

async function loadInvoices(reset = true): Promise<void> {
  if (reset) {
    invoicesLoading.value = true
    invoicesError.value = null
    currentPage.value = 1
    invoices.value = []
  } else {
    loadingMore.value = true
    currentPage.value++
  }

  try {
    const params = { ...buildParams(), per_page: 20, page: currentPage.value }
    const res = await fetchInvoices(params)
    if (reset) {
      invoices.value = res.items
    } else {
      invoices.value.push(...res.items)
    }
    hasMorePages.value = currentPage.value < res.pagination.last_page
  } catch (e) {
    const message = e instanceof Error ? e.message : t('web.payments.income.load_invoices_failed')
    if (reset) {
      invoicesError.value = message
    } else {
      showError(message)
    }
  } finally {
    invoicesLoading.value = false
    loadingMore.value = false
  }
}

async function applyFilters(): Promise<void> {
  const batchResult = await hydrateIncome(buildParams()).catch(() => null)
  if (batchResult?.overview) {
    overview.value = batchResult.overview
    if (batchResult.invoices) {
      invoices.value = batchResult.invoices.items
      hasMorePages.value = batchResult.invoices.pagination.current_page < batchResult.invoices.pagination.last_page
    }
  } else {
    await loadOverview()
    await loadInvoices(true)
  }
}

async function handleExport(): Promise<void> {
  if (exporting.value) return
  exporting.value = true
  try {
    const query: Record<string, unknown> = { status: 'paid' }
    if (filters.from) query.paid_from = filters.from
    if (filters.to) query.paid_to = filters.to
    await exportCsv(query)
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.file-hosting.operation_failed'))
  } finally {
    exporting.value = false
  }
}

const { subscribeAdminList, unsubscribeAdminList } = usePaymentRealtime()

onMounted(() => {
  void applyFilters()
  subscribeAdminList(() => { void applyFilters() })
})

onUnmounted(() => {
  unsubscribeAdminList()
})

</script>

<template>
  <Card :title="t('web.payments.income.title')">
    <template #actions>
      <button type="button" class="btn btn-outline-secondary btn-sm" :disabled="exporting" @click="handleExport">
        <span v-if="exporting" class="spinner-border spinner-border-sm me-1"></span>
        <i v-else class="bi bi-download me-1"></i>{{ t('web.payments.invoices.export_csv') }}
      </button>
    </template>
    <form class="row g-2 mb-4" @submit.prevent="applyFilters">
      <div class="col-md-2">
        <FormInput name="from" :label="t('web.payments.income.filters.from')" type="date" v-model="filters.from" />
      </div>
      <div class="col-md-2">
        <FormInput name="to" :label="t('web.payments.income.filters.to')" type="date" v-model="filters.to" />
      </div>
      <div class="col-md-3">
        <FormSelect name="basis" :label="t('web.payments.income.filters.basis')" v-model="filters.basis" :options="basisOptions" />
      </div>
      <div class="col-md-3">
        <FormSelect name="gateway" :label="t('web.payments.income.filters.gateway')" v-model="filters.gateway" :options="gatewayOptions" />
      </div>
      <div class="col-md-2 d-flex align-items-end">
        <button type="submit" class="btn btn-primary btn-sm w-100">{{ t('web.payments.income.filters.apply') }}</button>
      </div>
    </form>

    <div v-if="loading" class="py-2">
      <div class="row g-3 mb-4">
        <div v-for="i in 5" :key="i" class="col-6 col-md">
          <div class="border rounded p-3 text-center">
            <SkeletonBlock variant="line" :lines="1" width="70%" class="mx-auto" />
            <SkeletonBlock variant="line" :lines="1" width="50%" class="mx-auto mb-0" />
          </div>
        </div>
      </div>
      <SkeletonBlock variant="block" height="6rem" />
    </div>

    <ErrorState
      v-else-if="overviewError"
      :message="overviewError"
      @retry="applyFilters"
    />

    <template v-else-if="overview">
      <div class="row g-3 mb-4">
        <div class="col-6 col-md">
          <div class="border rounded p-3 text-center">
            <div class="text-muted small">{{ t('web.payments.income.summary.service_revenue') }}</div>
            <div class="fs-5 fw-bold">{{ overview.summary.service_revenue_formatted }}</div>
          </div>
        </div>
        <div class="col-6 col-md">
          <div class="border rounded p-3 text-center">
            <div class="text-muted small">{{ t('web.payments.income.summary.buyer_fees') }}</div>
            <div class="fs-5 fw-bold">{{ overview.summary.buyer_fees_formatted }}</div>
          </div>
        </div>
        <div class="col-6 col-md">
          <div class="border rounded p-3 text-center">
            <div class="text-muted small">{{ t('web.payments.income.summary.cash_collected') }}</div>
            <div class="fs-5 fw-bold">{{ overview.summary.cash_collected_formatted }}</div>
          </div>
        </div>
        <div class="col-6 col-md">
          <div class="border rounded p-3 text-center">
            <div class="text-muted small">{{ t('web.payments.income.summary.invoice_count') }}</div>
            <div class="fs-5 fw-bold">{{ overview.summary.invoice_count }}</div>
          </div>
        </div>
        <div class="col-6 col-md">
          <div class="border rounded p-3 text-center">
            <div class="text-muted small">{{ t('web.payments.income.summary.avg_order_value') }}</div>
            <div class="fs-5 fw-bold">{{ overview.summary.avg_order_value_formatted }}</div>
          </div>
        </div>
      </div>

      <div class="row g-3 mb-4">
        <div v-for="bucket in pipelineBuckets" :key="bucket.key" class="col-6 col-md">
          <div class="border rounded p-3 text-center">
            <div class="text-muted small">{{ bucket.label }}</div>
            <div class="fs-5 fw-bold">{{ bucket.data.invoice_count }}</div>
            <div class="small text-muted">{{ bucket.data.service_revenue_formatted }}</div>
          </div>
        </div>
      </div>

      <div class="row g-3 mb-4">
        <div class="col-md-4">
          <Card :title="t('web.payments.income.breakdown.gateway')">
            <div v-if="overview.by_gateway.length === 0" class="text-muted small">{{ t('web.payments.income.no_data') }}</div>
            <table v-else class="table table-sm mb-0">
              <tbody>
                <tr v-for="row in overview.by_gateway" :key="row.label">
                  <td class="small">{{ row.label }}</td>
                  <td class="text-end small">{{ row.invoice_count }}</td>
                  <td class="text-end small">{{ row.service_revenue_formatted }}</td>
                </tr>
              </tbody>
            </table>
          </Card>
        </div>
        <div class="col-md-4">
          <Card :title="t('web.payments.income.breakdown.channel')">
            <div v-if="overview.by_channel.length === 0" class="text-muted small">{{ t('web.payments.income.no_data') }}</div>
            <table v-else class="table table-sm mb-0">
              <tbody>
                <tr v-for="row in overview.by_channel" :key="row.label">
                  <td class="small">{{ row.label }}</td>
                  <td class="text-end small">{{ row.invoice_count }}</td>
                  <td class="text-end small">{{ row.service_revenue_formatted }}</td>
                </tr>
              </tbody>
            </table>
          </Card>
        </div>
        <div class="col-md-4">
          <Card :title="t('web.payments.income.breakdown.product')">
            <div v-if="overview.by_invoiceable_type.length === 0" class="text-muted small">{{ t('web.payments.income.no_data') }}</div>
            <table v-else class="table table-sm mb-0">
              <tbody>
                <tr v-for="row in overview.by_invoiceable_type" :key="row.label">
                  <td class="small">{{ row.label }}</td>
                  <td class="text-end small">{{ row.invoice_count }}</td>
                  <td class="text-end small">{{ row.service_revenue_formatted }}</td>
                </tr>
              </tbody>
            </table>
          </Card>
        </div>
      </div>

      <Card :title="t('web.payments.income.daily.title')" class="mb-4">
        <div v-if="overview.daily.length === 0" class="text-muted small">{{ t('web.payments.income.no_data') }}</div>
        <div v-else class="table-responsive">
          <table class="table table-sm mb-0">
            <thead>
              <tr>
                <th>{{ t('web.payments.income.daily.date') }}</th>
                <th class="text-end">{{ t('web.payments.income.daily.invoices') }}</th>
                <th class="text-end">{{ t('web.payments.income.daily.service_revenue') }}</th>
                <th class="text-end">{{ t('web.payments.income.daily.cash_collected') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="day in overview.daily" :key="day.day">
                <td class="small">{{ day.day }}</td>
                <td class="text-end small">{{ day.invoice_count }}</td>
                <td class="text-end small">{{ day.service_revenue_formatted }}</td>
                <td class="text-end small">{{ day.cash_collected_formatted }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card :title="t('web.payments.income.invoices_title')">
        <div v-if="invoicesLoading" class="py-2">
          <div v-for="i in 5" :key="i" class="d-flex align-items-center gap-3 py-2 border-bottom">
            <SkeletonBlock variant="line" :lines="1" width="40%" class="mb-0" />
            <SkeletonBlock variant="line" :lines="1" width="5rem" class="ms-auto mb-0" />
          </div>
        </div>
        <ErrorState
          v-else-if="invoicesError"
          :message="invoicesError"
          @retry="loadInvoices(true)"
        />
        <div v-else-if="invoices.length === 0" class="text-muted text-center py-3">
          {{ t('web.payments.income.no_invoices') }}
        </div>
        <div v-else>
          <div class="table-responsive">
            <table class="table table-sm table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>{{ t('web.payments.income.table.invoice_number') }}</th>
                  <th class="text-center">{{ t('web.payments.income.table.status') }}</th>
                  <th class="text-end">{{ t('web.payments.income.table.subtotal') }}</th>
                  <th class="text-end">{{ t('web.payments.income.table.fee') }}</th>
                  <th class="text-end">{{ t('web.payments.income.table.total') }}</th>
                  <th>{{ t('web.payments.income.table.created') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="inv in invoices" :key="inv.id">
                  <td><code class="small">{{ inv.invoice_number }}</code></td>
                  <td class="text-center">
                    <StatusBadge :status="inv.status" :mapping="INVOICE_STATUS_BADGE" fallback="light" />
                  </td>
                  <td class="text-end small">{{ inv.subtotal_formatted ?? inv.subtotal ?? '—' }}</td>
                  <td class="text-end small">{{ inv.payment_channel_fee_formatted ?? inv.payment_channel_fee ?? '—' }}</td>
                  <td class="text-end small">{{ inv.customer_gross_total_formatted ?? inv.customer_gross_total ?? '—' }}</td>
                  <td class="small">{{ inv.created_at_formatted ?? inv.created_at ?? '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="hasMorePages" class="text-center mt-3">
            <button class="btn btn-outline-primary btn-sm" :disabled="loadingMore" @click="loadInvoices(false)">
              <span v-if="loadingMore" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
              {{ t('web.payments.income.load_more') }}
            </button>
          </div>
        </div>
      </Card>
    </template>
  </Card>
</template>
