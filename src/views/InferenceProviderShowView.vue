<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import { useInferenceProviders } from '@/composables/useInferenceProviders'
import { useAuth } from '@/stores/auth'
import { useAlert } from '@/composables/useAlert'
import type { InferenceProvider } from '@/api/types'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { fetchOne } = useInferenceProviders()
const { hasPermission } = useAuth()
const { error: showError } = useAlert()

const provider = ref<InferenceProvider | null>(null)
const loading = ref(true)

const canManage = () => hasPermission('manage inference catalog')

onMounted(async () => {
  loading.value = true
  try {
    provider.value = await fetchOne(route.params.id as string)
  } catch (e) {
    showError(e instanceof Error ? e.message : 'Failed to load provider')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div v-if="loading" class="text-center py-4">
    <div class="spinner-border text-primary" role="status">
      <span class="visually-hidden">{{ t('ui.loading') }}</span>
    </div>
  </div>

  <div v-else-if="provider">
    <Card>
      <template #actions>
        <button class="btn btn-outline-secondary btn-sm" @click="router.push({ name: 'inference.providers.index.view' })">
          <i class="bi bi-arrow-left me-1"></i> Back
        </button>
        <button
          v-if="canManage()"
          class="btn btn-outline-primary btn-sm ms-1"
          @click="router.push({ name: 'inference.providers.edit.view', params: { id: provider.id } })"
        >
          <i class="bi bi-pencil me-1"></i> Edit
        </button>
      </template>

      <div class="d-flex align-items-center gap-2 mb-3">
        <h3 class="card-title mb-0">{{ provider.name }}</h3>
        <code class="small">{{ provider.slug }}</code>
        <span class="badge" :class="provider.is_active ? 'text-bg-success' : 'text-bg-secondary'">
          {{ provider.is_active ? 'Active' : 'Inactive' }}
        </span>
      </div>

      <dl class="row mb-0">
        <dt class="col-sm-3">Name</dt>
        <dd class="col-sm-9">{{ provider.name }}</dd>

        <dt class="col-sm-3">Slug</dt>
        <dd class="col-sm-9"><code>{{ provider.slug }}</code></dd>

        <dt class="col-sm-3">Status</dt>
        <dd class="col-sm-9">
          <span class="badge" :class="provider.is_active ? 'text-bg-success' : 'text-bg-secondary'">
            {{ provider.is_active ? 'Active' : 'Inactive' }}
          </span>
        </dd>

        <dt class="col-sm-3">Created</dt>
        <dd class="col-sm-9">{{ provider.created_at_formatted ?? provider.created_at ?? '—' }}</dd>

        <dt class="col-sm-3">Updated</dt>
        <dd class="col-sm-9">{{ provider.updated_at_formatted ?? provider.updated_at ?? '—' }}</dd>
      </dl>
    </Card>

    <Card :title="t('web.inference.providers.rates_title')" class="mt-3">
      <div v-if="!provider.model_rates || provider.model_rates.length === 0" class="text-muted text-center py-3">
        No model rates configured.
      </div>
      <div v-else class="table-responsive">
        <table class="table table-sm align-middle mb-0">
          <thead>
            <tr>
              <th>Model</th>
              <th class="text-end">Input / 1M tokens (USD)</th>
              <th class="text-end">Output / 1M tokens (USD)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="rate in provider.model_rates" :key="rate.id">
              <td>
                <code>{{ rate.model_card?.slug ?? rate.model_card_id }}</code>
                <span v-if="rate.model_card?.display_name" class="text-muted small ms-1">{{ rate.model_card.display_name }}</span>
              </td>
              <td class="text-end">${{ rate.input_per_million_usd.toFixed(4) }}</td>
              <td class="text-end">${{ rate.output_per_million_usd.toFixed(4) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  </div>
</template>
