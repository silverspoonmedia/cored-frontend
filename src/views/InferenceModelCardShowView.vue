<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import ErrorState from '@/components/ErrorState.vue'
import SkeletonBlock from '@/components/SkeletonBlock.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useInferenceUsage } from '@/composables/useInferenceUsage'
import { useInferenceHydrate } from '@/composables/useInferenceHydrate'
import { useAuth } from '@/stores/auth'
import { useAlert } from '@/composables/useAlert'
import type { AiModelCardDetail, InferenceUsageEvent } from '@/api/types'

const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n()

const formatNumber = (value: number): string => new Intl.NumberFormat(locale.value).format(value)
const { fetchModelCardDetail, fetchUsageEvents } = useInferenceUsage()
const { hydrateModelCardShow } = useInferenceHydrate()
const { hasPermission } = useAuth()
const { error: showError } = useAlert()

const card = ref<AiModelCardDetail | null>(null)
const events = ref<InferenceUsageEvent[]>([])
const loading = ref(true)
const loadError = ref<string | null>(null)
const eventsLoading = ref(false)
const canManage = computed(() => hasPermission('manage inference catalog'))

async function loadCard(): Promise<void> {
  loading.value = true
  loadError.value = null
  try {
    card.value = await fetchModelCardDetail(route.params.id as string)
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : t('web.inference.model_cards.load_failed')
  } finally {
    loading.value = false
  }
}

async function loadEvents(): Promise<void> {
  eventsLoading.value = true
  try {
    const res = await fetchUsageEvents({
      model_card_id: route.params.id as string,
      per_page: 15,
    })
    events.value = res.items
  } catch {
    // non-critical
  } finally {
    eventsLoading.value = false
  }
}

onMounted(async () => {
  const id = route.params.id as string
  const batchResult = await hydrateModelCardShow(id).catch(() => null)
  if (batchResult?.card) {
    card.value = batchResult.card
    if (batchResult.events) {
      events.value = batchResult.events.items
    }
  }
  if (!card.value) await loadCard()
  if (events.value.length === 0) await loadEvents()
})
</script>

<template>
  <div v-if="loading" class="card">
    <div class="card-body">
      <SkeletonBlock variant="line" :lines="1" width="35%" />
      <SkeletonBlock variant="line" :lines="6" />
    </div>
  </div>

  <ErrorState v-else-if="loadError" :message="loadError" @retry="loadCard" />

  <template v-else-if="card">
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
      <div>
        <h1 class="h4 mb-0"><code>{{ card.slug }}</code></h1>
        <p class="text-muted small mb-0">{{ card.display_name ?? '—' }}</p>
      </div>
      <button
        v-if="canManage"
        class="btn btn-outline-primary btn-sm"
        @click="router.push({ name: 'inference.model-cards.edit.view', params: { id: card.id } })"
      >
        <i class="bi bi-pencil me-1"></i> {{ t('ui.actions.edit') }}
      </button>
    </div>

    <div class="row g-3 mb-4">
      <div class="col-md-3">
        <div class="card h-100">
          <div class="card-body">
            <div class="text-muted small">{{ t('web.inference.model_cards.status_label') }}</div>
            <div class="fw-semibold">
              <StatusBadge
                :status="card.is_active ? 'active' : 'inactive'"
                :label="card.is_active ? t('web.inference.model_cards.active_badge') : t('web.inference.model_cards.inactive_badge')"
              />
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card h-100">
          <div class="card-body">
            <div class="text-muted small">{{ t('web.inference.model_cards.provider_rate_label') }}</div>
            <div class="small fw-semibold">
              {{ t('web.inference.model_cards.in_short') }} ${{ card.provider_rate.input_per_million_usd.toFixed(2) }}
              · {{ t('web.inference.model_cards.out_short') }} ${{ card.provider_rate.output_per_million_usd.toFixed(2) }}
            </div>
            <div v-if="card.provider_rate.provider_slug" class="text-muted small mt-1">
              <code>{{ card.provider_rate.provider_slug }}</code>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-2">
        <div class="card h-100">
          <div class="card-body">
            <div class="text-muted small">{{ t('web.inference.model_cards.events_label') }}</div>
            <div class="fs-5 fw-semibold">{{ formatNumber(card.usage_summary.event_count) }}</div>
          </div>
        </div>
      </div>
      <div class="col-md-2">
        <div class="card h-100">
          <div class="card-body">
            <div class="text-muted small">{{ t('web.inference.model_cards.total_tokens_label') }}</div>
            <div class="fs-5 fw-semibold">{{ formatNumber(card.usage_summary.total_tokens) }}</div>
          </div>
        </div>
      </div>
      <div class="col-md-2">
        <div class="card h-100">
          <div class="card-body">
            <div class="text-muted small">{{ t('web.inference.model_cards.billable_label') }}</div>
            <div class="fs-5 fw-semibold">{{ card.usage_summary.billable_usd }}</div>
          </div>
        </div>
      </div>
    </div>

    <Card :title="t('web.inference.model_cards.recent_events_title')">
      <div v-if="eventsLoading" class="text-center py-3">
        <div class="spinner-border spinner-border-sm text-primary" role="status">
          <span class="visually-hidden">{{ t('ui.loading') }}</span>
        </div>
      </div>

      <div v-else-if="events.length === 0" class="text-muted text-center py-3">
        {{ t('web.inference.model_cards.no_events') }}
      </div>

      <div v-else class="table-responsive">
        <table class="table table-sm table-hover align-middle mb-0">
          <thead>
            <tr>
              <th>{{ t('web.inference.usage.columns.date') }}</th>
              <th>{{ t('web.inference.usage.columns.user') }}</th>
              <th>{{ t('web.inference.usage.columns.stage') }}</th>
              <th>{{ t('web.inference.usage.columns.tokens') }}</th>
              <th>{{ t('web.inference.usage.columns.billable') }}</th>
              <th>{{ t('web.inference.usage.columns.snapshot') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ev in events" :key="ev.id">
              <td class="small">{{ ev.created_at ?? '—' }}</td>
              <td class="small">
                <span v-if="ev.user">{{ ev.user.name }}</span>
                <span v-else>—</span>
              </td>
              <td class="small">{{ ev.stage ?? '—' }}</td>
              <td class="small">{{ formatNumber(ev.total_tokens) }}</td>
              <td class="small">{{ ev.billable_usd }}</td>
              <td class="small">
                <span v-if="ev.rate_snapshot">
                  ${{ ev.rate_snapshot.input_per_million_usd.toFixed(2) }} /
                  ${{ ev.rate_snapshot.output_per_million_usd.toFixed(2) }}
                </span>
                <span v-else>—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>

    <div class="mt-3">
      <button
        class="btn btn-outline-secondary btn-sm"
        @click="router.push({ name: 'inference.model-cards.index.view' })"
      >
        <i class="bi bi-arrow-left me-1"></i> {{ t('ui.actions.back') }}
      </button>
    </div>
  </template>
</template>
