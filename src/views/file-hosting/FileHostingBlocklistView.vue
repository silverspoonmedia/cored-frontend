<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue'
import FormInput from '@/components/FormInput.vue'
import SubmitButton from '@/components/SubmitButton.vue'
import { useFileHosting } from '@/composables/file-hosting/useFileHosting'
import { useAlert } from '@/composables/useAlert'
import type { FhHashBlocklistEntry } from '@/api/types'
import { confirmQueryMutate, findQueryRowAction } from '@/utils/mapQueryRowActions'

const fh = useFileHosting()
const { success: showSuccess, error: showError } = useAlert()
const { t } = useI18n()

const entries = ref<FhHashBlocklistEntry[]>([])
const loading = ref(true)
const loadError = ref<string | null>(null)
const submitting = ref(false)
const deleteTarget = ref<FhHashBlocklistEntry | null>(null)

const form = ref({
  sha256: '',
  reason: '',
})

async function loadEntries(): Promise<void> {
  loading.value = true
  loadError.value = null
  try {
    entries.value = await fh.fetchBlocklist()
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : t('web.file-hosting.blocklist_failed_load')
  } finally {
    loading.value = false
  }
}

onMounted(loadEntries)

async function handleSubmit(): Promise<void> {
  if (!form.value.sha256.trim() || submitting.value) return
  submitting.value = true
  try {
    await fh.addBlocklistEntry(form.value.sha256.trim().toLowerCase(), form.value.reason.trim() || null)
    showSuccess(t('web.file-hosting.blocklist_entry_added'))
    form.value.sha256 = ''
    form.value.reason = ''
    await loadEntries()
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.file-hosting.blocklist_failed_add'))
  } finally {
    submitting.value = false
  }
}

async function openDelete(entry: FhHashBlocklistEntry): Promise<void> {
  const action = findQueryRowAction(entry.actions, 'remove')
  if (!action) return
  deleteTarget.value = entry
  const confirmed = await confirmQueryMutate(action, t('web.file-hosting.blocklist_remove_button'))
  if (confirmed) {
    await handleDelete()
  } else {
    deleteTarget.value = null
  }
}

async function handleDelete(): Promise<void> {
  if (!deleteTarget.value) return
  try {
    await fh.removeBlocklistEntry(deleteTarget.value.id)
    showSuccess(t('web.file-hosting.blocklist_entry_removed'))
    deleteTarget.value = null
    await loadEntries()
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.file-hosting.blocklist_failed_remove'))
  }
}

const columns = computed<DataTableColumn[]>(() => [
  { key: 'sha256', label: t('web.file-hosting.blocklist_sha256'), sortable: true },
  { key: 'reason', label: t('web.file-hosting.blocklist_reason'), sortable: true },
  { key: 'created_at', label: t('web.file-hosting.blocklist_added'), sortable: true },
])
</script>

<template>
  <div class="fh-manager fh-admin-page">
    <header class="fh-admin-page__intro">
      <h1 class="h4 mb-1">{{ t('web.file-hosting.blocklist_title') }}</h1>
    </header>

    <div class="card mb-4">
      <div class="card-header">
        <strong>{{ t('web.file-hosting.blocklist_add') }}</strong>
      </div>
      <div class="card-body">
        <form class="row g-2 align-items-end" @submit.prevent="handleSubmit">
          <div class="col-md-5">
            <FormInput
              name="sha256"
              :label="t('web.file-hosting.blocklist_sha256')"
              v-model="form.sha256"
              :placeholder="t('web.file-hosting.blocklist_sha256_placeholder')"
              :maxlength="64"
              required
            />
          </div>
          <div class="col-md-5">
            <FormInput
              name="reason"
              :label="t('web.file-hosting.blocklist_reason')"
              v-model="form.reason"
              :placeholder="t('web.file-hosting.blocklist_reason_placeholder')"
              :maxlength="255"
            />
          </div>
          <div class="col-md-2">
            <SubmitButton :loading="submitting" :label="t('web.file-hosting.blocklist_add')" />
          </div>
        </form>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <strong>{{ t('web.file-hosting.blocklist_entries') }}</strong>
      </div>
      <div class="card-body">
        <DataTable
          :columns="columns"
          :rows="entries"
          :loading="loading"
          :error="loadError"
          empty-icon="bi-shield-x"
          :empty-title="t('web.file-hosting.blocklist_empty')"
          @retry="loadEntries"
        >
          <template #cell-sha256="{ row }: { row: FhHashBlocklistEntry }">
            <code class="small text-break font-monospace">{{ row.sha256 }}</code>
          </template>

          <template #cell-reason="{ row }: { row: FhHashBlocklistEntry }">
            <span class="small">{{ row.reason ?? '—' }}</span>
          </template>

          <template #cell-created_at="{ row }: { row: FhHashBlocklistEntry }">
            <span class="small">{{ row.created_at_formatted ?? row.created_at ?? '—' }}</span>
          </template>

          <template #actions="{ row }: { row: FhHashBlocklistEntry }">
            <button
              v-if="findQueryRowAction(row.actions, 'remove')"
              type="button"
              class="btn btn-outline-danger btn-sm"
              @click="openDelete(row)"
            >
              <i class="bi bi-trash"></i>
              <span class="visually-hidden">{{ findQueryRowAction(row.actions, 'remove')?.label }}</span>
            </button>
          </template>
        </DataTable>
      </div>
    </div>
  </div>
</template>
