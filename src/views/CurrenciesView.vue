<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import SkeletonBlock from '@/components/SkeletonBlock.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useCurrencies } from '@/composables/useCurrencies'
import { useAuth } from '@/stores/auth'

const { currencies, loading, updating, error, load, toggleActive, setSettlement } = useCurrencies()
const { hasPermission } = useAuth()
const { t } = useI18n()

const canManage = computed(() => hasPermission('manage settings'))

onMounted(() => {
  load()
})
</script>

<template>
  <Card :title="t('web.currencies.title')">
    <template #actions>
      <button
        v-if="canManage"
        type="button"
        class="btn btn-sm btn-outline-secondary"
        :disabled="loading"
        @click="load(true)"
      >
        <i class="bi bi-arrow-clockwise" aria-hidden="true"></i>
      </button>
    </template>

    <div v-if="loading && !currencies.length" class="py-2">
      <div v-for="i in 4" :key="i" class="d-flex align-items-center gap-3 py-2 border-bottom">
        <SkeletonBlock variant="line" :lines="1" width="4rem" class="mb-0" />
        <SkeletonBlock variant="line" :lines="1" width="30%" class="mb-0" />
        <SkeletonBlock variant="line" :lines="1" width="8rem" class="ms-auto mb-0" />
      </div>
    </div>

    <ErrorState
      v-else-if="error && !currencies.length"
      :message="error"
      @retry="load(true)"
    />

    <EmptyState
      v-else-if="!currencies.length"
      icon="bi-currency-exchange"
      :title="t('web.currencies.no_currencies_title')"
      :message="t('web.currencies.no_currencies_message')"
    />

    <div v-else class="table-responsive">
      <table class="table table-hover align-middle mb-0">
        <thead>
          <tr>
            <th>{{ t('web.currencies.code_col') }}</th>
            <th>{{ t('web.currencies.name_col') }}</th>
            <th>{{ t('web.currencies.symbol_col') }}</th>
            <th>{{ t('web.currencies.active_col') }}</th>
            <th>{{ t('web.currencies.settlement_col') }}</th>
            <th v-if="canManage" class="text-end">{{ t('actions.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="currency in currencies" :key="currency.code">
            <td><code>{{ currency.code }}</code></td>
            <td>{{ currency.name }}</td>
            <td>{{ currency.symbol ?? '—' }}</td>
            <td>
              <StatusBadge
                :status="currency.is_active ? 'active' : 'inactive'"
                :label="currency.is_active ? t('web.currencies.yes') : t('web.currencies.no')"
              />
            </td>
            <td>
              <StatusBadge
                :status="currency.is_settlement ? 'active' : 'inactive'"
                :label="currency.is_settlement ? t('web.currencies.yes') : t('web.currencies.no')"
              />
            </td>
            <td v-if="canManage" class="text-end">
              <button
                type="button"
                class="btn btn-sm btn-outline-secondary"
                :disabled="updating.has(currency.code)"
                @click="toggleActive(currency.code, currency.is_active)"
              >
                <span
                  v-if="updating.has(currency.code)"
                  class="spinner-border spinner-border-sm me-1"
                  role="status"
                  aria-hidden="true"
                ></span>
                {{ currency.is_active ? t('web.currencies.deactivate_button') : t('web.currencies.activate_button') }}
              </button>

              <button
                v-if="!currency.is_settlement"
                type="button"
                class="btn btn-sm btn-outline-primary ms-1"
                :disabled="updating.has(currency.code)"
                @click="setSettlement(currency.code)"
              >
                {{ t('web.currencies.set_settlement_button') }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </Card>
</template>
