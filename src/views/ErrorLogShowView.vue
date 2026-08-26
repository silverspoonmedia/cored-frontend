<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import ErrorState from '@/components/ErrorState.vue'
import SkeletonBlock from '@/components/SkeletonBlock.vue'
import { useErrorLogs } from '@/composables/useErrorLogs'
import { useDetailLoader } from '@/composables/useDetailLoader'
import { useAlert } from '@/composables/useAlert'

const route = useRoute()
const { t } = useI18n()
const { fetchOne, updateStatus } = useErrorLogs()
const { success: showSuccess, error: showError } = useAlert()

const { data: entry, loading, error: loadError, load } = useDetailLoader(
  () => fetchOne(route.params.id as string),
  { fallbackMessage: t('web.error-log.load_failed') },
)
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

async function changeStatus(status: string): Promise<void> {
  if (!entry.value || actionLoading.value) return
  actionLoading.value = true
  try {
    entry.value = await updateStatus(entry.value.id, status)
    showSuccess(t('web.error-log.status_updated'))
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.error-log.status_update_failed'))
  } finally {
    actionLoading.value = false
  }
}

</script>

<template>
  <Card :title="t('web.error-log.show_title')">
    <template #actions>
      <div class="d-flex flex-wrap gap-2">
        <button
          v-if="entry && entry.status !== 'resolved'"
          class="btn btn-success btn-sm"
          :disabled="actionLoading"
          @click="changeStatus('resolved')"
        >
          {{ t('web.error-log.actions.resolve') }}
        </button>
        <button
          v-if="entry && entry.status !== 'ignored'"
          class="btn btn-outline-secondary btn-sm"
          :disabled="actionLoading"
          @click="changeStatus('ignored')"
        >
          {{ t('web.error-log.actions.ignore') }}
        </button>
        <button
          v-if="entry && entry.status !== 'open'"
          class="btn btn-outline-warning btn-sm"
          :disabled="actionLoading"
          @click="changeStatus('open')"
        >
          {{ t('web.error-log.actions.reopen') }}
        </button>
        <router-link class="btn btn-outline-secondary btn-sm" :to="{ name: 'error-logs.index.view' }">
          <i class="bi bi-arrow-left me-1"></i> {{ t('web.error-log.back_to_list_button') }}
        </router-link>
      </div>
    </template>

    <div v-if="loading">
      <SkeletonBlock variant="line" :lines="1" width="30%" />
      <SkeletonBlock variant="line" :lines="8" />
    </div>

    <ErrorState v-else-if="loadError" :message="loadError" @retry="load" />

    <div v-else-if="entry">
      <dl class="row mb-0">
        <dt class="col-sm-3">{{ t('web.error-log.fields.status') }}</dt>
        <dd class="col-sm-9">{{ entry.status_label ?? entry.status ?? '—' }}</dd>

        <dt class="col-sm-3">{{ t('web.error-log.fields.level') }}</dt>
        <dd class="col-sm-9">
          <span class="badge text-bg-danger me-1">{{ entry.level ?? '—' }}</span>
          <span v-if="entry.type" class="badge text-bg-light border">{{ entry.type }}</span>
        </dd>

        <dt class="col-sm-3">{{ t('web.error-log.fields.occurrence_count') }}</dt>
        <dd class="col-sm-9">{{ entry.occurrence_count ?? 1 }}</dd>

        <dt class="col-sm-3">{{ t('web.error-log.fields.message') }}</dt>
        <dd class="col-sm-9">{{ entry.message ?? '—' }}</dd>

        <dt class="col-sm-3">{{ t('web.error-log.fields.exception_class') }}</dt>
        <dd class="col-sm-9"><code>{{ entry.exception_class ?? '—' }}</code></dd>

        <dt class="col-sm-3">{{ t('web.error-log.fields.location') }}</dt>
        <dd class="col-sm-9"><code v-if="location">{{ location }}</code><template v-else>—</template></dd>

        <dt class="col-sm-3">{{ t('web.error-log.fields.first_seen_at') }}</dt>
        <dd class="col-sm-9">{{ entry.first_seen_at_formatted ?? entry.first_seen_at ?? '—' }}</dd>

        <dt class="col-sm-3">{{ t('web.error-log.fields.last_seen_at') }}</dt>
        <dd class="col-sm-9">{{ entry.last_seen_at_formatted ?? entry.last_seen_at ?? '—' }}</dd>

        <dt class="col-sm-3">{{ t('web.error-log.fields.fingerprint') }}</dt>
        <dd class="col-sm-9"><code class="small">{{ entry.fingerprint ?? '—' }}</code></dd>

        <template v-if="entry.resolved_by">
          <dt class="col-sm-3">{{ t('web.error-log.fields.resolved_by') }}</dt>
          <dd class="col-sm-9">
            {{ entry.resolved_by.name }}
            <span class="text-muted">({{ entry.resolved_by.email }})</span>
            <span v-if="entry.resolved_at" class="text-muted small"> · {{ entry.resolved_at_formatted ?? entry.resolved_at }}</span>
          </dd>
        </template>
      </dl>

      <template v-if="hasContext">
        <hr>
        <h6 class="mb-3">{{ t('web.error-log.sections.context') }}</h6>
        <pre class="bg-body-tertiary border rounded p-3 small mb-0"><code>{{ contextJson }}</code></pre>
      </template>

      <template v-if="entry.trace">
        <hr>
        <h6 class="mb-3">{{ t('web.error-log.sections.trace') }}</h6>
        <pre class="bg-body-tertiary border rounded p-3 small mb-0" style="max-height: 28rem; overflow: auto;"><code>{{ entry.trace }}</code></pre>
      </template>
    </div>

    <div v-else class="text-center py-4 text-muted">
      <i class="bi bi-exclamation-circle" style="font-size: 2rem;"></i>
      <p class="mt-2">{{ t('web.error-log.not_found_message') }}</p>
    </div>
  </Card>
</template>
