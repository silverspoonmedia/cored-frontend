<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import FormInput from '@/components/FormInput.vue'
import SubmitButton from '@/components/SubmitButton.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import { useFileHosting } from '@/composables/useFileHosting'
import { useAlert } from '@/composables/useAlert'
import type { FhHashBlocklistEntry } from '@/api/types'

const fh = useFileHosting()
const { success: showSuccess, error: showError } = useAlert()
const { t } = useI18n()

const entries = ref<FhHashBlocklistEntry[]>([])
const loading = ref(true)
const submitting = ref(false)
const deleteTarget = ref<FhHashBlocklistEntry | null>(null)
const showDeleteConfirm = ref(false)

const form = ref({
  sha256: '',
  reason: '',
})

async function loadEntries(): Promise<void> {
  loading.value = true
  try {
    entries.value = await fh.fetchBlocklist()
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.file-hosting.blocklist_failed_load'))
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

function openDelete(entry: FhHashBlocklistEntry): void {
  deleteTarget.value = entry
  showDeleteConfirm.value = true
}

async function handleDelete(): Promise<void> {
  if (!deleteTarget.value) return
  try {
    await fh.removeBlocklistEntry(deleteTarget.value.id)
    showSuccess(t('web.file-hosting.blocklist_entry_removed'))
    showDeleteConfirm.value = false
    deleteTarget.value = null
    await loadEntries()
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.file-hosting.blocklist_failed_remove'))
  }
}
</script>

<template>
  <Card :title="t('web.file-hosting.blocklist_title_card')">
    <div class="row g-3">
      <div class="col-lg-5">
        <Card :title="t('web.file-hosting.blocklist_add_entry_title')">
          <form @submit.prevent="handleSubmit">
            <FormInput
              name="sha256"
              :label="t('web.file-hosting.blocklist_sha256_label')"
              v-model="form.sha256"
              :placeholder="t('web.file-hosting.blocklist_sha256_placeholder_input')"
              :maxlength="64"
              required
            />
            <FormInput
              name="reason"
              :label="t('web.file-hosting.blocklist_reason')"
              v-model="form.reason"
              :placeholder="t('web.file-hosting.blocklist_reason_placeholder_input')"
              :maxlength="255"
            />
            <SubmitButton :loading="submitting" :label="t('web.file-hosting.blocklist_add_button')" />
          </form>
        </Card>
      </div>

      <div class="col-lg-7">
        <Card :title="t('web.file-hosting.blocklist_blocked_hashes_title')">
          <div v-if="loading" class="text-center py-3">
            <div class="spinner-border spinner-border-sm text-primary" role="status">
              <span class="visually-hidden">{{ t('ui.loading') }}</span>
            </div>
          </div>
          <div v-else-if="entries.length === 0" class="text-muted text-center py-3">
            {{ t('web.file-hosting.blocklist_empty') }}
          </div>
          <div v-else class="table-responsive">
            <table class="table table-sm table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>{{ t('web.file-hosting.blocklist_sha256_col') }}</th>
                  <th>{{ t('web.file-hosting.blocklist_reason_col') }}</th>
                  <th>{{ t('web.file-hosting.blocklist_added_col') }}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="entry in entries" :key="entry.id">
                  <td><code class="small text-break">{{ entry.sha256 }}</code></td>
                  <td class="small">{{ entry.reason ?? '—' }}</td>
                  <td class="small">{{ entry.created_at_formatted ?? entry.created_at ?? '—' }}</td>
                  <td class="text-end">
                    <button class="btn btn-outline-danger btn-sm" @click="openDelete(entry)">
                      <i class="bi bi-trash"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>

    <ConfirmModal
      v-model="showDeleteConfirm"
      :title="t('web.file-hosting.blocklist_remove_title')"
      :confirm-label="t('web.file-hosting.blocklist_remove_button')"
      confirm-variant="danger"
      @confirm="handleDelete"
      @cancel="showDeleteConfirm = false; deleteTarget = null"
    >
      <p>{{ t('web.file-hosting.blocklist_remove_message') }}</p>
    </ConfirmModal>
  </Card>
</template>
