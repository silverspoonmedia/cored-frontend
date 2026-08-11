<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import Card from '@/components/Card.vue'
import FormInput from '@/components/FormInput.vue'
import FormSelect from '@/components/FormSelect.vue'
import { usePaymentsIncome } from '@/composables/usePaymentsIncome'
import { useAlert } from '@/composables/useAlert'
import type { PaymentIncomeOverview, Invoice } from '@/api/types'

const { fetchOverview, fetchInvoices } = usePaymentsIncome()
const { error: showError } = useAlert()

const overview = ref<PaymentIncomeOverview | null>(null)
const invoices = ref<Invoice[]>([])
const loading = ref(false)
const invoicesLoading = ref(false)
const loadingMore = ref(false)
const hasMorePages = ref(false)
const currentPage = ref(1)

const filters = reactive({
  from: '',
  to: '',
  basis: 'paid_at',
  gateway: '',
})

const basisOptions = [
  { value: 'paid_at', label: 'Paid At' },
  { value: 'withdrawable_at', label: 'Withdrawable At' },
]

const gatewayOptions = [
  { value: '', label: 'All Gateways' },
  { value: 'midtrans', label: 'Midtrans' },
  { value: 'ipaymu', label: 'iPaymu' },
]

const pipelineBuckets = computed(() => {
  if (!overview.value?.pipeline) return []
  return [
    { key: 'awaiting_settlement', label: 'Awaiting Settlement' },
    { key: 'ready_to_disburse', label: 'Ready to Disburse' },
    { key: 'in_payout', label: 'In Payout' },
    { key: 'disbursed', label: 'Disbursed' },
    { key: 'failed_payout', label: 'Failed Payout' },
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
  try {
    overview.value = await fetchOverview(buildParams())
  } catch (e) {
    showError(e instanceof Error ? e.message : 'Failed to load overview')
  } finally {
    loading.value = false
  }
}

async function loadInvoices(reset = true): Promise<void> {
  if (reset) {
    invoicesLoading.value = true
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
    showError(e instanceof Error ? e.message : 'Failed to load invoices')
  } finally {
    invoicesLoading.value = false
    loadingMore.value = false
  }
}

async function applyFilters(): Promise<void> {
  await loadOverview()
  await loadInvoices(true)
}

onMounted(applyFilters)

function statusClass(status: string): string {
  const map: Record<string, string> = {
    paid: 'text-bg-success',
    pending: 'text-bg-warning',
    expired: 'text-bg-secondary',
    failed: 'text-bg-danger',
  }
  return map[status.toLowerCase()] ?? 'text-bg-light'
}
</script>

<template>
  <Card title="Payments Income">
    <form class="row g-2 mb-4" @submit.prevent="applyFilters">
      <div class="col-md-2">
        <FormInput name="from" label="From" type="date" v-model="filters.from" />
      </div>
      <div class="col-md-2">
        <FormInput name="to" label="To" type="date" v-model="filters.to" />
      </div>
      <div class="col-md-3">
        <FormSelect name="basis" label="Basis" v-model="filters.basis" :options="basisOptions" />
      </div>
      <div class="col-md-3">
        <FormSelect name="gateway" label="Gateway" v-model="filters.gateway" :options="gatewayOptions" />
      </div>
      <div class="col-md-2 d-flex align-items-end">
        <button type="submit" class="btn btn-primary btn-sm w-100">Filter</button>
      </div>
    </form>

    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading…</span>
      </div>
    </div>

    <template v-else-if="overview">
      <div class="row g-3 mb-4">
        <div class="col-6 col-md">
          <div class="border rounded p-3 text-center">
            <div class="text-muted small">Service Revenue</div>
            <div class="fs-5 fw-bold">{{ overview.summary.service_revenue_formatted }}</div>
          </div>
        </div>
        <div class="col-6 col-md">
          <div class="border rounded p-3 text-center">
            <div class="text-muted small">Buyer Fees</div>
            <div class="fs-5 fw-bold">{{ overview.summary.buyer_fees_formatted }}</div>
          </div>
        </div>
        <div class="col-6 col-md">
          <div class="border rounded p-3 text-center">
            <div class="text-muted small">Cash Collected</div>
            <div class="fs-5 fw-bold">{{ overview.summary.cash_collected_formatted }}</div>
          </div>
        </div>
        <div class="col-6 col-md">
          <div class="border rounded p-3 text-center">
            <div class="text-muted small">Invoices</div>
            <div class="fs-5 fw-bold">{{ overview.summary.invoice_count }}</div>
          </div>
        </div>
        <div class="col-6 col-md">
          <div class="border rounded p-3 text-center">
            <div class="text-muted small">Avg Order Value</div>
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
          <Card title="By Gateway">
            <div v-if="overview.by_gateway.length === 0" class="text-muted small">No data</div>
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
          <Card title="By Channel">
            <div v-if="overview.by_channel.length === 0" class="text-muted small">No data</div>
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
          <Card title="By Product">
            <div v-if="overview.by_invoiceable_type.length === 0" class="text-muted small">No data</div>
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

      <Card title="Daily Breakdown" class="mb-4">
        <div v-if="overview.daily.length === 0" class="text-muted small">No data</div>
        <div v-else class="table-responsive">
          <table class="table table-sm mb-0">
            <thead>
              <tr>
                <th>Date</th>
                <th class="text-end">Invoices</th>
                <th class="text-end">Service Revenue</th>
                <th class="text-end">Cash Collected</th>
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

      <Card title="Invoices">
        <div v-if="invoicesLoading" class="text-center py-3">
          <div class="spinner-border spinner-border-sm text-primary" role="status">
            <span class="visually-hidden">Loading…</span>
          </div>
        </div>
        <div v-else-if="invoices.length === 0" class="text-muted text-center py-3">
          No invoices found.
        </div>
        <div v-else>
          <div class="table-responsive">
            <table class="table table-sm table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>Invoice Number</th>
                  <th class="text-center">Status</th>
                  <th class="text-end">Subtotal</th>
                  <th class="text-end">Fee</th>
                  <th class="text-end">Total</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="inv in invoices" :key="inv.id">
                  <td><code class="small">{{ inv.invoice_number }}</code></td>
                  <td class="text-center">
                    <span class="badge" :class="statusClass(inv.status)">{{ inv.status }}</span>
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
              Load More
            </button>
          </div>
        </div>
      </Card>
    </template>
  </Card>
</template>
