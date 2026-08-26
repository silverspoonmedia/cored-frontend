<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import ErrorState from '@/components/ErrorState.vue'
import SkeletonBlock from '@/components/SkeletonBlock.vue'
import FormInput from '@/components/FormInput.vue'
import FormSelect from '@/components/FormSelect.vue'
import SubmitButton from '@/components/SubmitButton.vue'
import RowActions, { type RowAction } from '@/components/RowActions.vue'
import { confirmDialog } from '@/lib/swal'
import { useMicrostockCredentials } from '@/composables/useMicrostockCredentials'
import { useAlert } from '@/composables/useAlert'
import { ApiError } from '@/api/types'
import type { MicrostockCredential } from '@/api/types'

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

function credentialActions(row: MicrostockCredential): RowAction[] {
  return [
    {
      key: 'delete',
      icon: 'trash3',
      label: t('ui.actions.delete'),
      variant: 'danger',
      onClick: () => {
        void handleDelete(row)
      },
    },
  ]
}

async function handleDelete(row: MicrostockCredential): Promise<void> {
  const confirmed = await confirmDialog({
    title: t('ui.datatable.delete'),
    text: t('web.microstock-credentials.confirm_delete'),
    confirmText: t('ui.actions.delete'),
  })
  if (!confirmed) return

  try {
    await destroy(row.id)
    showSuccess(t('api.microstock.credential_deleted'))
    await fetchList()
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.microstock-credentials.errors.delete_failed'))
  }
}

onMounted(() => {
  void fetchList()
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
        <div v-if="loading" class="py-2">
          <div v-for="i in 4" :key="i" class="d-flex align-items-center gap-3 py-2 border-bottom">
            <SkeletonBlock variant="line" :lines="1" width="25%" class="mb-0" />
            <SkeletonBlock variant="line" :lines="1" width="35%" class="mb-0" />
            <SkeletonBlock variant="line" :lines="1" width="5rem" class="ms-auto mb-0" />
          </div>
        </div>

        <ErrorState v-else-if="loadError" :message="loadError" @retry="fetchList()" />

        <div v-else class="table-responsive">
          <table class="table table-sm table-hover align-middle mb-0" :aria-label="t('web.microstock-credentials.table_caption')">
            <caption class="visually-hidden">{{ t('web.microstock-credentials.table_caption') }}</caption>
            <thead>
              <tr>
                <th>{{ t('web.microstock-credentials.columns.marketplace') }}</th>
                <th>{{ t('web.microstock-credentials.columns.label') }}</th>
                <th>{{ t('web.microstock-credentials.columns.created_at') }}</th>
                <th class="text-end">{{ t('ui.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="items.length === 0">
                <td colspan="4" class="text-muted">{{ t('web.microstock-credentials.empty') }}</td>
              </tr>
              <tr v-for="row in items" :key="row.id">
                <td><code>{{ row.marketplace }}</code></td>
                <td>{{ row.label }}</td>
                <td><span class="text-muted small">{{ row.created_at ?? '-' }}</span></td>
                <td class="text-end">
                  <RowActions :actions="credentialActions(row)" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  </div>
</template>
