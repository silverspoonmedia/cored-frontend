<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue'
import RowActions from '@/components/RowActions.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { usePosts } from '@/composables/blog/usePosts'
import { useEchoResync } from '@/composables/useEcho'
import { useAuth } from '@/stores/auth'
import { useServerDataTable } from '@/composables/useServerDataTable'
import { useAlert } from '@/composables/useAlert'
import type { BlogPost } from '@/api/types'
import { confirmQueryMutate, findQueryRowAction, mapQueryRowActions, queryRowActionTo } from '@/utils/mapQueryRowActions'

const router = useRouter()
const { t } = useI18n()
const { items, loading, error, fetchList, pagination, destroy } = usePosts()
const { hasPermission } = useAuth()
const { success: showSuccess, error: showError } = useAlert()
const canManage = computed(() => hasPermission('manage posts'))

const statusFilter = ref<string>('')
const { onPage, onPerPage, onSearch, load } = useServerDataTable(fetchList, pagination, () => ({
  status: statusFilter.value || undefined,
}))

const deleteTarget = ref<BlogPost | null>(null)

const columns = computed<DataTableColumn[]>(() => [
  { key: 'title', label: t('web.blog.posts.columns.title'), sortable: true },
  { key: 'status', label: t('web.blog.posts.columns.status'), sortable: true, align: 'center' },
  { key: 'categories', label: t('web.blog.posts.columns.categories') },
  { key: 'published_at', label: t('web.blog.posts.columns.published_at'), sortable: true, align: 'end' },
  { key: 'updated_at', label: t('web.blog.posts.columns.updated_at'), sortable: true, align: 'end' },
])

function applyStatusFilter(): void {
  void load({ page: 1 })
}

function editPost(row: BlogPost): void {
  const to = queryRowActionTo(findQueryRowAction(row.actions, 'edit'))
  if (to) void router.push(to)
}

function postActions(row: BlogPost) {
  return mapQueryRowActions(row.actions, {
    delete: (action) => {
      void (async () => {
        deleteTarget.value = row
        if (await confirmQueryMutate(action, t('ui.actions.delete'))) await handleDelete()
      })()
    },
  })
}

async function handleDelete(): Promise<void> {
  if (!deleteTarget.value) return
  try {
    await destroy(deleteTarget.value.id)
    showSuccess(t('web.blog.posts.deleted'))
    deleteTarget.value = null
    await load()
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.blog.posts.operation_failed'))
  }
}

useEchoResync(() => { void load() })
</script>

<template>
  <Card :title="t('web.blog.posts.title')">
    <template #actions>
      <router-link v-if="canManage" class="btn btn-primary btn-sm" :to="{ name: 'blog.posts.create.view' }">
        <i class="bi bi-plus-lg me-1"></i> {{ t('web.blog.posts.create') }}
      </router-link>
    </template>

    <div class="d-flex flex-wrap gap-2 mb-3">
      <select
        v-model="statusFilter"
        class="form-select form-select-sm"
        style="max-width: 180px"
        :aria-label="t('web.blog.posts.filter_status')"
        @change="applyStatusFilter"
      >
        <option value="">{{ t('web.blog.posts.status.all') }}</option>
        <option value="draft">{{ t('web.blog.posts.status.draft') }}</option>
        <option value="published">{{ t('web.blog.posts.status.published') }}</option>
      </select>
    </div>

    <DataTable
      :columns="columns"
      :rows="items"
      :loading="loading"
      :error="error"
      @retry="load()"
      server
      :total="pagination.total"
      :page="pagination.current_page"
      :per-page="pagination.per_page"
      :search-placeholder="t('web.blog.posts.search_placeholder')"
      empty-icon="bi-file-earmark-text"
      :empty-title="t('web.blog.posts.empty_title')"
      @row-click="editPost"
      @update:page="onPage"
      @update:per-page="onPerPage"
      @update:search="onSearch"
    >
      <template #cell-title="{ row }: { row: BlogPost }">
        <span class="fw-semibold">{{ row.title }}</span>
        <div class="text-muted small"><code>{{ row.slug }}</code></div>
      </template>

      <template #cell-status="{ row }: { row: BlogPost }">
        <StatusBadge
          :status="row.status"
          :label="t(`web.blog.posts.status.${row.status}`)"
        />
      </template>

      <template #cell-categories="{ row }: { row: BlogPost }">
        <template v-if="row.categories && row.categories.length > 0">
          <span v-for="category in row.categories" :key="category.id" class="badge text-bg-light border me-1">
            {{ category.name }}
          </span>
        </template>
        <span v-else class="text-muted">—</span>
      </template>

      <template #cell-published_at="{ row }: { row: BlogPost }">
        <span class="text-muted small">{{ row.published_at ?? '—' }}</span>
      </template>

      <template #cell-updated_at="{ row }: { row: BlogPost }">
        <span class="text-muted small">{{ row.updated_at ?? '—' }}</span>
      </template>

      <template v-if="canManage" #actions="{ row }: { row: BlogPost }">
        <RowActions :actions="postActions(row)" />
      </template>
    </DataTable>
  </Card>
</template>
