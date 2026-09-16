<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue'
import RowActions from '@/components/RowActions.vue'
import FormInput from '@/components/FormInput.vue'
import SubmitButton from '@/components/SubmitButton.vue'
import { useTags } from '@/composables/blog/useTags'
import { useEchoResync } from '@/composables/useEcho'
import { useAlert } from '@/composables/useAlert'
import { ApiError } from '@/api/types'
import type { BlogTag } from '@/api/types'

const { t } = useI18n()
const { items, loading, error, fetchList, create, update, destroy, pagination } = useTags()
const { success: showSuccess, error: showError } = useAlert()

const columns = ref<DataTableColumn[]>([
  { key: 'name', label: t('web.blog.tags.columns.name') },
  { key: 'slug', label: t('web.blog.tags.columns.slug') },
  { key: 'posts_count', label: t('web.blog.tags.columns.posts_count'), align: 'center' },
])

const showForm = ref(false)
const saving = ref(false)
const editingId = ref<string | null>(null)
const deleteTarget = ref<BlogTag | null>(null)
const form = reactive({ name: '', slug: '' })

function openCreate(): void {
  editingId.value = null
  form.name = ''
  form.slug = ''
  showForm.value = true
}

function openEdit(tag: BlogTag): void {
  editingId.value = tag.id
  form.name = tag.name
  form.slug = tag.slug
  showForm.value = true
}

function closeForm(): void {
  showForm.value = false
  editingId.value = null
}

async function handleSubmit(): Promise<void> {
  if (saving.value) return
  saving.value = true
  try {
    if (editingId.value) {
      await update(editingId.value, { ...form })
      showSuccess(t('web.blog.tags.updated'))
    } else {
      await create({ ...form })
      showSuccess(t('web.blog.tags.created'))
    }
    closeForm()
    await fetchList()
  } catch (e) {
    showError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : t('web.blog.tags.save_failed'))
  } finally {
    saving.value = false
  }
}

function removeRow(tag: BlogTag): void {
  deleteTarget.value = tag
  void handleDelete()
}

async function handleDelete(): Promise<void> {
  if (!deleteTarget.value) return
  try {
    await destroy(deleteTarget.value.id)
    showSuccess(t('web.blog.tags.deleted'))
    deleteTarget.value = null
    await fetchList()
  } catch (e) {
    showError(e instanceof ApiError ? e.message : t('web.blog.tags.delete_failed'))
  }
}

onMounted(() => {
  void fetchList()
})

useEchoResync(() => { void fetchList() })
</script>

<template>
  <Card :title="t('web.blog.tags.title')">
    <template #actions>
      <button type="button" class="btn btn-primary btn-sm" @click="openCreate">
        <i class="bi bi-plus-lg me-1"></i> {{ t('web.blog.tags.create') }}
      </button>
    </template>

    <form v-if="showForm" class="row g-2 align-items-end mb-3" @submit.prevent="handleSubmit">
      <div class="col-sm-5">
        <FormInput
          name="name"
          :label="t('web.blog.tags.form.name')"
          v-model="form.name"
          required
          :disabled="saving"
        />
      </div>
      <div class="col-sm-5">
        <FormInput
          name="slug"
          :label="t('web.blog.tags.form.slug')"
          v-model="form.slug"
          :hint="t('web.blog.tags.form.slug_hint')"
          :disabled="saving"
        />
      </div>
      <div class="col-sm-2 d-flex gap-2 pb-1">
        <SubmitButton :label="t('ui.actions.save')" :loading="saving" variant="primary" />
        <button type="button" class="btn btn-outline-secondary" :disabled="saving" @click="closeForm">
          {{ t('ui.actions.cancel') }}
        </button>
      </div>
    </form>

    <DataTable
      :columns="columns"
      :rows="items"
      :loading="loading"
      :error="error"
      @retry="fetchList()"
      :total="pagination.total"
      :page="pagination.current_page"
      :per-page="pagination.per_page"
      empty-icon="bi-tags"
      :empty-title="t('web.blog.tags.empty_title')"
    >
      <template #cell-name="{ row }: { row: BlogTag }">
        <span class="fw-semibold">{{ row.name }}</span>
      </template>
      <template #cell-slug="{ row }: { row: BlogTag }">
        <code class="text-muted">{{ row.slug }}</code>
      </template>
      <template #cell-posts_count="{ row }: { row: BlogTag }">
        <span class="badge text-bg-light border">{{ row.posts_count ?? 0 }}</span>
      </template>
      <template #actions="{ row }: { row: BlogTag }">
        <RowActions
          :actions="[
            { key: 'edit', icon: 'bi-pencil', label: t('ui.actions.edit'), onClick: () => openEdit(row) },
            {
              key: 'delete',
              icon: 'bi-trash',
              label: t('ui.actions.delete'),
              variant: 'danger',
              onClick: () => removeRow(row),
            },
          ]"
        />
      </template>
    </DataTable>
  </Card>
</template>
