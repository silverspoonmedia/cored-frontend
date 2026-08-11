<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Card from '@/components/Card.vue'
import FormInput from '@/components/FormInput.vue'
import SubmitButton from '@/components/SubmitButton.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import { useFileHosting } from '@/composables/useFileHosting'
import { useAlert } from '@/composables/useAlert'
import type { FhHashBlocklistEntry } from '@/api/types'

const fh = useFileHosting()
const { success: showSuccess, error: showError } = useAlert()

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
    showError(e instanceof Error ? e.message : 'Failed to load blocklist')
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
    showSuccess('Entry added.')
    form.value.sha256 = ''
    form.value.reason = ''
    await loadEntries()
  } catch (e) {
    showError(e instanceof Error ? e.message : 'Failed to add entry')
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
    showSuccess('Entry removed.')
    showDeleteConfirm.value = false
    deleteTarget.value = null
    await loadEntries()
  } catch (e) {
    showError(e instanceof Error ? e.message : 'Failed to remove entry')
  }
}
</script>

<template>
  <Card title="Hash Blocklist">
    <div class="row g-3">
      <div class="col-lg-5">
        <Card title="Add Entry">
          <form @submit.prevent="handleSubmit">
            <FormInput
              name="sha256"
              label="SHA-256 Hash"
              v-model="form.sha256"
              placeholder="64-char hex string"
              :maxlength="64"
              required
            />
            <FormInput
              name="reason"
              label="Reason"
              v-model="form.reason"
              placeholder="Optional reason"
              :maxlength="255"
            />
            <SubmitButton :loading="submitting" label="Add to Blocklist" />
          </form>
        </Card>
      </div>

      <div class="col-lg-7">
        <Card title="Blocked Hashes">
          <div v-if="loading" class="text-center py-3">
            <div class="spinner-border spinner-border-sm text-primary" role="status">
              <span class="visually-hidden">Loading…</span>
            </div>
          </div>
          <div v-else-if="entries.length === 0" class="text-muted text-center py-3">
            No blocked hashes.
          </div>
          <div v-else class="table-responsive">
            <table class="table table-sm table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>SHA-256</th>
                  <th>Reason</th>
                  <th>Added</th>
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
      :show="showDeleteConfirm"
      title="Remove Entry"
      confirm-text="Remove"
      confirm-class="btn-danger"
      @confirm="handleDelete"
      @cancel="showDeleteConfirm = false; deleteTarget = null"
    >
      <p>Remove this hash from the blocklist?</p>
      <p class="text-muted small">Files with this checksum will be able to be shared publicly again.</p>
    </ConfirmModal>
  </Card>
</template>
