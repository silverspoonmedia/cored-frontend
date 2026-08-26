<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import ErrorState from '@/components/ErrorState.vue'
import SkeletonBlock from '@/components/SkeletonBlock.vue'
import { useProductActivations } from '@/composables/useProductActivations'
import { useAdminRealtime } from '@/composables/useAdminRealtime'
import type { ProductActivationSummary } from '@/api/types'

const router = useRouter()
const { fetchProducts } = useProductActivations()
const { t } = useI18n()

const products = ref<ProductActivationSummary[]>([])
const loading = ref(true)
const loadError = ref<string | null>(null)

const { subscribe, unsubscribe } = useAdminRealtime()
const realtimeHandlers = {
  onProductActivationChanged: () => {
    void fetchProducts().then((p) => { products.value = p }).catch(() => {})
  },
}

async function loadProducts(): Promise<void> {
  loading.value = true
  loadError.value = null
  try {
    products.value = await fetchProducts()
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : t('web.product-activations.failed_load')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadProducts()
  subscribe(realtimeHandlers)
})

onUnmounted(() => {
  unsubscribe(realtimeHandlers)
})

function formatBytes(bytes: unknown): string {
  if (typeof bytes !== 'number' || bytes === 0) return '—'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let val = bytes
  let i = 0
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024
    i++
  }
  return `${val.toFixed(1)} ${units[i]}`
}

function isBytesKey(key: string): boolean {
  return key.endsWith('_bytes')
}

function isScalar(val: unknown): boolean {
  return typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean'
}
</script>

<template>
  <Card :title="t('web.product-activations.title')">
    <div v-if="loading" class="row g-3">
      <div v-for="i in 6" :key="i" class="col-md-6 col-lg-4">
        <div class="card h-100">
          <div class="card-body">
            <SkeletonBlock variant="line" :lines="1" width="50%" />
            <SkeletonBlock variant="line" :lines="2" />
            <SkeletonBlock variant="button" width="6rem" />
          </div>
        </div>
      </div>
    </div>

    <ErrorState v-else-if="loadError" :message="loadError" @retry="loadProducts" />

    <div v-else-if="products.length === 0" class="text-muted text-center py-4">
      <i class="bi bi-box-seam fs-1 d-block mb-2"></i>
      {{ t('web.product-activations.no_products') }}
    </div>

    <div v-else class="row g-3">
      <div v-for="p in products" :key="p.product_key" class="col-md-6 col-lg-4">
        <div class="card h-100">
          <div class="card-body">
            <div class="d-flex align-items-center gap-2 mb-2">
              <code>{{ p.product_key }}</code>
              <span
                v-if="p.activation_type"
                class="badge"
                :class="p.activation_type === 'explicit' ? 'text-bg-info' : 'text-bg-light border'"
              >
                {{ p.activation_type }}
              </span>
            </div>

            <div v-if="p.fulfillment_target" class="mb-2">
              <span class="text-muted small">{{ t('web.product-activations.fulfillment_label') }}</span>
              <code class="small">{{ p.fulfillment_target }}</code>
            </div>

            <div class="d-flex gap-2 mb-3">
              <span class="badge text-bg-success">{{ t('web.product-activations.active_label') }} {{ p.counts.active }}</span>
              <span class="badge text-bg-warning">{{ t('web.product-activations.pending_label') }} {{ p.counts.pending }}</span>
              <span class="badge text-bg-secondary">{{ t('web.product-activations.suspended_label') }} {{ p.counts.suspended }}</span>
              <span class="badge text-bg-danger">{{ t('web.product-activations.expired_label') }} {{ p.counts.expired }}</span>
            </div>

            <ul v-if="p.product_metrics && Object.keys(p.product_metrics).length > 0" class="list-unstyled small text-muted mb-3">
              <li
                v-for="(val, key) in p.product_metrics"
                :key="key"
                v-show="isScalar(val)"
              >
                <strong>{{ key }}:</strong>
                {{ isBytesKey(key) ? formatBytes(val) : val }}
              </li>
            </ul>

            <button
              class="btn btn-outline-primary btn-sm"
              @click="router.push({ name: 'product-activations.show.view', params: { productKey: p.product_key } })"
            >
              <i class="bi bi-graph-up me-1"></i> {{ t('web.product-activations.view_button') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Card>
</template>
