<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Card from '@/components/Card.vue'
import { useActivityLogs } from '@/composables/useActivityLogs'
import { useAlert } from '@/composables/useAlert'
import type { ActivityLog } from '@/api/types'

const route = useRoute()
const router = useRouter()
const { fetchOne, error } = useActivityLogs()
const { error: showError } = useAlert()

const entry = ref<ActivityLog | null>(null)
const loading = ref(true)

const attributes = computed<string[]>(() => {
  const changes = entry.value?.attribute_changes
  if (!changes) return []
  const keys = new Set<string>()
  if (changes.attributes) Object.keys(changes.attributes).forEach((k) => keys.add(k))
  if (changes.old) Object.keys(changes.old).forEach((k) => keys.add(k))
  return Array.from(keys)
})

const hasChanges = computed(() => attributes.value.length > 0)
const hasProperties = computed(() => {
  const p = entry.value?.properties
  return p && Object.keys(p).length > 0
})

const propertiesJson = computed(() => {
  if (!entry.value?.properties) return ''
  return JSON.stringify(entry.value.properties, null, 2)
})

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return '—'
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}

onMounted(async () => {
  const id = route.params.id as string
  try {
    entry.value = await fetchOne(id)
  } catch {
    if (error.value) showError(error.value)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <Card :title="`Activity Log #${entry?.id ?? ''}`">
    <template #actions>
      <button class="btn btn-outline-secondary btn-sm" @click="router.push({ name: 'activity-logs.index.view' })">
        <i class="bi bi-arrow-left me-1"></i> Back to List
      </button>
    </template>

    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading…</span>
      </div>
    </div>

    <div v-else-if="entry">
      <dl class="row mb-0">
        <dt class="col-sm-3">Log Name</dt>
        <dd class="col-sm-9">{{ entry.log_name ?? '—' }}</dd>

        <dt class="col-sm-3">Event</dt>
        <dd class="col-sm-9">{{ entry.event_label ?? entry.event ?? entry.description ?? '—' }}</dd>

        <dt class="col-sm-3">Subject</dt>
        <dd class="col-sm-9">{{ entry.subject_label ?? '—' }}</dd>

        <dt class="col-sm-3">Causer</dt>
        <dd class="col-sm-9">
          <template v-if="entry.causer">
            {{ entry.causer.name }}
            <span class="text-muted">({{ entry.causer.email }})</span>
          </template>
          <template v-else>—</template>
        </dd>

        <dt class="col-sm-3">Created At</dt>
        <dd class="col-sm-9">{{ entry.created_at_formatted ?? entry.created_at ?? '—' }}</dd>
      </dl>

      <template v-if="hasChanges">
        <hr>
        <h6 class="mb-3">Attribute Changes</h6>
        <div class="table-responsive">
          <table class="table table-sm table-bordered mb-0">
            <thead>
              <tr>
                <th>Attribute</th>
                <th>Old Value</th>
                <th>New Value</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="attr in attributes" :key="attr">
                <td><code>{{ attr }}</code></td>
                <td class="text-muted small">{{ formatValue(entry.attribute_changes.old?.[attr]) }}</td>
                <td class="small">{{ formatValue(entry.attribute_changes.attributes?.[attr]) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <template v-if="hasProperties">
        <hr>
        <h6 class="mb-3">Properties</h6>
        <pre class="bg-body-tertiary border rounded p-3 small mb-0"><code>{{ propertiesJson }}</code></pre>
      </template>
    </div>

    <div v-else class="text-center py-4 text-muted">
      <i class="bi bi-exclamation-circle" style="font-size: 2rem;"></i>
      <p class="mt-2">Activity log not found.</p>
    </div>
  </Card>
</template>
