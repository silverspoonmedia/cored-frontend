<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import ErrorState from '@/components/ErrorState.vue'
import SkeletonBlock from '@/components/SkeletonBlock.vue'
import FormInput from '@/components/FormInput.vue'
import FormSelect from '@/components/FormSelect.vue'
import TableEmptyRow from '@/components/TableEmptyRow.vue'
import { useInferenceUsage } from '@/composables/inference/useInferenceUsage'
import { useInferenceModelCards } from '@/composables/inference/useInferenceModelCards'
import { useInferenceHydrate } from '@/composables/inference/useInferenceHydrate'
import { useAlert } from '@/composables/useAlert'
import type { InferenceUsageOverview, InferenceUsageEvent } from '@/api/types'

const { fetchOverview, fetchUsageEvents } = useInferenceUsage()
const { items: modelCards, fetchList: fetchModelCards } = useInferenceModelCards()
const { hydrateUsageEvents } = useInferenceHydrate()
const { error: showError } = useAlert()
const { t, locale } = useI18n()

const formatNumber = (value: number): string => new Intl.NumberFormat(locale.value).format(value)

const overview = ref<InferenceUsageOverview | null>(null)
const events = ref<InferenceUsageEvent[]>([])
const loading = ref(false)
const overviewError = ref<string | null>(null)
const eventsLoading = ref(false)
const eventsError = ref<string | null>(null)
const loadingMore = ref(false)
const hasMore = ref(false)
const currentPage = ref(1)

const filters = reactive({
  from: '',
  to: '',
  model_slug: '',
  user_id: '',
  stage: '',
})

const modelOptions = computed(() => [
  { value: '', label: t('web.inference.usage.all_models') },
  ...modelCards.value.map((c) => ({ value: c.slug, label: c.display_name ?? c.slug })),
])

function buildParams(): Record<string, unknown> {
  const params: Record<string, unknown> = {}
  if (filters.from) params.from = filters.from
  if (filters.to) params.to = filters.to
  if (filters.model_slug) params.model_slug = filters.model_slug
  if (filters.user_id) params.user_id = filters.user_id
  if (filters.stage) params.stage = filters.stage
  return params
}

async function loadOverview(): Promise<void> {
  loading.value = true
  overviewError.value = null
  try {
    overview.value = await fetchOverview(buildParams())
  } catch (e) {
    overviewError.value = e instanceof Error ? e.message : t('web.inference.usage.overview_load_failed')
  } finally {
    loading.value = false
  }
}

async function loadEvents(reset = true): Promise<void> {
  if (reset) {
    eventsLoading.value = true
    eventsError.value = null
    currentPage.value = 1
    events.value = []
  } else {
    loadingMore.value = true
    currentPage.value++
  }

  try {
    const params = { ...buildParams(), per_page: 20, page: currentPage.value }
    const res = await fetchUsageEvents(params)
    if (reset) {
      events.value = res.items
    } else {
      events.value.push(...res.items)
    }
    hasMore.value = res.pagination.has_more
  } catch (e) {
    const message = e instanceof Error ? e.message : t('web.inference.usage.events_load_failed')
    if (reset) {
      eventsError.value = message
    } else {
      showError(message)
    }
  } finally {
    eventsLoading.value = false
    loadingMore.value = false
  }
}

async function applyFilters(): Promise<void> {
  await loadOverview()
  await loadEvents(true)
}

onMounted(async () => {
  const batchResult = await hydrateUsageEvents(buildParams()).catch(() => null)
  if (batchResult) {
    if (batchResult.overview) overview.value = batchResult.overview
    if (batchResult.events) {
      events.value = batchResult.events.items
      hasMore.value = batchResult.events.pagination.has_more
    }
    if (batchResult.modelCards) modelCards.value = batchResult.modelCards
  }
  if (!overview.value) await loadOverview()
  if (events.value.length === 0) await loadEvents(true)
  if (modelCards.value.length === 0) await fetchModelCards()
})
</script>

<template>
  <div class="inf-usage-admin">
    <header class="inf-usage-admin__intro mb-3">
      <h1 class="h4 mb-1">{{ t('web.inference.usage.list_title') }}</h1>
      <p class="text-muted small mb-0">{{ t('web.inference.usage.subtitle') }}</p>
    </header>
    <Card>
    <form class="row g-2 mb-4" @submit.prevent="applyFilters">
      <div class="col-md-2">
        <FormInput name="from" :label="t('web.inference.usage.filters.from')" type="date" v-model="filters.from" />
      </div>
      <div class="col-md-2">
        <FormInput name="to" :label="t('web.inference.usage.filters.to')" type="date" v-model="filters.to" />
      </div>
      <div class="col-md-3">
        <FormSelect name="model_slug" :label="t('web.inference.usage.filters.model')" v-model="filters.model_slug" :options="modelOptions" />
      </div>
      <div class="col-md-2">
        <FormInput name="user_id" :label="t('web.inference.usage.filters.user_id')" v-model="filters.user_id" />
      </div>
      <div class="col-md-2">
        <FormInput name="stage" :label="t('web.inference.usage.filters.stage')" v-model="filters.stage" />
      </div>
      <div class="col-md-1 d-flex align-items-end">
        <button type="submit" class="btn btn-primary btn-sm w-100">{{ t('web.inference.usage.filter_button') }}</button>
      </div>
    </form>

    <div v-if="loading" class="py-2">
      <div class="row g-3 mb-4">
        <div v-for="i in 5" :key="i" class="col-6 col-md-2">
          <div class="border rounded p-3 text-center">
            <SkeletonBlock variant="line" :lines="1" width="70%" class="mx-auto" />
            <SkeletonBlock variant="line" :lines="1" width="50%" class="mx-auto mb-0" />
          </div>
        </div>
      </div>
    </div>

    <ErrorState
      v-else-if="overviewError"
      :message="overviewError"
      @retry="applyFilters"
    />

    <template v-else-if="overview">
      <div class="row g-3 mb-4">
        <div class="col-6 col-md-2">
          <div class="border rounded p-3 text-center">
            <div class="text-muted small">{{ t('web.inference.usage.totals.events') }}</div>
            <div class="fs-5 fw-bold">{{ formatNumber(overview.totals.event_count) }}</div>
          </div>
        </div>
        <div class="col-6 col-md-2">
          <div class="border rounded p-3 text-center">
            <div class="text-muted small">{{ t('web.inference.usage.totals.users') }}</div>
            <div class="fs-5 fw-bold">{{ formatNumber(overview.totals.unique_users) }}</div>
          </div>
        </div>
        <div class="col-6 col-md-2">
          <div class="border rounded p-3 text-center">
            <div class="text-muted small">{{ t('web.inference.usage.totals.tokens') }}</div>
            <div class="fs-5 fw-bold">{{ formatNumber(overview.totals.total_tokens) }}</div>
          </div>
        </div>
        <div class="col-6 col-md-2">
          <div class="border rounded p-3 text-center">
            <div class="text-muted small">{{ t('web.inference.usage.totals.provider_cost') }}</div>
            <div class="fs-5 fw-bold">{{ overview.totals.provider_cost_usd }}</div>
          </div>
        </div>
        <div class="col-6 col-md-2">
          <div class="border rounded p-3 text-center">
            <div class="text-muted small">{{ t('web.inference.usage.totals.billable') }}</div>
            <div class="fs-5 fw-bold">{{ overview.totals.billable_usd }}</div>
          </div>
        </div>
        <div class="col-6 col-md-2">
          <div class="border rounded p-3 text-center">
            <div class="text-muted small">{{ t('web.inference.usage.totals.margin') }}</div>
            <div class="fs-5 fw-bold">{{ overview.totals.margin_usd }}</div>
          </div>
        </div>
      </div>

      <div class="row g-3 mb-4">
        <div class="col-md-4">
          <Card :title="t('web.inference.usage.by_model')">
            <div v-if="overview.by_model.length === 0" class="text-muted small">{{ t('web.inference.usage.no_data') }}</div>
            <table v-else class="table table-sm mb-0">
              <tbody>
                <tr v-for="row in overview.by_model" :key="row.resolved_model">
                  <td><code class="small">{{ row.resolved_model }}</code></td>
                  <td class="text-end small">{{ row.event_count }}</td>
                  <td class="text-end small">{{ row.billable_usd }}</td>
                </tr>
              </tbody>
            </table>
          </Card>
        </div>
        <div class="col-md-4">
          <Card :title="t('web.inference.usage.by_stage')">
            <div v-if="overview.by_stage.length === 0" class="text-muted small">{{ t('web.inference.usage.no_data') }}</div>
            <table v-else class="table table-sm mb-0">
              <tbody>
                <tr v-for="row in overview.by_stage" :key="row.stage">
                  <td class="small">{{ row.stage }}</td>
                  <td class="text-end small">{{ row.event_count }}</td>
                  <td class="text-end small">{{ row.billable_usd }}</td>
                </tr>
              </tbody>
            </table>
          </Card>
        </div>
        <div class="col-md-4">
          <Card :title="t('web.inference.usage.by_provider')">
            <div v-if="overview.by_provider.length === 0" class="text-muted small">{{ t('web.inference.usage.no_data') }}</div>
            <table v-else class="table table-sm mb-0">
              <tbody>
                <tr v-for="row in overview.by_provider" :key="row.inference_provider_id ?? 'unknown'">
                  <td class="small">{{ row.provider_slug ?? '—' }}</td>
                  <td class="text-end small">{{ row.event_count }}</td>
                  <td class="text-end small">{{ row.billable_usd }}</td>
                </tr>
              </tbody>
            </table>
          </Card>
        </div>
      </div>

      <Card :title="t('web.inference.usage.by_source')">
        <div v-if="Object.keys(overview.by_billing_source).length === 0" class="text-muted small">{{ t('web.inference.usage.no_data') }}</div>
        <table v-else class="table table-sm mb-0">
          <thead>
            <tr>
              <th>{{ t('web.inference.usage.columns.source') }}</th>
              <th class="text-end">{{ t('web.inference.usage.totals.events') }}</th>
              <th class="text-end">{{ t('web.inference.usage.totals.provider_cost') }}</th>
              <th class="text-end">{{ t('web.inference.usage.totals.billable') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, source) in overview.by_billing_source" :key="source">
              <td>{{ source }}</td>
              <td class="text-end">{{ row.event_count }}</td>
              <td class="text-end">{{ row.provider_cost_usd }}</td>
              <td class="text-end">{{ row.billable_usd }}</td>
            </tr>
          </tbody>
        </table>
      </Card>
    </template>

    <Card :title="t('web.inference.usage.events_table_title')" class="mt-4">
      <div v-if="eventsLoading" class="py-2">
        <div v-for="i in 5" :key="i" class="d-flex align-items-center gap-3 py-2 border-bottom">
          <SkeletonBlock variant="line" :lines="1" width="45%" class="mb-0" />
          <SkeletonBlock variant="line" :lines="1" width="6rem" class="ms-auto mb-0" />
        </div>
      </div>
      <ErrorState
        v-else-if="eventsError"
        :message="eventsError"
        @retry="loadEvents(true)"
      />
      <div v-else>
        <div class="table-responsive">
          <table class="table table-sm table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>{{ t('web.inference.usage.columns.date') }}</th>
                <th>{{ t('web.inference.usage.columns.user') }}</th>
                <th>{{ t('web.inference.usage.columns.model') }}</th>
                <th>{{ t('web.inference.usage.columns.provider') }}</th>
                <th>{{ t('web.inference.usage.columns.stage') }}</th>
                <th class="text-end">{{ t('web.inference.usage.columns.tokens') }}</th>
                <th class="text-end">{{ t('web.inference.usage.columns.billable') }}</th>
                <th>{{ t('web.inference.usage.columns.snapshot') }}</th>
              </tr>
            </thead>
            <tbody>
              <TableEmptyRow
                v-if="events.length === 0"
                :colspan="8"
                icon="bi-activity"
                :title="t('web.inference.usage.no_events')"
              />
              <tr v-for="ev in events" :key="ev.id">
                <td class="small">{{ ev.created_at ?? '—' }}</td>
                <td class="small">{{ ev.user?.name ?? '—' }}</td>
                <td class="small"><code>{{ ev.resolved_model ?? ev.alias_model ?? '—' }}</code></td>
                <td class="small">{{ ev.inference_provider?.name ?? '—' }}</td>
                <td class="small">{{ ev.stage ?? '—' }}</td>
                <td class="text-end small">{{ formatNumber(ev.total_tokens) }}</td>
                <td class="text-end small">{{ ev.billable_usd }}</td>
                <td class="small">
                  <span v-if="ev.rate_snapshot">
                    ${{ ev.rate_snapshot.input_per_million_usd.toFixed(2) }} / ${{ ev.rate_snapshot.output_per_million_usd.toFixed(2) }}
                  </span>
                  <span v-else>—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="hasMore" class="text-center mt-3">
          <button class="btn btn-outline-primary btn-sm" :disabled="loadingMore" @click="loadEvents(false)">
            <span v-if="loadingMore" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
            {{ t('web.inference.usage.load_more') }}
          </button>
        </div>
      </div>
    </Card>
  </Card>
  </div>
</template>
