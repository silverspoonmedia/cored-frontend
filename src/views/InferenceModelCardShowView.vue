<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Card from '@/components/Card.vue'
import { useInferenceUsage } from '@/composables/useInferenceUsage'
import { useAuth } from '@/stores/auth'
import { useAlert } from '@/composables/useAlert'
import type { AiModelCardDetail, InferenceUsageEvent } from '@/api/types'

const route = useRoute()
const router = useRouter()
const { fetchModelCardDetail, fetchUsageEvents } = useInferenceUsage()
const { hasPermission } = useAuth()
const { error: showError } = useAlert()

const card = ref<AiModelCardDetail | null>(null)
const events = ref<InferenceUsageEvent[]>([])
const loading = ref(true)
const eventsLoading = ref(false)
const canManage = computed(() => hasPermission('manage inference catalog'))

async function loadCard(): Promise<void> {
  loading.value = true
  try {
    card.value = await fetchModelCardDetail(route.params.id as string)
  } catch (e) {
    showError(e instanceof Error ? e.message : 'Failed to load model card')
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
  await loadCard()
  await loadEvents()
})
</script>

<template>
  <div v-if="loading" class="text-center py-4">
    <div class="spinner-border text-primary" role="status">
      <span class="visually-hidden">Loading…</span>
    </div>
  </div>

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
        <i class="bi bi-pencil me-1"></i> Edit
      </button>
    </div>

    <div class="row g-3 mb-4">
      <div class="col-md-3">
        <div class="card h-100">
          <div class="card-body">
            <div class="text-muted small">Status</div>
            <div class="fw-semibold">
              <span v-if="card.is_active" class="badge text-bg-success">Active</span>
              <span v-else class="badge text-bg-secondary">Inactive</span>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card h-100">
          <div class="card-body">
            <div class="text-muted small">Provider Rate</div>
            <div class="small fw-semibold">
              In ${{ card.provider_rate.input_per_million_usd.toFixed(2) }}
              · Out ${{ card.provider_rate.output_per_million_usd.toFixed(2) }}
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
            <div class="text-muted small">Events</div>
            <div class="fs-5 fw-semibold">{{ card.usage_summary.event_count.toLocaleString() }}</div>
          </div>
        </div>
      </div>
      <div class="col-md-2">
        <div class="card h-100">
          <div class="card-body">
            <div class="text-muted small">Total Tokens</div>
            <div class="fs-5 fw-semibold">{{ card.usage_summary.total_tokens.toLocaleString() }}</div>
          </div>
        </div>
      </div>
      <div class="col-md-2">
        <div class="card h-100">
          <div class="card-body">
            <div class="text-muted small">Billable</div>
            <div class="fs-5 fw-semibold">{{ card.usage_summary.billable_usd }}</div>
          </div>
        </div>
      </div>
    </div>

    <Card title="Recent Usage Events">
      <div v-if="eventsLoading" class="text-center py-3">
        <div class="spinner-border spinner-border-sm text-primary" role="status">
          <span class="visually-hidden">Loading…</span>
        </div>
      </div>

      <div v-else-if="events.length === 0" class="text-muted text-center py-3">
        No usage events found.
      </div>

      <div v-else class="table-responsive">
        <table class="table table-sm table-hover align-middle mb-0">
          <thead>
            <tr>
              <th>Date</th>
              <th>User</th>
              <th>Stage</th>
              <th>Tokens</th>
              <th>Billable</th>
              <th>Snapshot</th>
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
              <td class="small">{{ ev.total_tokens.toLocaleString() }}</td>
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
        <i class="bi bi-arrow-left me-1"></i> Back
      </button>
    </div>
  </template>
</template>
