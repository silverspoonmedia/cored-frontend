<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import ErrorState from '@/components/ErrorState.vue'
import SkeletonBlock from '@/components/SkeletonBlock.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useInferenceProviders } from '@/composables/useInferenceProviders'
import { useInferenceModelCards } from '@/composables/useInferenceModelCards'
import { useInferenceHydrate } from '@/composables/useInferenceHydrate'
import { useRatePlanAdmin } from '@/composables/useRatePlanAdmin'
import { useAuth } from '@/stores/auth'
import { useAlert } from '@/composables/useAlert'
import type { InferenceProvider } from '@/api/types'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { fetchOne } = useInferenceProviders()
const { fetchList: fetchModelCards } = useInferenceModelCards()
const { hydrateProviderShow } = useInferenceHydrate()
const { hasPermission } = useAuth()
const { success: showSuccess, error: showError } = useAlert()

const providerId = computed(() => route.params.id as string)
const {
  entries,
  modelCards,
  saving,
  initRates,
  setModelCards,
  addEntry,
  removeEntry,
  saveRates,
} = useRatePlanAdmin(providerId)

const provider = ref<InferenceProvider | null>(null)
const loading = ref(true)
const loadError = ref<string | null>(null)
const canManage = computed(() => hasPermission('manage inference catalog'))

async function load(): Promise<void> {
  loading.value = true
  loadError.value = null
  try {
    const batchResult = await hydrateProviderShow(providerId.value).catch(() => null)

    if (batchResult?.provider) {
      provider.value = batchResult.provider
      initRates(batchResult.provider.model_rates ?? [])
      if (batchResult.modelCards) {
        setModelCards(batchResult.modelCards.map((c) => ({
          id: c.id,
          slug: c.slug,
          display_name: c.display_name,
        })))
      }
    } else {
      const [p, cards] = await Promise.all([
        fetchOne(providerId.value),
        fetchModelCards(),
      ])
      provider.value = p
      initRates(p.model_rates ?? [])
      setModelCards(cards.map((c) => ({
        id: c.id,
        slug: c.slug,
        display_name: c.display_name,
      })))
    }
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : t('web.inference.providers.load_failed')
  } finally {
    loading.value = false
  }
}

async function handleSave(): Promise<void> {
  try {
    const ok = await saveRates()
    if (!ok) return
    showSuccess(t('web.inference.providers.saved'))
    const p = await fetchOne(providerId.value)
    provider.value = p
    initRates(p.model_rates ?? [])
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.inference.providers.save_failed'))
  }
}

watch(providerId, load, { immediate: true })
</script>

<template>
  <div v-if="loading" class="card">
    <div class="card-body">
      <SkeletonBlock variant="line" :lines="1" width="35%" />
      <SkeletonBlock variant="line" :lines="6" />
    </div>
  </div>

  <ErrorState v-else-if="loadError" :message="loadError" @retry="load" />

  <div v-else-if="provider">
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
      <div>
        <h1 class="h4 mb-0">{{ provider.name }}</h1>
        <div class="d-flex flex-wrap gap-2 mt-1">
          <span class="badge text-bg-light border"><code>{{ provider.slug }}</code></span>
          <StatusBadge
            :status="provider.is_active ? 'active' : 'inactive'"
            :label="provider.is_active ? t('web.inference.providers.active') : t('web.inference.providers.inactive')"
          />
        </div>
      </div>
      <div class="d-flex flex-wrap gap-1">
        <button
          class="btn btn-outline-secondary btn-sm"
          @click="router.push({ name: 'inference.providers.index.view' })"
        >
          <i class="bi bi-arrow-left me-1"></i> {{ t('ui.actions.back') }}
        </button>
        <button
          v-if="canManage"
          class="btn btn-outline-primary btn-sm"
          @click="router.push({ name: 'inference.providers.edit.view', params: { id: provider.id } })"
        >
          <i class="bi bi-pencil me-1"></i> {{ t('ui.actions.edit') }}
        </button>
      </div>
    </div>

    <Card :title="t('web.inference.providers.rates_title')">
      <p class="text-muted small mb-3">{{ t('web.inference.providers.rates_lead') }}</p>

      <div v-if="canManage" class="d-flex flex-wrap gap-2 mb-3">
        <button
          type="button"
          class="btn btn-outline-secondary btn-sm"
          :disabled="modelCards.length === 0"
          @click="addEntry"
        >
          <i class="bi bi-plus-lg me-1" aria-hidden="true"></i>{{ t('web.inference.providers.add_rate') }}
        </button>
        <button
          type="button"
          class="btn btn-primary btn-sm"
          :disabled="saving"
          @click="handleSave"
        >
          <span v-if="saving" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
          <i v-else class="bi bi-check-lg me-1" aria-hidden="true"></i>{{ t('web.inference.providers.save_rates') }}
        </button>
      </div>

      <div class="table-responsive">
        <table class="table table-sm align-middle mb-0">
          <thead>
            <tr>
              <th>{{ t('web.inference.model_cards.show_title') }}</th>
              <th>{{ t('web.inference.providers.input_rate') }}</th>
              <th>{{ t('web.inference.providers.output_rate') }}</th>
              <th v-if="canManage"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="entries.length === 0">
              <td :colspan="canManage ? 4 : 3" class="text-muted">
                {{ t('web.inference.providers.no_rates') }}
              </td>
            </tr>
            <tr v-for="(entry, idx) in entries" :key="`${entry.model_card_id}-${idx}`">
              <td>
                <select
                  v-if="entry._isNew"
                  v-model="entry.model_card_id"
                  class="form-select form-select-sm"
                >
                  <option v-for="card in modelCards" :key="card.id" :value="card.id">
                    {{ card.display_name || card.slug }}
                  </option>
                </select>
                <template v-else>
                  <code>{{ entry.model_card?.slug ?? entry.model_card_id }}</code>
                  <span v-if="entry.model_card?.display_name" class="text-muted small ms-1">
                    {{ entry.model_card.display_name }}
                  </span>
                </template>
              </td>
              <td>
                <input
                  v-model.number="entry.input_per_million_usd"
                  type="number"
                  class="form-control form-control-sm"
                  min="0"
                  step="0.0001"
                  :readonly="!canManage"
                >
              </td>
              <td>
                <input
                  v-model.number="entry.output_per_million_usd"
                  type="number"
                  class="form-control form-control-sm"
                  min="0"
                  step="0.0001"
                  :readonly="!canManage"
                >
              </td>
              <td v-if="canManage" class="text-end">
                <button
                  type="button"
                  class="btn btn-outline-danger btn-sm"
                  :aria-label="t('web.inference.providers.remove_rate')"
                  :title="t('web.inference.providers.remove_rate')"
                  @click="removeEntry(idx)"
                >
                  <i class="bi bi-trash" aria-hidden="true"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  </div>
</template>
