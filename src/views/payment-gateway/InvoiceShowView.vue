<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import CheckoutPanel from '@/components/payment-gateway/CheckoutPanel.vue'
import ErrorState from '@/components/ErrorState.vue'
import SkeletonBlock from '@/components/SkeletonBlock.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useInvoices } from '@/composables/payment-gateway/useInvoices'
import { usePaymentRealtime } from '@/composables/payment-gateway/usePaymentRealtime'
import { useDetailLoader } from '@/composables/useDetailLoader'
import { useEchoResync } from '@/composables/useEcho'
import type { InvoiceStatusPayload } from '@/api/types'
import { INVOICE_STATUS_BADGE } from '@/utils/statusBadge'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { fetchOne } = useInvoices()

const { data: invoice, loading, error: loadError, load } = useDetailLoader(
  () => fetchOne(route.params.id as string),
  { fallbackMessage: t('web.payments.invoices.load_failed') },
)

function onStatusUpdated(status: string): void {
  if (invoice.value) {
    invoice.value = { ...invoice.value, status }
  }
}

function onInvoiceUpdated(payload: InvoiceStatusPayload): void {
  if (invoice.value) {
    invoice.value = {
      ...invoice.value,
      status: payload.status,
      paid_at: payload.paid_at,
      expired_at: payload.expired_at,
    }
  }
}

// Live update: direct status subscription when the checkout panel is not
// rendered (e.g. already-paid invoices viewed elsewhere/another tab).
const { subscribeInvoice, unsubscribeInvoice } = usePaymentRealtime()

onMounted(() => {
  const id = route.params.id as string
  if (id) {
    subscribeInvoice(id, onInvoiceUpdated)
  }
})

onUnmounted(() => {
  unsubscribeInvoice()
})

useEchoResync(() => { void load() })
</script>

<template>
  <div v-if="loading" class="row g-3">
    <div class="col-lg-8">
      <div class="card">
        <div class="card-body">
          <SkeletonBlock variant="line" :lines="1" width="30%" />
          <SkeletonBlock variant="line" :lines="8" />
        </div>
      </div>
    </div>
    <div class="col-lg-4">
      <div class="card">
        <div class="card-body">
          <SkeletonBlock variant="line" :lines="1" width="50%" />
          <SkeletonBlock variant="block" height="6rem" />
          <SkeletonBlock variant="button" width="8rem" />
        </div>
      </div>
    </div>
  </div>

  <ErrorState v-else-if="loadError" :message="loadError" @retry="load" />

  <div v-else-if="invoice" class="row g-3">
    <div class="col-lg-8">
      <Card :title="t('web.payments.invoices.show_card_title', { number: invoice.invoice_number })">
        <template #actions>
          <button
            class="btn btn-outline-secondary btn-sm"
            @click="router.push({ name: 'invoices.index.view' })"
          >
            <i class="bi bi-arrow-left me-1"></i> {{ t('ui.actions.back') }}
          </button>
        </template>

        <div class="mb-3">
          <StatusBadge :status="invoice.status" :mapping="INVOICE_STATUS_BADGE" fallback="light" extra-class="fs-6" />
        </div>

        <dl class="row mb-0">
          <dt class="col-sm-3">{{ t('web.payments.invoices.fields.invoice_number') }}</dt>
          <dd class="col-sm-9"><code>{{ invoice.invoice_number }}</code></dd>

          <dt class="col-sm-3">{{ t('web.payments.invoices.fields.subtotal') }}</dt>
          <dd class="col-sm-9">{{ invoice.subtotal_formatted ?? invoice.subtotal ?? '—' }}</dd>

          <dt class="col-sm-3">{{ t('web.payments.invoices.fields.fee') }}</dt>
          <dd class="col-sm-9">{{ invoice.payment_channel_fee_formatted ?? invoice.payment_channel_fee ?? '—' }}</dd>

          <dt class="col-sm-3">{{ t('web.payments.invoices.fields.total') }}</dt>
          <dd class="col-sm-9">{{ invoice.customer_gross_total_formatted ?? invoice.customer_gross_total ?? '—' }}</dd>

          <dt class="col-sm-3">{{ t('web.payments.invoices.fields.currency') }}</dt>
          <dd class="col-sm-9">{{ invoice.currency }}</dd>

          <dt class="col-sm-3">{{ t('web.payments.invoices.fields.payment_method') }}</dt>
          <dd class="col-sm-9">{{ invoice.payment_method ?? '—' }}</dd>

          <dt v-if="invoice.payment_gateway" class="col-sm-3">{{ t('web.payments.invoices.fields.gateway') }}</dt>
          <dd v-if="invoice.payment_gateway" class="col-sm-9">{{ invoice.payment_gateway.display_name }}</dd>

          <dt class="col-sm-3">{{ t('web.payments.invoices.fields.external_transaction_id') }}</dt>
          <dd class="col-sm-9">{{ invoice.external_transaction_id ?? '—' }}</dd>

          <dt class="col-sm-3">{{ t('web.payments.invoices.fields.paid_at') }}</dt>
          <dd class="col-sm-9">{{ invoice.paid_at_formatted ?? invoice.paid_at ?? '—' }}</dd>

          <dt class="col-sm-3">{{ t('web.payments.invoices.fields.expired_at') }}</dt>
          <dd class="col-sm-9">{{ invoice.expired_at_formatted ?? invoice.expired_at ?? '—' }}</dd>

          <dt class="col-sm-3">{{ t('web.payments.invoices.fields.created_at') }}</dt>
          <dd class="col-sm-9">{{ invoice.created_at_formatted ?? invoice.created_at ?? '—' }}</dd>
        </dl>
      </Card>
    </div>

    <div class="col-lg-4">
      <CheckoutPanel :invoice="invoice" @status-updated="onStatusUpdated" @invoice-updated="onInvoiceUpdated" />
    </div>
  </div>
</template>
