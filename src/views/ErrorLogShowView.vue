<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Card from '@/components/Card.vue'
import { useErrorLogs } from '@/composables/useErrorLogs'
import { useAlert } from '@/composables/useAlert'
import type { ErrorLog } from '@/api/types'

const route = useRoute()
const router = useRouter()
const { fetchOne, updateStatus, error } = useErrorLogs()
const { success: showSuccess, error: showError } = useAlert()

const entry = ref<ErrorLog | null>(null)
const loading = ref(true)
const actionLoading = ref(false)

const contextJson = computed(() => {
  if (!entry.value?.context) return ''
  return JSON.stringify(entry.value.context, null, 2)
})

const hasContext = computed(() => {
  const c = entry.value?.context
  return c && Object.keys(c).length > 0
})

const location = computed(() => {
  if (!entry.value?.file) return null
  const line = entry.value.line
  return line ? `${entry.value.file}:${line}` : entry.value.file
})

async function load(): Promise<void> {
  const id = route.params.id as string
  loading.value = true
  try {
    entry.value = await fetchOne(id)
  } catch {
    if (error.value) showError(error.value)
  } finally {
    loading.value = false
  }
}

async function changeStatus(status: string): Promise<void> {
  if (!entry.value || actionLoading.value) return
  actionLoading.value = true
  try {
    entry.value = await updateStatus(entry.value.id, status)
    showSuccess('Status updated.')
  } catch (e) {
    showError(e instanceof Error ? e.message : 'Failed to update status')
  } finally {
    actionLoading.value = false
  }
}

onMounted(load)
</script>

<template>
  <Card title="Error Log Detail">
    <template #actions>
      <div class="d-flex flex-wrap gap-2">
        <button
          v-if="entry && entry.status !== 'resolved'"
          class="btn btn-success btn-sm"
          :disabled="actionLoading"
          @click="changeStatus('resolved')"
        >
          Resolve
        </button>
        <button
          v-if="entry && entry.status !== 'ignored'"
          class="btn btn-outline-secondary btn-sm"
          :disabled="actionLoading"
          @click="changeStatus('ignored')"
        >
          Ignore
        </button>
        <button
          v-if="entry && entry.status !== 'open'"
          class="btn btn-outline-warning btn-sm"
          :disabled="actionLoading"
          @click="changeStatus('open')"
        >
          Reopen
        </button>
        <button class="btn btn-outline-secondary btn-sm" @click="router.push({ name: 'error-logs.index.view' })">
          <i class="bi bi-arrow-left me-1"></i> Back to List
        </button>
      </div>
    </template>

    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading…</span>
      </div>
    </div>

    <div v-else-if="entry">
      <dl class="row mb-0">
        <dt class="col-sm-3">Status</dt>
        <dd class="col-sm-9">{{ entry.status_label ?? entry.status ?? '—' }}</dd>

        <dt class="col-sm-3">Level</dt>
        <dd class="col-sm-9">
          <span class="badge text-bg-danger me-1">{{ entry.level ?? '—' }}</span>
          <span v-if="entry.type" class="badge text-bg-light border">{{ entry.type }}</span>
        </dd>

        <dt class="col-sm-3">Occurrences</dt>
        <dd class="col-sm-9">{{ entry.occurrence_count ?? 1 }}</dd>

        <dt class="col-sm-3">Message</dt>
        <dd class="col-sm-9">{{ entry.message ?? '—' }}</dd>

        <dt class="col-sm-3">Exception Class</dt>
        <dd class="col-sm-9"><code>{{ entry.exception_class ?? '—' }}</code></dd>

        <dt class="col-sm-3">Location</dt>
        <dd class="col-sm-9"><code v-if="location">{{ location }}</code><template v-else>—</template></dd>

        <dt class="col-sm-3">First Seen</dt>
        <dd class="col-sm-9">{{ entry.first_seen_at_formatted ?? entry.first_seen_at ?? '—' }}</dd>

        <dt class="col-sm-3">Last Seen</dt>
        <dd class="col-sm-9">{{ entry.last_seen_at_formatted ?? entry.last_seen_at ?? '—' }}</dd>

        <dt class="col-sm-3">Fingerprint</dt>
        <dd class="col-sm-9"><code class="small">{{ entry.fingerprint ?? '—' }}</code></dd>

        <template v-if="entry.resolved_by">
          <dt class="col-sm-3">Resolved By</dt>
          <dd class="col-sm-9">
            {{ entry.resolved_by.name }}
            <span class="text-muted">({{ entry.resolved_by.email }})</span>
            <span v-if="entry.resolved_at" class="text-muted small"> · {{ entry.resolved_at_formatted ?? entry.resolved_at }}</span>
          </dd>
        </template>
      </dl>

      <template v-if="hasContext">
        <hr>
        <h6 class="mb-3">Context</h6>
        <pre class="bg-body-tertiary border rounded p-3 small mb-0"><code>{{ contextJson }}</code></pre>
      </template>

      <template v-if="entry.trace">
        <hr>
        <h6 class="mb-3">Stack Trace</h6>
        <pre class="bg-body-tertiary border rounded p-3 small mb-0" style="max-height: 28rem; overflow: auto;"><code>{{ entry.trace }}</code></pre>
      </template>
    </div>

    <div v-else class="text-center py-4 text-muted">
      <i class="bi bi-exclamation-circle" style="font-size: 2rem;"></i>
      <p class="mt-2">Error log not found.</p>
    </div>
  </Card>
</template>
