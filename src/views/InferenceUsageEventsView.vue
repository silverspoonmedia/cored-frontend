<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import Card from '@/components/Card.vue'
import FormInput from '@/components/FormInput.vue'
import FormSelect from '@/components/FormSelect.vue'
import { useInferenceUsage } from '@/composables/useInferenceUsage'
import { useInferenceModelCards } from '@/composables/useInferenceModelCards'
import { useAlert } from '@/composables/useAlert'
import type { InferenceUsageOverview, InferenceUsageEvent } from '@/api/types'

const { fetchOverview, fetchUsageEvents } = useInferenceUsage()
const { items: modelCards, fetchList: fetchModelCards } = useInferenceModelCards()
const { error: showError } = useAlert()

const overview = ref<InferenceUsageOverview | null>(null)
const events = ref<InferenceUsageEvent[]>([])
const loading = ref(false)
const eventsLoading = ref(false)
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
  { value: '', label: 'All Models' },
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
  try {
    overview.value = await fetchOverview(buildParams())
  } catch (e) {
    showError(e instanceof Error ? e.message : 'Failed to load overview')
  } finally {
    loading.value = false
  }
}

async function loadEvents(reset = true): Promise<void> {
  if (reset) {
    eventsLoading.value = true
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
    showError(e instanceof Error ? e.message : 'Failed to load events')
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
  await fetchModelCards()
  await applyFilters()
})
</script>

<template>
  <Card title="Inference Usage Events">
    <form class="row g-2 mb-4" @submit.prevent="applyFilters">
      <div class="col-md-2">
        <FormInput name="from" label="From" type="date" v-model="filters.from" />
      </div>
      <div class="col-md-2">
        <FormInput name="to" label="To" type="date" v-model="filters.to" />
      </div>
      <div class="col-md-3">
        <FormSelect name="model_slug" label="Model" v-model="filters.model_slug" :options="modelOptions" />
      </div>
      <div class="col-md-2">
        <FormInput name="user_id" label="User ID" v-model="filters.user_id" />
      </div>
      <div class="col-md-2">
        <FormInput name="stage" label="Stage" v-model="filters.stage" />
      </div>
      <div class="col-md-1 d-flex align-items-end">
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
        <div class="col-6 col-md-2">
          <div class="border rounded p-3 text-center">
            <div class="text-muted small">Events</div>
            <div class="fs-5 fw-bold">{{ overview.totals.event_count.toLocaleString() }}</div>
          </div>
        </div>
        <div class="col-6 col-md-2">
          <div class="border rounded p-3 text-center">
            <div class="text-muted small">Users</div>
            <div class="fs-5 fw-bold">{{ overview.totals.unique_users.toLocaleString() }}</div>
          </div>
        </div>
        <div class="col-6 col-md-2">
          <div class="border rounded p-3 text-center">
            <div class="text-muted small">Tokens</div>
            <div class="fs-5 fw-bold">{{ overview.totals.total_tokens.toLocaleString() }}</div>
          </div>
        </div>
        <div class="col-6 col-md-2">
          <div class="border rounded p-3 text-center">
            <div class="text-muted small">Provider Cost</div>
            <div class="fs-5 fw-bold">{{ overview.totals.provider_cost_usd }}</div>
          </div>
        </div>
        <div class="col-6 col-md-2">
          <div class="border rounded p-3 text-center">
            <div class="text-muted small">Billable</div>
            <div class="fs-5 fw-bold">{{ overview.totals.billable_usd }}</div>
          </div>
        </div>
        <div class="col-6 col-md-2">
          <div class="border rounded p-3 text-center">
            <div class="text-muted small">Margin</div>
            <div class="fs-5 fw-bold">{{ overview.totals.margin_usd }}</div>
          </div>
        </div>
      </div>

      <div class="row g-3 mb-4">
        <div class="col-md-4">
          <Card title="By Model">
            <div v-if="overview.by_model.length === 0" class="text-muted small">No data</div>
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
          <Card title="By Stage">
            <div v-if="overview.by_stage.length === 0" class="text-muted small">No data</div>
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
          <Card title="By Provider">
            <div v-if="overview.by_provider.length === 0" class="text-muted small">No data</div>
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

      <Card title="By Billing Source">
        <div v-if="Object.keys(overview.by_billing_source).length === 0" class="text-muted small">No data</div>
        <table v-else class="table table-sm mb-0">
          <thead>
            <tr>
              <th>Source</th>
              <th class="text-end">Events</th>
              <th class="text-end">Provider Cost</th>
              <th class="text-end">Billable</th>
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

    <Card title="Usage Events" class="mt-4">
      <div v-if="eventsLoading" class="text-center py-3">
        <div class="spinner-border spinner-border-sm text-primary" role="status">
          <span class="visually-hidden">Loading…</span>
        </div>
      </div>
      <div v-else-if="events.length === 0" class="text-muted text-center py-3">
        No events found.
      </div>
      <div v-else>
        <div class="table-responsive">
          <table class="table table-sm table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Date</th>
                <th>User</th>
                <th>Model</th>
                <th>Provider</th>
                <th>Stage</th>
                <th class="text-end">Tokens</th>
                <th class="text-end">Billable</th>
                <th>Snapshot</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="ev in events" :key="ev.id">
                <td class="small">{{ ev.created_at ?? '—' }}</td>
                <td class="small">{{ ev.user?.name ?? '—' }}</td>
                <td class="small"><code>{{ ev.resolved_model ?? ev.alias_model ?? '—' }}</code></td>
                <td class="small">{{ ev.inference_provider?.name ?? '—' }}</td>
                <td class="small">{{ ev.stage ?? '—' }}</td>
                <td class="text-end small">{{ ev.total_tokens.toLocaleString() }}</td>
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
            Load More
          </button>
        </div>
      </div>
    </Card>
  </Card>
</template>
