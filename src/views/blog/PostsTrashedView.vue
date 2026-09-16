<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue'
import RowActions from '@/components/RowActions.vue'
import { usePosts } from '@/composables/blog/usePosts'
import { useEchoResync } from '@/composables/useEcho'
import { useAlert } from '@/composables/useAlert'
import { useAuth } from '@/stores/auth'
import type { BlogPost } from '@/api/types'
import { mapQueryRowActions } from '@/utils/mapQueryRowActions'

const { t } = useI18n()
const { items, loading, error, fetchTrashed, restore } = usePosts()
const { success: showSuccess, error: showError } = useAlert()
const { hasPermission } = useAuth()

const canRestore = computed(() => hasPermission('restore posts'))
const restoringId = ref<string | null>(null)

const columns = computed<DataTableColumn[]>(() => [
  { key: 'title', label: t('web.blog.posts.columns.title') },
  { key: 'deleted_at', label: t('web.blog.posts.columns.deleted_at') },
])

async function load(): Promise<void> {
  await fetchTrashed()
}

async function handleRestore(row: BlogPost): Promise<void> {
  restoringId.value = row.id
  try {
    await restore(row.id)
    showSuccess(t('web.blog.posts.restored'))
    await load()
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.blog.posts.restore_failed'))
  } finally {
    restoringId.value = null
  }
}

function trashedActions(row: BlogPost) {
  return mapQueryRowActions(row.actions, {
    restore: () => { void handleRestore(row) },
  }).map((action) => ({
    ...action,
    disabled: action.key === 'restore' && restoringId.value === row.id,
  }))
}

useEchoResync(() => { void load() })

onMounted(() => { void load() })
</script>

<template>
  <Card :title="t('web.blog.posts.trashed_title')">
    <template #actions>
      <router-link class="btn btn-outline-secondary btn-sm" :to="{ name: 'blog.posts.index.view' }">
        <i class="bi bi-arrow-left me-1"></i> {{ t('ui.actions.back') }}
      </router-link>
    </template>

    <DataTable
      :columns="columns"
      :rows="items"
      :loading="loading"
      :error="error"
      @retry="fetchTrashed()"
      empty-icon="bi-trash3"
      :empty-title="t('web.blog.posts.empty_trashed')"
    >
      <template #cell-title="{ row }: { row: BlogPost }">
        <span class="fw-semibold">{{ row.title }}</span>
        <div class="text-muted small"><code>{{ row.slug }}</code></div>
      </template>

      <template #cell-deleted_at="{ row }: { row: BlogPost }">
        <span class="text-muted small">{{ row.deleted_at ?? '—' }}</span>
      </template>

      <template v-if="canRestore" #actions="{ row }: { row: BlogPost }">
        <RowActions :actions="trashedActions(row)" />
      </template>
    </DataTable>
  </Card>
</template>
