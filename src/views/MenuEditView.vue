<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Card from '@/components/Card.vue'
import FormInput from '@/components/FormInput.vue'
import FormCheckbox from '@/components/FormCheckbox.vue'
import FormSelect2 from '@/components/FormSelect2.vue'
import FormTranslatableInput from '@/components/FormTranslatableInput.vue'
import SubmitButton from '@/components/SubmitButton.vue'
import { useMenus } from '@/composables/useMenus'
import { useLookups } from '@/composables/useLookups'
import { useAlert } from '@/composables/useAlert'
import { ApiError } from '@/api/types'
import type { SelectOption } from '@/components/FormSelect2.vue'

const route = useRoute()
const router = useRouter()
const { fetchOne, createMenu, updateMenu } = useMenus()
const { fetchMenus, fetchRoles, fetchUsers } = useLookups()
const { success: showSuccess, error: showError } = useAlert()

const isEdit = computed(() => !!route.params.id)
const menuId = computed(() => route.params.id as string | undefined)
const layout = computed(() => (route.query.layout as string) || 'sidebar')

const loading = ref(true)
const saving = ref(false)
const errors = ref<Record<string, string[]>>({})
const menuName = ref('')

const cardTitle = computed(() =>
  isEdit.value ? `Edit menu: ${menuName.value}` : 'New menu details',
)

const form = reactive({
  name: {} as Record<string, string>,
  description: {} as Record<string, string>,
  type: '',
  layout: layout.value,
  parent: '' as string | null,
  route: '',
  icon: '',
  authenticate: false,
  guest_only: false,
  roles: [] as string[],
  user_includes: [] as string[],
  user_excludes: [] as string[],
  position: '',
  reference_id: '',
})

const typeOptions: Record<string, string> = {
  h: 'Header (h)',
  p: 'Parent (p)',
  c: 'Child (c)',
}

const layoutOptions: Record<string, string> = {
  sidebar: 'Sidebar',
  navbar: 'Navbar',
}

const positionOptions = computed<Record<string, string>>(() => {
  if (isEdit.value) {
    return {
      before: 'Before reference',
      after: 'After reference',
    } as Record<string, string>
  }
  return {
    append: 'Append to group',
    before: 'Before reference',
    after: 'After reference',
  } as Record<string, string>
})

const selectedParent = ref<SelectOption[]>([])
const selectedRoles = ref<SelectOption[]>([])
const selectedUserIncludes = ref<SelectOption[]>([])
const selectedUserExcludes = ref<SelectOption[]>([])
const selectedReference = ref<SelectOption[]>([])

const menuAjaxParams = computed(() => ({
  layout: form.layout,
  exclude: menuId.value ?? undefined,
}))

function fieldError(field: string): string | string[] | null {
  return errors.value[field] ?? null
}

async function load(): Promise<void> {
  loading.value = true
  try {
    if (isEdit.value && menuId.value) {
      const menu = await fetchOne(menuId.value)
      form.name = { ...(menu.name_translations ?? {}) }
      form.description = { ...(menu.description_translations ?? {}) }
      form.type = menu.type
      form.layout = menu.layout
      form.route = menu.route ?? ''
      form.icon = menu.icon ?? ''
      form.authenticate = menu.is_authenticate
      form.guest_only = menu.is_guest_only
      form.parent = menu.parent_id ?? ''
      form.roles = [...(menu.role_ids ?? [])]
      form.user_includes = [...(menu.user_include_ids ?? [])]
      form.user_excludes = [...(menu.user_exclude_ids ?? [])]
      menuName.value = menu.name

      const [parent, roles, includes, excludes] = await Promise.all([
        menu.parent_id
          ? fetchMenus([menu.parent_id], form.layout, menuId.value)
          : Promise.resolve([]),
        fetchRoles(form.roles),
        fetchUsers(form.user_includes),
        fetchUsers(form.user_excludes),
      ])

      selectedParent.value = parent.map((r) => ({ value: r.id, label: r.text }))
      selectedRoles.value = roles.map((r) => ({ value: r.id, label: r.text }))
      selectedUserIncludes.value = includes.map((r) => ({ value: r.id, label: r.text }))
      selectedUserExcludes.value = excludes.map((r) => ({ value: r.id, label: r.text }))
    }
  } catch (e) {
    showError(e instanceof Error ? e.message : 'Failed to load menu')
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
    description: form.description,
    type: form.type,
    layout: form.layout,
  }

  if (form.route) payload.route = form.route
  if (form.icon) payload.icon = form.icon
  payload.parent = form.parent || null
  payload.authenticate = form.authenticate
  payload.guest_only = form.guest_only
  payload.roles = form.roles
  payload.user_includes = form.user_includes
  payload.user_excludes = form.user_excludes

  if (form.position) {
    payload.position = form.position
    if (form.reference_id && (form.position === 'before' || form.position === 'after')) {
      payload.reference_id = form.reference_id
    }
  }

  try {
    if (isEdit.value && menuId.value) {
      await updateMenu(menuId.value, payload)
      showSuccess('Menu updated successfully.')
    } else {
      await createMenu(payload)
      showSuccess('Menu created successfully.')
    }
    router.push({ name: 'menus.index.view', query: { layout: form.layout } })
  } catch (e) {
    if (e instanceof ApiError && e.isValidation) {
      errors.value = e.errors ?? {}
      if (Object.keys(errors.value).length === 0) {
        showError(e.message)
      }
    } else if (e instanceof ApiError) {
      showError(e.message)
    } else {
      showError(e instanceof Error ? e.message : 'Failed to save menu')
    }
  } finally {
    saving.value = false
  }
}

watch(() => form.type, () => {
  if (form.type === 'h') form.parent = null
})

onMounted(load)
</script>

<template>
  <Card :title="cardTitle">
    <template #actions>
      <button class="btn btn-outline-secondary btn-sm" @click="router.push({ name: 'menus.index.view', query: { layout: layout } })">
        <i class="bi bi-arrow-left me-1"></i> Back to List
      </button>
    </template>

    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading…</span>
      </div>
    </div>

    <form v-else @submit.prevent="handleSubmit">
      <div class="row">
        <div class="col-md-6">
          <FormTranslatableInput
            name="name"
            label="Name"
            v-model="form.name"
            :error="fieldError('name')"
            :hint="'Provide a label for each supported locale. Navigation uses the viewer\'s active locale.'"
            required
            :disabled="saving"
          />
        </div>
        <div class="col-md-6">
          <FormSelect2
            name="type"
            label="Type"
            v-model="form.type"
            :options="typeOptions"
            :error="fieldError('type')"
            placeholder="Select type"
            :hint="'h must be root, p under h, c under p.'"
            required
            :disabled="saving"
          />
        </div>
      </div>

      <FormSelect2
        v-if="!isEdit"
        name="layout"
        label="Layout"
        v-model="form.layout"
        :options="layoutOptions"
        :error="fieldError('layout')"
        :hint="'Which shell region renders this menu tree (sidebar or navbar). Cannot be changed after create.'"
        required
        :disabled="saving"
      />
      <FormInput
        v-else
        name="layout"
        label="Layout"
        :model-value="form.layout"
        readonly
        :hint="'Layout is fixed after create. Add a new menu to target another region.'"
      />

      <FormTranslatableInput
        name="description"
        label="Description"
        v-model="form.description"
        :error="fieldError('description')"
        :hint="'Optional helper text per locale.'"
        :disabled="saving"
      />

      <FormSelect2
        name="parent"
        label="Parent"
        v-model="form.parent"
        :ajax-url="'lookups/menus'"
        :ajax-params="menuAjaxParams"
        :selected-options="selectedParent"
        :error="fieldError('parent')"
        placeholder="None (root)"
        :disabled="saving || form.type === 'h'"
        :hint="form.type === 'h' ? 'Headers cannot have a parent.' : ''"
      />

      <div class="row">
        <div class="col-md-6">
          <FormInput
            name="route"
            label="Route Name"
            v-model="form.route"
            :error="fieldError('route')"
            :disabled="saving"
            hint="Registered Laravel route name (e.g. dashboard), not a URL."
          />
        </div>
        <div class="col-md-6">
          <FormInput
            name="icon"
            label="Icon"
            v-model="form.icon"
            :error="fieldError('icon')"
            :disabled="saving"
            hint="Full icon class, e.g. bi bi-house."
          />
        </div>
      </div>

      <div class="row">
        <div class="col-md-6">
          <FormCheckbox
            name="authenticate"
            label="Authenticated users only"
            v-model="form.authenticate"
            :error="fieldError('authenticate')"
            :disabled="saving"
          />
        </div>
        <div class="col-md-6">
          <FormCheckbox
            name="guest_only"
            label="Guests only"
            v-model="form.guest_only"
            :error="fieldError('guest_only')"
            :disabled="saving"
          />
        </div>
      </div>

      <FormSelect2
        name="roles"
        label="Roles allowed to view"
        v-model="form.roles"
        :multiple="true"
        :ajax-url="'lookups/roles'"
        :selected-options="selectedRoles"
        :error="fieldError('roles')"
        :hint="'Leave empty for everyone who passes other rules. Incompatible with guest only.'"
        :disabled="saving"
      />

      <div class="row">
        <div class="col-md-6">
          <FormSelect2
            name="user_includes"
            label="Included users (allowlist)"
            v-model="form.user_includes"
            :multiple="true"
            :ajax-url="'lookups/users'"
            :selected-options="selectedUserIncludes"
            :error="fieldError('user_includes')"
            :disabled="saving"
          />
        </div>
        <div class="col-md-6">
          <FormSelect2
            name="user_excludes"
            label="Excluded users (blacklist)"
            v-model="form.user_excludes"
            :multiple="true"
            :ajax-url="'lookups/users'"
            :selected-options="selectedUserExcludes"
            :error="fieldError('user_excludes')"
            :disabled="saving"
          />
        </div>
      </div>

      <hr />
      <p class="text-muted small mb-2">Placement (optional)</p>

      <div class="row">
        <div class="col-md-6">
          <FormSelect2
            name="position"
            label="Position"
            v-model="form.position"
            :options="positionOptions"
            :error="fieldError('position')"
            :placeholder="isEdit ? 'Do not change order' : 'Default (end of group)'"
            :disabled="saving"
          />
        </div>
        <div class="col-md-6">
          <FormSelect2
            name="reference_id"
            label="Reference menu"
            v-model="form.reference_id"
            :ajax-url="'lookups/menus'"
            :ajax-params="menuAjaxParams"
            :selected-options="selectedReference"
            :error="fieldError('reference_id')"
            placeholder="Select reference menu"
            :hint="isEdit ? 'Required when position is set. Clear both to keep order unchanged.' : 'Required when position is before or after.'"
            :disabled="saving"
          />
        </div>
      </div>

      <div class="d-flex gap-2 mt-3">
        <SubmitButton :label="isEdit ? 'Update' : 'Save'" :loading="saving" variant="primary" />
        <button type="button" class="btn btn-outline-secondary" :disabled="saving" @click="router.push({ name: 'menus.index.view', query: { layout: form.layout } })">
          Cancel
        </button>
      </div>
    </form>
  </Card>
</template>
