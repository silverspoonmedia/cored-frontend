<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useInvoices } from '@/composables/useInvoices'
import { useAlert } from '@/composables/useAlert'
import type { Invoice, PaymentChannel, CheckoutResult } from '@/api/types'

const props = defineProps<{
  invoice: Invoice
  channels?: PaymentChannel[]
}>()

const emit = defineEmits<{
  'status-updated': [status: string]
}>()

const { fetchCheckoutChannels, channelCheckout, syncStatus } = useInvoices()
const { error: showError, success: showSuccess } = useAlert()

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
    startPolling()
  }
})

onUnmounted(() => {
  stopPolling()
})

function startPolling(): void {
  stopPolling()
  pollTimer.value = setInterval(async () => {
    await handleSyncStatus()
  }, 60000)
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
    showSuccess('Checkout initiated. Follow the instructions below.')
  } catch (e) {
    showError(e instanceof Error ? e.message : 'Checkout failed')
  } finally {
    loading.value = false
  }
}

async function handleSyncStatus(): Promise<void> {
  if (syncing.value) return

  const provider = checkoutResult.value?.gateway ?? 'midtrans'

  syncing.value = true
  try {
    const result = await syncStatus(props.invoice.id, provider)
    if (result.invoice.status !== props.invoice.status) {
      emit('status-updated', result.invoice.status)
      if (result.invoice.status === 'paid') {
        showSuccess('Payment confirmed!')
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
      <h3 class="card-title mb-0">Payment Checkout</h3>
    </div>
    <div class="card-body">
      <div v-if="!isPayable" class="text-center py-3">
        <div class="text-muted">
          <i class="bi bi-info-circle fs-2 d-block mb-2"></i>
          Invoice status: <strong>{{ invoice.status }}</strong>
        </div>
      </div>

      <div v-else>
        <!-- Fee breakdown -->
        <div class="mb-3">
          <div class="d-flex justify-content-between mb-1">
            <span class="text-muted small">Subtotal</span>
            <span class="small">{{ invoice.subtotal_formatted ?? `${invoice.currency} ${invoice.subtotal}` }}</span>
          </div>
          <div class="d-flex justify-content-between mb-1">
            <span class="text-muted small">
              Payment Fee
              <span v-if="checkoutResult?.payment_channel_fee_basis" class="d-block small">
                {{ checkoutResult.payment_channel_fee_basis }}
              </span>
            </span>
            <span class="small text-end">
              {{ checkoutResult?.payment_channel_fee_formatted ?? invoice.payment_channel_fee_formatted ?? `${invoice.currency} ${invoice.payment_channel_fee}` }}
            </span>
          </div>
          <div class="d-flex justify-content-between border-top pt-1 mt-1">
            <span class="fw-semibold small">Total Due</span>
            <span class="fw-semibold small">
              {{ checkoutResult?.customer_gross_total_formatted ?? invoice.customer_gross_total_formatted ?? `${invoice.currency} ${invoice.customer_gross_total}` }}
            </span>
          </div>
        </div>

        <!-- Channel picker -->
        <div v-if="channels.length > 0" class="mb-3">
          <label class="form-label small fw-semibold">Select Payment Channel</label>
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
              <span v-if="ch.checkout_quote?.estimated_channel_fee_formatted" class="text-muted ms-1">
                + {{ ch.checkout_quote.estimated_channel_fee_formatted }}
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
            Pay Now
          </button>
          <button
            v-if="checkoutResult"
            type="button"
            class="btn btn-outline-secondary"
            :disabled="syncing"
            @click="handleSyncStatus"
          >
            <span v-if="syncing" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
            Confirm Paid
          </button>
        </div>

        <!-- Instructions -->
        <div v-if="checkoutResult" class="mt-3">
          <div v-if="checkoutResult.expires_at" class="text-muted small mb-2">
            Expires: {{ checkoutResult.expires_at }}
          </div>

          <!-- QRIS -->
          <div v-if="checkoutResult.instructions.type === 'qris'" class="text-center">
            <div v-if="checkoutResult.instructions.qr_url" class="mb-2">
              <img :src="checkoutResult.instructions.qr_url" alt="QR Code" class="img-fluid" style="max-width: 250px;" />
            </div>
            <div v-if="checkoutResult.instructions.qr_string" class="input-group input-group-sm">
              <input type="text" class="form-control" :value="checkoutResult.instructions.qr_string" readonly />
              <button class="btn btn-outline-secondary" type="button" @click="copyToClipboard(checkoutResult.instructions.qr_string ?? '')">Copy</button>
            </div>
          </div>

          <!-- VA -->
          <div v-else-if="checkoutResult.instructions.type === 'va'">
            <dl class="row mb-0">
              <dt class="col-sm-4 small">Bank</dt>
              <dd class="col-sm-8 small">{{ checkoutResult.instructions.bank_name }}</dd>

              <dt class="col-sm-4 small">VA Number</dt>
              <dd class="col-sm-8 small">
                <code>{{ checkoutResult.instructions.va_number }}</code>
                <button class="btn btn-sm btn-outline-secondary ms-1" @click="copyToClipboard(checkoutResult.instructions.va_number ?? '')">Copy</button>
              </dd>

              <dt v-if="checkoutResult.instructions.payment_name" class="col-sm-4 small">Payment Name</dt>
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
              <i class="bi bi-box-arrow-up-right me-1"></i> Open E-Wallet App
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
