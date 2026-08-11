<script setup lang="ts">
import { onMounted, computed } from 'vue'
import Card from '@/components/Card.vue'
import EmptyState from '@/components/EmptyState.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useCurrencies } from '@/composables/useCurrencies'
import { useAuth } from '@/stores/auth'

const { currencies, loading, updating, load, toggleActive, setSettlement } = useCurrencies()
const { hasPermission } = useAuth()

const canManage = computed(() => hasPermission('manage settings'))

onMounted(() => {
  load()
})
</script>

<template>
  <Card title="Currencies">
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

    <div v-if="loading && !currencies.length" class="text-center py-4">
      <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
      Loading…
    </div>

    <EmptyState
      v-else-if="!currencies.length"
      icon="bi-currency-exchange"
      title="No currencies"
      message="Currencies will appear here once seeded."
    />

    <div v-else class="table-responsive">
      <table class="table table-hover align-middle mb-0">
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th>Symbol</th>
            <th>Active</th>
            <th>Settlement</th>
            <th v-if="canManage" class="text-end">Actions</th>
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
                :label="currency.is_active ? 'Yes' : 'No'"
              />
            </td>
            <td>
              <StatusBadge
                v-if="currency.is_settlement"
                status="active"
                label="Yes"
              />
              <span v-else class="badge text-bg-secondary">No</span>
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
                {{ currency.is_active ? 'Deactivate' : 'Activate' }}
              </button>

              <button
                v-if="!currency.is_settlement"
                type="button"
                class="btn btn-sm btn-outline-primary ms-1"
                :disabled="updating.has(currency.code)"
                @click="setSettlement(currency.code)"
              >
                Set as settlement
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </Card>
</template>
