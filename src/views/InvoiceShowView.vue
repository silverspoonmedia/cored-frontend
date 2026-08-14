<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import CheckoutPanel from '@/components/CheckoutPanel.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useInvoices } from '@/composables/useInvoices'
import { useAlert } from '@/composables/useAlert'
import type { Invoice, InvoiceStatusPayload } from '@/api/types'
import { INVOICE_STATUS_BADGE } from '@/utils/statusBadge'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { fetchOne } = useInvoices()
const { error: showError } = useAlert()

const invoice = ref<Invoice | null>(null)
const loading = ref(true)

onMounted(async () => {
  loading.value = true
  try {
    invoice.value = await fetchOne(route.params.id as string)
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.payments.invoices.load_failed'))
  } finally {
    loading.value = false
  }
})

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
</script>

<template>
  <div v-if="loading" class="text-center py-4">
    <div class="spinner-border text-primary" role="status">
      <span class="visually-hidden">{{ t('ui.loading') }}</span>
    </div>
  </div>

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
