<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import ErrorState from '@/components/ErrorState.vue'
import SkeletonBlock from '@/components/SkeletonBlock.vue'
import { useActivityLogs } from '@/composables/activity-log/useActivityLogs'
import { useDetailLoader } from '@/composables/useDetailLoader'

const route = useRoute()
const { fetchOne } = useActivityLogs()
const { t } = useI18n()

const { data: entry, loading, error: loadError, load } = useDetailLoader(
  () => fetchOne(route.params.id as string),
)

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

</script>

<template>
  <Card :title="t('web.activity-log.show_card_title', { id: entry?.id ?? '' })">
    <template #actions>
      <router-link class="btn btn-outline-secondary btn-sm" :to="{ name: 'activity-logs.index.view' }">
        <i class="bi bi-arrow-left me-1"></i> {{ t('ui.actions.back') }}
      </router-link>
    </template>

    <div v-if="loading">
      <SkeletonBlock variant="line" :lines="1" width="30%" />
      <SkeletonBlock variant="line" :lines="8" />
    </div>

    <ErrorState v-else-if="loadError" :message="loadError" @retry="load" />

    <div v-else-if="entry">
      <dl class="row mb-0">
        <dt class="col-sm-3">{{ t('web.activity-log.log_name') }}</dt>
        <dd class="col-sm-9">{{ entry.log_name ?? '—' }}</dd>

        <dt class="col-sm-3">{{ t('web.activity-log.event_label') }}</dt>
        <dd class="col-sm-9">{{ entry.event_label ?? entry.event ?? entry.description ?? '—' }}</dd>

        <dt class="col-sm-3">{{ t('web.activity-log.subject') }}</dt>
        <dd class="col-sm-9">{{ entry.subject_label ?? '—' }}</dd>

        <dt class="col-sm-3">{{ t('web.activity-log.causer') }}</dt>
        <dd class="col-sm-9">
          <template v-if="entry.causer">
            {{ entry.causer.name }}
            <span class="text-muted">({{ entry.causer.email }})</span>
          </template>
          <template v-else>—</template>
        </dd>

        <dt class="col-sm-3">{{ t('web.activity-log.created_at') }}</dt>
        <dd class="col-sm-9">{{ entry.created_at_formatted ?? entry.created_at ?? '—' }}</dd>
      </dl>

      <template v-if="hasChanges">
        <hr>
        <h6 class="mb-3">{{ t('web.activity-log.attribute_changes') }}</h6>
        <div class="table-responsive">
          <table class="table table-sm table-bordered mb-0">
            <thead>
              <tr>
                <th>{{ t('web.activity-log.attribute_col') }}</th>
                <th>{{ t('web.activity-log.old_value') }}</th>
                <th>{{ t('web.activity-log.new_value') }}</th>
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
        <h6 class="mb-3">{{ t('web.activity-log.properties') }}</h6>
        <pre class="bg-body-tertiary border rounded p-3 small mb-0"><code>{{ propertiesJson }}</code></pre>
      </template>
    </div>

    <div v-else class="text-center py-4 text-muted">
      <i class="bi bi-exclamation-circle" style="font-size: 2rem;"></i>
      <p class="mt-2">{{ t('web.activity-log.not_found') }}</p>
    </div>
  </Card>
</template>
