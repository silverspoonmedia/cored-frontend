<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import ErrorState from '@/components/ErrorState.vue'
import SkeletonBlock from '@/components/SkeletonBlock.vue'
import FormInput from '@/components/FormInput.vue'
import SubmitButton from '@/components/SubmitButton.vue'
import { confirmDialog } from '@/lib/swal'
import { useFileHosting } from '@/composables/file-hosting/useFileHosting'
import { useAlert } from '@/composables/useAlert'
import type { FhHashBlocklistEntry } from '@/api/types'

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
  deleteTarget.value = entry
  const confirmed = await confirmDialog({
    title: t('web.file-hosting.blocklist_remove_title'),
    text: t('web.file-hosting.blocklist_remove_message'),
    confirmText: t('web.file-hosting.blocklist_remove_button'),
  })
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
        <div v-if="loading" class="py-2">
          <div v-for="i in 4" :key="i" class="d-flex align-items-center gap-3 py-2 border-bottom">
            <SkeletonBlock variant="line" :lines="1" width="50%" class="mb-0" />
            <SkeletonBlock variant="line" :lines="1" width="6rem" class="ms-auto mb-0" />
          </div>
        </div>
        <ErrorState v-else-if="loadError" :message="loadError" @retry="loadEntries" />
        <div v-else-if="entries.length === 0" class="text-muted text-center py-3">
          {{ t('web.file-hosting.blocklist_empty') }}
        </div>
        <div v-else class="table-responsive">
          <table class="table table-sm table-striped table-hover align-middle mb-0 fh-table">
            <thead>
              <tr>
                <th>{{ t('web.file-hosting.blocklist_sha256') }}</th>
                <th>{{ t('web.file-hosting.blocklist_reason') }}</th>
                <th>{{ t('web.file-hosting.blocklist_added') }}</th>
                <th>{{ t('web.file-hosting.blocklist_actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="entry in entries" :key="entry.id">
                <td><code class="small text-break font-monospace">{{ entry.sha256 }}</code></td>
                <td class="small">{{ entry.reason ?? '—' }}</td>
                <td class="small">{{ entry.created_at_formatted ?? entry.created_at ?? '—' }}</td>
                <td class="text-end">
                  <button type="button" class="btn btn-outline-danger btn-sm" @click="openDelete(entry)">
                    <i class="bi bi-trash"></i>
                    <span class="visually-hidden">{{ t('web.file-hosting.blocklist_remove') }}</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
