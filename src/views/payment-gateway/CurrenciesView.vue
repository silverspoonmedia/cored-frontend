<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useCurrencies } from '@/composables/payment-gateway/useCurrencies'
import { useAuth } from '@/stores/auth'
import type { Currency } from '@/api/types'
import { findQueryRowAction } from '@/utils/mapQueryRowActions'

const { currencies, loading, updating, error, load, toggleActive, setSettlement } = useCurrencies()
const { hasPermission } = useAuth()
const { t } = useI18n()

const canManage = computed(() => hasPermission('manage settings'))

const columns = computed<DataTableColumn[]>(() => [
  { key: 'code', label: t('web.currencies.code_col'), sortable: true },
  { key: 'name', label: t('web.currencies.name_col'), sortable: true },
  { key: 'symbol', label: t('web.currencies.symbol_col'), sortable: true },
  { key: 'is_active', label: t('web.currencies.active_col'), sortable: true },
  { key: 'is_settlement', label: t('web.currencies.settlement_col'), sortable: true },
])

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

    <DataTable
      :columns="columns"
      :rows="currencies"
      :loading="loading && !currencies.length"
      :error="error && !currencies.length ? error : null"
      empty-icon="bi-currency-exchange"
      :empty-title="t('web.currencies.no_currencies_title')"
      :empty-message="t('web.currencies.no_currencies_message')"
      @retry="load(true)"
    >
      <template #cell-code="{ row }: { row: Currency }">
        <code>{{ row.code }}</code>
      </template>

      <template #cell-symbol="{ row }: { row: Currency }">
        {{ row.symbol ?? '—' }}
      </template>

      <template #cell-is_active="{ row }: { row: Currency }">
        <StatusBadge
          :status="row.is_active ? 'active' : 'inactive'"
          :label="row.is_active ? t('web.currencies.yes') : t('web.currencies.no')"
        />
      </template>

      <template #cell-is_settlement="{ row }: { row: Currency }">
        <StatusBadge
          :status="row.is_settlement ? 'active' : 'inactive'"
          :label="row.is_settlement ? t('web.currencies.yes') : t('web.currencies.no')"
        />
      </template>

      <template v-if="canManage" #actions="{ row }: { row: Currency }">
        <button
          v-if="findQueryRowAction(row.actions, 'toggle')"
          type="button"
          class="btn btn-sm btn-outline-secondary"
          :disabled="updating.has(row.code)"
          @click="toggleActive(row.code, row.is_active)"
        >
          <span
            v-if="updating.has(row.code)"
            class="spinner-border spinner-border-sm me-1"
            role="status"
            aria-hidden="true"
          ></span>
          {{ findQueryRowAction(row.actions, 'toggle')?.label }}
        </button>

        <button
          v-if="findQueryRowAction(row.actions, 'set_settlement')"
          type="button"
          class="btn btn-sm btn-outline-primary ms-1"
          :disabled="updating.has(row.code)"
          @click="setSettlement(row.code)"
        >
          {{ findQueryRowAction(row.actions, 'set_settlement')?.label }}
        </button>
      </template>
    </DataTable>
  </Card>
</template>
