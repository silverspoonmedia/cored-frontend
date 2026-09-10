<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue'
import FormInput from '@/components/FormInput.vue'
import FormSelect from '@/components/FormSelect.vue'
import SubmitButton from '@/components/SubmitButton.vue'
import RowActions from '@/components/RowActions.vue'
import { useMicrostockCredentials } from '@/composables/microstock/useMicrostockCredentials'
import { useArchivdRealtime } from '@/composables/archivd/useArchivdRealtime'
import { useEchoResync } from '@/composables/useEcho'
import { useAlert } from '@/composables/useAlert'
import { ApiError } from '@/api/types'
import type { MicrostockCredential, QueryRowAction } from '@/api/types'
import { confirmQueryMutate, mapQueryRowActions } from '@/utils/mapQueryRowActions'

const { t } = useI18n()
const { items, loading, error: loadError, fetchList, create, destroy } = useMicrostockCredentials()
const { success: showSuccess, error: showError } = useAlert()

const saving = ref(false)
const errors = ref<Record<string, string[]>>({})

const marketplaces = [
  'shutterstock',
  'adobe_stock',
  'getty_images',
  'istock',
  'dreamstime',
  '123rf',
  'freepik',
  'vecteezy',
  'depositphotos',
  'other',
]

const form = reactive({
  marketplace: 'shutterstock',
  label: '',
  host: '',
  username: '',
  password: '',
})

const marketplaceOptions = computed(() =>
  marketplaces.map((m) => ({ value: m, label: t(`web.microstock-credentials.marketplaces.${m}`) })),
)

function fieldError(field: string): string | null {
  const list = errors.value[field]
  return list && list.length > 0 ? list[0] ?? null : null
}

async function handleSubmit(): Promise<void> {
  if (saving.value) return
  saving.value = true
  errors.value = {}

  const secret: Record<string, string> = {}
  if (form.host.trim()) secret.host = form.host.trim()
  if (form.username.trim()) secret.username = form.username.trim()
  if (form.password.trim()) secret.password = form.password.trim()

  try {
    await create({ marketplace: form.marketplace, label: form.label, secret })
    showSuccess(t('api.microstock.credential_saved'))
    form.label = ''
    form.host = ''
    form.username = ''
    form.password = ''
    await fetchList()
  } catch (e) {
    if (e instanceof ApiError && e.isValidation) {
      errors.value = e.errors ?? {}
      if (Object.keys(errors.value).length === 0) showError(e.message)
    } else {
      showError(e instanceof Error ? e.message : t('web.microstock-credentials.errors.save_failed'))
    }
  } finally {
    saving.value = false
  }
}

function credentialActions(row: MicrostockCredential) {
  return mapQueryRowActions(row.actions, {
    delete: (action) => {
      void handleDelete(row, action)
    },
  })
}

async function handleDelete(row: MicrostockCredential, action: QueryRowAction): Promise<void> {
  const confirmed = await confirmQueryMutate(action, t('ui.actions.delete'))
  if (!confirmed) return

  try {
    await destroy(row.id)
    showSuccess(t('api.microstock.credential_deleted'))
    await fetchList()
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.microstock-credentials.errors.delete_failed'))
  }
}

const columns = computed<DataTableColumn[]>(() => [
  { key: 'marketplace', label: t('web.microstock-credentials.columns.marketplace'), sortable: true },
  { key: 'label', label: t('web.microstock-credentials.columns.label'), sortable: true },
  { key: 'created_at', label: t('web.microstock-credentials.columns.created_at'), sortable: true },
])

// Live update: credentials added/deleted in another tab refresh the list.
const { subscribe: subscribeArchivd, unsubscribe: unsubscribeArchivd } = useArchivdRealtime()
const realtimeHandlers = { onMicrostockCredentialsChanged: () => { void fetchList() } }

// Socket-outage recovery: mirror the realtime handler.
useEchoResync(() => { void fetchList() })

onMounted(() => {
  void fetchList()
  subscribeArchivd(realtimeHandlers)
})

onUnmounted(() => {
  unsubscribeArchivd(realtimeHandlers)
})
</script>

<template>
  <div class="row g-3">
    <div class="col-lg-5">
      <Card :title="t('web.microstock-credentials.add_title')">
        <p class="text-muted small mb-3">{{ t('web.microstock-credentials.add_help') }}</p>
        <form @submit.prevent="handleSubmit">
          <FormSelect
            name="marketplace"
            :label="t('web.microstock-credentials.form.marketplace')"
            v-model="form.marketplace"
            :options="marketplaceOptions"
            :error="fieldError('marketplace')"
            required
            :disabled="saving"
          />
          <FormInput
            name="label"
            :label="t('web.microstock-credentials.form.label')"
            v-model="form.label"
            :error="fieldError('label')"
            required
            :disabled="saving"
            :maxlength="100"
          />
          <FormInput
            name="host"
            :label="t('web.microstock-credentials.form.host')"
            v-model="form.host"
            :error="fieldError('secret.host')"
            :disabled="saving"
          />
          <FormInput
            name="username"
            :label="t('web.microstock-credentials.form.username')"
            v-model="form.username"
            :error="fieldError('secret.username')"
            :disabled="saving"
          />
          <FormInput
            name="password"
            :label="t('web.microstock-credentials.form.password')"
            type="password"
            v-model="form.password"
            :error="fieldError('secret.password')"
            :disabled="saving"
          />
          <SubmitButton :label="t('web.microstock-credentials.form.submit')" :loading="saving" variant="primary" />
        </form>
      </Card>
    </div>

    <div class="col-lg-7">
      <Card :title="t('web.microstock-credentials.list_title')">
        <DataTable
          :columns="columns"
          :rows="items"
          :loading="loading"
          :error="loadError"
          empty-icon="bi-shop"
          :empty-title="t('web.microstock-credentials.empty')"
          @retry="fetchList()"
        >
          <template #cell-marketplace="{ row }: { row: MicrostockCredential }">
            <code>{{ row.marketplace }}</code>
          </template>

          <template #cell-created_at="{ row }: { row: MicrostockCredential }">
            <span class="text-muted small">{{ row.created_at ?? '-' }}</span>
          </template>

          <template #actions="{ row }: { row: MicrostockCredential }">
            <RowActions :actions="credentialActions(row)" />
          </template>
        </DataTable>
      </Card>
    </div>
  </div>
</template>
