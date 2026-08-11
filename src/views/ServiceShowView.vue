<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import { useServices } from '@/composables/useServices'
import { useAlert } from '@/composables/useAlert'
import type { Service } from '@/api/types'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { fetchOne } = useServices()
const { error: showError } = useAlert()

const service = ref<Service | null>(null)
const loading = ref(true)

onMounted(async () => {
  loading.value = true
  try {
    service.value = await fetchOne(route.params.id as string)
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.services.load_failed'))
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

  <Card v-else-if="service" :title="service.name">
    <template #actions>
      <button
        class="btn btn-outline-secondary btn-sm"
        @click="router.push({ name: 'services.index.view' })"
      >
        <i class="bi bi-arrow-left me-1"></i> {{ t('ui.actions.back') }}
      </button>
    </template>

    <dl class="row mb-3">
      <dt class="col-sm-3">{{ t('web.services.columns.code') }}</dt>
      <dd class="col-sm-9"><code>{{ service.code }}</code></dd>

      <dt class="col-sm-3">{{ t('web.services.columns.status') }}</dt>
      <dd class="col-sm-9">{{ service.status }}</dd>

      <dt class="col-sm-3">{{ t('web.services.form.billing_interval') }}</dt>
      <dd class="col-sm-9">{{ service.billing_interval }}</dd>

      <dt class="col-sm-3">{{ t('web.services.form.plan_kind') }}</dt>
      <dd class="col-sm-9">{{ service.plan_kind ?? '—' }}</dd>

      <dt class="col-sm-3">{{ t('web.services.form.storage_bytes') }}</dt>
      <dd class="col-sm-9">{{ service.storage_bytes_human ?? service.storage_bytes ?? 0 }}</dd>

      <dt class="col-sm-3">{{ t('web.services.columns.prices') }}</dt>
      <dd class="col-sm-9">
        <div v-if="service.prices && service.prices.length > 0">
          <div v-for="price in service.prices" :key="price.id">
            {{ price.amount_formatted ?? `${price.currency} ${price.amount}` }}
          </div>
        </div>
        <span v-else>—</span>
      </dd>

      <dt class="col-sm-3">{{ t('web.services.show.description') }}</dt>
      <dd class="col-sm-9">{{ service.description ?? '—' }}</dd>
    </dl>
  </Card>
</template>
