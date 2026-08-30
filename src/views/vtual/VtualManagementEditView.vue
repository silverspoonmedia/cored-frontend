<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import FormInput from '@/components/FormInput.vue'
import FormTextarea from '@/components/FormTextarea.vue'
import FormSelect from '@/components/FormSelect.vue'
import SubmitButton from '@/components/SubmitButton.vue'
import TableEmptyRow from '@/components/TableEmptyRow.vue'
import { get } from '@/api/client'
import { useVtualManagements } from '@/composables/vtual/useVtualManagements'
import { useAlert } from '@/composables/useAlert'
import { ApiError } from '@/api/types'
import type { ApiResponse, VtualCreator, VtualManagement, VtualManagementCreatorAssignment } from '@/api/types'
import { unwrapListPayload } from '@/composables/useResource'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const mgmt = useVtualManagements()
const { success: showSuccess, error: showError } = useAlert()

const isEdit = computed(() => typeof route.params.id === 'string' && route.params.id.length > 0)
const managementId = computed(() => (typeof route.params.id === 'string' ? route.params.id : ''))
const loading = ref(isEdit.value)
const saving = ref(false)
const errors = ref<Record<string, string[]>>({})
const assignErrors = ref<Record<string, string[]>>({})

const form = reactive({
  name: '',
  slug: '',
  description: '',
  logo_url: '',
  status: 'active',
})

const creators = ref<VtualManagementCreatorAssignment[]>([])
const allCreators = ref<VtualCreator[]>([])
const assignCreatorId = ref('')
const assigning = ref(false)

const statusOptions = computed(() => [
  { value: 'active', label: t('web.vtual-managements.status.active') },
  { value: 'archived', label: t('web.vtual-managements.status.archived') },
])

const assignableCreators = computed(() => {
  const assigned = new Set(creators.value.map((a) => a.creator.id))
  return allCreators.value.filter((c) => !assigned.has(c.id))
})

function fieldError(bag: Record<string, string[]>, field: string): string | null {
  const list = bag[field]
  return list && list.length > 0 ? list[0] ?? null : null
}

function applyManagement(m: VtualManagement): void {
  form.name = m.name
  form.slug = m.slug
  form.description = m.description ?? ''
  form.logo_url = m.logo_url ?? ''
  form.status = m.status
  creators.value = m.creators ?? []
}

async function load(): Promise<void> {
  if (!isEdit.value) {
    loading.value = false
    return
  }
  loading.value = true
  try {
    const [m, creatorList] = await Promise.all([
      mgmt.fetchOne(managementId.value),
      get<ApiResponse<VtualCreator[]>>('vtual/creators', { per_page: 200 }).then(
        (r) => unwrapListPayload<VtualCreator>(r.data).items,
      ),
    ])
    applyManagement(m)
    allCreators.value = creatorList
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.vtual-managements.errors.load_failed'))
  } finally {
    loading.value = false
  }
}

async function handleSubmit(): Promise<void> {
  if (saving.value) return
  saving.value = true
  errors.value = {}

  const payload: Record<string, unknown> = {
    name: form.name,
    description: form.description || null,
    logo_url: form.logo_url || null,
  }
  if (isEdit.value) {
    payload.slug = form.slug
    payload.status = form.status
  } else if (form.slug) {
    payload.slug = form.slug
  }

  try {
    if (isEdit.value) {
      await mgmt.patchOne(managementId.value, payload)
      showSuccess(t('api.vtual.management.updated'))
      return
    }
    const created = await mgmt.create(payload)
    showSuccess(t('api.vtual.management.created'))
    await router.push({ name: 'vtual.managements.edit.view', params: { id: created.id } })
  } catch (e) {
    if (e instanceof ApiError && e.isValidation) {
      errors.value = e.errors ?? {}
      if (Object.keys(errors.value).length === 0) showError(e.message)
    } else if (e instanceof ApiError) {
      showError(e.message)
    } else {
      showError(e instanceof Error ? e.message : t('web.vtual-managements.errors.save_failed'))
    }
  } finally {
    saving.value = false
  }
}

async function handleAssign(): Promise<void> {
  if (!isEdit.value || !assignCreatorId.value || assigning.value) return
  assigning.value = true
  assignErrors.value = {}
  try {
    const updated = await mgmt.assignCreator(managementId.value, assignCreatorId.value)
    creators.value = updated.creators ?? []
    assignCreatorId.value = ''
    showSuccess(t('api.vtual.management.creator_assigned'))
  } catch (e) {
    if (e instanceof ApiError && e.isValidation) {
      assignErrors.value = e.errors ?? {}
      if (Object.keys(assignErrors.value).length === 0) showError(e.message)
    } else {
      showError(e instanceof Error ? e.message : t('web.vtual-managements.errors.assign_failed'))
    }
  } finally {
    assigning.value = false
  }
}

async function handleUnassign(assignment: VtualManagementCreatorAssignment): Promise<void> {
  try {
    const updated = await mgmt.unassignCreator(managementId.value, assignment.creator.id)
    creators.value = updated.creators ?? []
    showSuccess(t('api.vtual.management.creator_unassigned'))
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.vtual-managements.errors.unassign_failed'))
  }
}

function goIndex(): void {
  void router.push({ name: 'vtual.managements.index.view' })
}

watch([isEdit, managementId], () => {
  void load()
}, { immediate: true })
</script>

<template>
  <Card :title="isEdit ? t('web.vtual-managements.edit_title') : t('web.vtual-managements.create_title')">
    <template #actions>
      <button class="btn btn-outline-secondary btn-sm" @click="goIndex">
        <i class="bi bi-arrow-left me-1"></i> {{ t('ui.actions.back') }}
      </button>
    </template>

    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">{{ t('ui.loading') }}</span>
      </div>
    </div>

    <div v-else>
      <form @submit.prevent="handleSubmit">
        <FormInput
          name="name"
          :label="t('web.vtual-managements.form.name')"
          v-model="form.name"
          :error="fieldError(errors, 'name')"
          required
          :disabled="saving"
        />
        <FormInput
          name="slug"
          :label="t('web.vtual-managements.form.slug')"
          v-model="form.slug"
          :error="fieldError(errors, 'slug')"
          :disabled="saving"
          :hint="t('web.vtual-managements.form.slug_hint')"
        />
        <FormTextarea
          name="description"
          :label="t('web.vtual-managements.form.description')"
          v-model="form.description"
          :error="fieldError(errors, 'description')"
          :disabled="saving"
          :rows="4"
        />
        <FormInput
          name="logo_url"
          :label="t('web.vtual-managements.form.logo_url')"
          type="url"
          v-model="form.logo_url"
          :error="fieldError(errors, 'logo_url')"
          :disabled="saving"
        />
        <FormSelect
          v-if="isEdit"
          name="status"
          :label="t('web.vtual-managements.form.status')"
          v-model="form.status"
          :options="statusOptions"
          :error="fieldError(errors, 'status')"
          :disabled="saving"
        />
        <div class="d-flex gap-2">
          <SubmitButton
            :label="isEdit ? t('web.vtual-managements.form.submit_update') : t('web.vtual-managements.form.submit_create')"
            :loading="saving"
            variant="primary"
          />
          <button type="button" class="btn btn-outline-secondary" :disabled="saving" @click="goIndex">
            {{ t('ui.actions.cancel') }}
          </button>
        </div>
      </form>

      <div v-if="isEdit">
        <hr class="my-4">
        <h5 class="mb-2">{{ t('web.vtual-managements.creators.section_title') }}</h5>
        <p class="text-muted small mb-3">{{ t('web.vtual-managements.creators.section_help') }}</p>

        <form class="border rounded p-3 mb-3" @submit.prevent="handleAssign">
          <div class="row g-2 align-items-end">
            <div class="col-md-9">
              <FormSelect
                name="creator_id"
                :label="t('web.vtual-managements.creators.creator')"
                v-model="assignCreatorId"
                :options="assignableCreators.map((c) => ({ value: c.id, label: c.display_name }))"
                :error="fieldError(assignErrors, 'creator_id')"
                required
                :disabled="assigning"
              />
            </div>
            <div class="col-md-3">
              <label class="form-label invisible" aria-hidden="true">&nbsp;</label>
              <div class="d-grid">
                <SubmitButton
                  :loading="assigning"
                  :label="t('web.vtual-managements.creators.assign_button')"
                  size="sm"
                />
              </div>
            </div>
          </div>
        </form>

        <div class="table-responsive">
          <table class="table table-sm table-hover align-middle mb-0" :aria-label="t('web.vtual-managements.creators.table_caption')">
            <caption class="visually-hidden">{{ t('web.vtual-managements.creators.table_caption') }}</caption>
            <thead>
              <tr>
                <th>{{ t('web.vtual-managements.creators.columns.creator') }}</th>
                <th>{{ t('web.vtual-managements.creators.columns.joined_at') }}</th>
                <th class="text-end">{{ t('ui.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <TableEmptyRow
                v-if="creators.length === 0"
                :colspan="3"
                icon="bi-people"
                :title="t('web.vtual-managements.creators.empty')"
              />
              <tr v-for="a in creators" :key="a.assignment_id">
                <td>{{ a.creator.display_name }}</td>
                <td><span class="text-muted small">{{ a.joined_at_formatted ?? a.joined_at ?? '-' }}</span></td>
                <td class="text-end">
                  <button
                    type="button"
                    class="btn btn-outline-danger btn-sm"
                    @click="handleUnassign(a)"
                  >
                    <i class="bi bi-x-lg me-1"></i> {{ t('web.vtual-managements.creators.unassign_button') }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </Card>
</template>
