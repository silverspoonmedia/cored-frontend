<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useInvoices } from '@/composables/useInvoices'
import { usePaymentRealtime } from '@/composables/usePaymentRealtime'
import { useEcho } from '@/composables/useEcho'
import { useAlert } from '@/composables/useAlert'
import type { Invoice, PaymentChannel, CheckoutResult, InvoiceStatusPayload } from '@/api/types'

const props = defineProps<{
  invoice: Invoice
  channels?: PaymentChannel[]
}>()

const emit = defineEmits<{
  'status-updated': [status: string]
  'invoice-updated': [payload: InvoiceStatusPayload]
}>()

const { fetchCheckoutChannels, channelCheckout, syncStatus } = useInvoices()
const { error: showError, success: showSuccess } = useAlert()
const { subscribeInvoice, unsubscribeInvoice, subscribeRoutingCatalog, unsubscribeRoutingCatalog } = usePaymentRealtime()
const { connected: echoConnected } = useEcho()
const { t } = useI18n()

const channels = ref<PaymentChannel[]>(props.channels ?? [])
const selectedChannel = ref<string>('')
const checkoutResult = ref<CheckoutResult | null>(null)
const loading = ref(false)
const syncing = ref(false)
const pollTimer = ref<ReturnType<typeof setInterval> | null>(null)

const isPayable = computed(() => {
  const status = props.invoice.status.toLowerCase()
  return status === 'pending' || status === 'challenge'
})

const kindIcons: Record<string, string> = {
  qris: 'bi-qr-code',
  va: 'bi-bank',
  ewallet: 'bi-wallet2',
}

function copyToClipboard(text: string): void {
  navigator.clipboard.writeText(text).catch(() => {})
}

onMounted(async () => {
  if (isPayable.value && channels.value.length === 0) {
    try {
      channels.value = await fetchCheckoutChannels(props.invoice.id)
      if (channels.value.length > 0) {
        selectedChannel.value = channels.value[0]!.code
      }
    } catch {
      // non-critical
    }
  } else if (channels.value.length > 0) {
    selectedChannel.value = channels.value[0]!.code
  }

  if (props.invoice.checkout_session) {
    // Pre-existing checkout session — display it
  }

  if (isPayable.value) {
    subscribeInvoice(props.invoice.id, handleInvoiceStatusChanged)
    subscribeRoutingCatalog(refreshChannels)
    if (!echoConnected.value) {
      startPolling()
    }
  }
})

onUnmounted(() => {
  unsubscribeInvoice()
  unsubscribeRoutingCatalog()
  stopPolling()
})

function handleInvoiceStatusChanged(payload: InvoiceStatusPayload): void {
  if (payload.status !== props.invoice.status) {
    emit('status-updated', payload.status)
    emit('invoice-updated', payload)
    if (payload.status === 'paid') {
      showSuccess(t('web.payments.payment_confirmed'))
      stopPolling()
    }
  }
}

async function refreshChannels(): Promise<void> {
  if (!isPayable.value) return
  try {
    const fresh = await fetchCheckoutChannels(props.invoice.id)
    if (fresh.length > 0) {
      channels.value = fresh
      if (!channels.value.some((c) => c.code === selectedChannel.value)) {
        selectedChannel.value = fresh[0]!.code
      }
    }
  } catch {
    // non-critical
  }
}

function startPolling(): void {
  stopPolling()
  pollTimer.value = setInterval(async () => {
    if (document.visibilityState !== 'visible') return
    if (echoConnected.value) {
      stopPolling()
      return
    }
    await handleSyncStatus()
  }, 15_000)
}

function stopPolling(): void {
  if (pollTimer.value) {
    clearInterval(pollTimer.value)
    pollTimer.value = null
  }
}

async function handleCheckout(): Promise<void> {
  if (!selectedChannel.value || loading.value) return

  loading.value = true
  checkoutResult.value = null

  try {
    checkoutResult.value = await channelCheckout(props.invoice.id, selectedChannel.value)
    showSuccess(t('web.payments.checkout_initiated'))
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.payments.checkout_failed'))
  } finally {
    loading.value = false
  }
}

async function handleSyncStatus(): Promise<void> {
  if (syncing.value) return

  const provider = (checkoutResult.value?.gateway || props.invoice.payment_gateway?.name || '').trim()
  if (!provider) return

  syncing.value = true
  try {
    const result = await syncStatus(props.invoice.id, provider)
    if (result.invoice.status !== props.invoice.status) {
      emit('status-updated', result.invoice.status)
      if (result.invoice.status === 'paid') {
        showSuccess(t('web.payments.payment_confirmed'))
        stopPolling()
      }
    }
  } catch {
    // non-critical
  } finally {
    syncing.value = false
  }
}
</script>

<template>
  <div class="card">
    <div class="card-header">
      <h3 class="card-title mb-0">{{ t('web.payments.checkout_panel_title') }}</h3>
    </div>
    <div class="card-body">
      <div v-if="!isPayable" class="text-center py-3">
        <div class="text-muted">
          <i class="bi bi-info-circle fs-2 d-block mb-2"></i>
          {{ t('web.payments.invoice_status_label') }} <strong>{{ invoice.status }}</strong>
        </div>
      </div>

      <div v-else>
        <!-- Fee breakdown -->
        <div class="mb-3">
          <div class="d-flex justify-content-between mb-1">
            <span class="text-muted small">{{ t('web.payments.subtotal_label') }}</span>
            <span class="small">{{ invoice.subtotal_formatted ?? `${invoice.currency} ${invoice.subtotal}` }}</span>
          </div>
          <div class="d-flex justify-content-between mb-1">
            <span class="text-muted small">
              {{ t('web.payments.payment_fee_label') }}
              <span v-if="checkoutResult?.payment_channel_fee_basis" class="d-block small">
                {{ checkoutResult.payment_channel_fee_basis }}
              </span>
            </span>
            <span class="small text-end">
              {{ checkoutResult?.payment_channel_fee_formatted ?? invoice.payment_channel_fee_formatted ?? `${invoice.currency} ${invoice.payment_channel_fee}` }}
            </span>
          </div>
          <div class="d-flex justify-content-between border-top pt-1 mt-1">
            <span class="fw-semibold small">{{ t('web.payments.total_due_label') }}</span>
            <span class="fw-semibold small">
              {{ checkoutResult?.customer_gross_total_formatted ?? invoice.customer_gross_total_formatted ?? `${invoice.currency} ${invoice.customer_gross_total}` }}
            </span>
          </div>
        </div>

        <!-- Channel picker -->
        <div v-if="channels.length > 0" class="mb-3">
          <label class="form-label small fw-semibold">{{ t('web.payments.select_payment_channel') }}</label>
          <div class="d-flex flex-wrap gap-2">
            <button
              v-for="ch in channels"
              :key="ch.code"
              type="button"
              class="btn btn-outline-secondary btn-sm"
              :class="{ active: selectedChannel === ch.code }"
              @click="selectedChannel = ch.code"
            >
              <i class="bi me-1" :class="kindIcons[ch.kind] ?? 'bi-credit-card'"></i>
              {{ ch.display_name }}
              <span v-if="ch.estimated_channel_fee_formatted" class="text-muted ms-1">
                + {{ ch.estimated_channel_fee_formatted }}
              </span>
            </button>
          </div>
        </div>

        <!-- Pay + sync buttons -->
        <div class="d-flex gap-2 mb-3">
          <button
            type="button"
            class="btn btn-primary"
            :disabled="!selectedChannel || loading"
            @click="handleCheckout"
          >
            <span v-if="loading" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
            {{ t('web.payments.pay_now_button') }}
          </button>
          <button
            v-if="checkoutResult"
            type="button"
            class="btn btn-outline-secondary"
            :disabled="syncing"
            @click="handleSyncStatus"
          >
            <span v-if="syncing" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
            {{ t('web.payments.confirm_paid_button') }}
          </button>
        </div>

        <!-- Instructions -->
        <div v-if="checkoutResult" class="mt-3">
          <div v-if="checkoutResult.expires_at" class="text-muted small mb-2">
            {{ t('web.payments.expires_label') }} {{ checkoutResult.expires_at }}
          </div>

          <!-- QRIS -->
          <div v-if="checkoutResult.instructions.type === 'qris'" class="text-center">
            <div v-if="checkoutResult.instructions.qr_url" class="mb-2">
              <img :src="checkoutResult.instructions.qr_url" alt="QR Code" class="img-fluid" style="max-width: 250px;" />
            </div>
            <div v-if="checkoutResult.instructions.qr_string" class="input-group input-group-sm">
              <input type="text" class="form-control" :value="checkoutResult.instructions.qr_string" readonly />
              <button class="btn btn-outline-secondary" type="button" @click="copyToClipboard(checkoutResult.instructions.qr_string ?? '')">{{ t('web.payments.copy_button') }}</button>
            </div>
          </div>

          <!-- VA -->
          <div v-else-if="checkoutResult.instructions.type === 'va'">
            <dl class="row mb-0">
              <dt class="col-sm-4 small">{{ t('web.payments.bank_label') }}</dt>
              <dd class="col-sm-8 small">{{ checkoutResult.instructions.bank_name }}</dd>

              <dt class="col-sm-4 small">{{ t('web.payments.va_number_label') }}</dt>
              <dd class="col-sm-8 small">
                <code>{{ checkoutResult.instructions.va_number }}</code>
                <button class="btn btn-sm btn-outline-secondary ms-1" @click="copyToClipboard(checkoutResult.instructions.va_number ?? '')">{{ t('web.payments.copy_button') }}</button>
              </dd>

              <dt v-if="checkoutResult.instructions.payment_name" class="col-sm-4 small">{{ t('web.payments.payment_name_label') }}</dt>
              <dd v-if="checkoutResult.instructions.payment_name" class="col-sm-8 small">{{ checkoutResult.instructions.payment_name }}</dd>
            </dl>
          </div>

          <!-- Ewallet -->
          <div v-else-if="checkoutResult.instructions.type === 'ewallet'">
            <a
              v-if="checkoutResult.instructions.deeplink_url"
              :href="checkoutResult.instructions.deeplink_url"
              class="btn btn-primary btn-sm mb-2"
              target="_blank"
            >
              <i class="bi bi-box-arrow-up-right me-1"></i> {{ t('web.payments.open_ewallet_app') }}
            </a>
            <div v-if="checkoutResult.instructions.qr_url" class="text-center">
              <img :src="checkoutResult.instructions.qr_url" alt="QR Code" class="img-fluid" style="max-width: 250px;" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
