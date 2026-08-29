<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import FormInput from '@/components/FormInput.vue'
import FormCheckbox from '@/components/FormCheckbox.vue'
import FormSelect2 from '@/components/FormSelect2.vue'
import FormTranslatableInput from '@/components/FormTranslatableInput.vue'
import SubmitButton from '@/components/SubmitButton.vue'
import { useMenus } from '@/composables/navigation/useMenus'
import { useLookups } from '@/composables/useLookups'
import { useNavigationHydrate } from '@/composables/navigation/useNavigationHydrate'
import { useMenuLayouts } from '@/composables/navigation/useMenuLayouts'
import { useAlert } from '@/composables/useAlert'
import { ApiError } from '@/api/types'
import type { SelectOption } from '@/components/FormSelect2.vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { fetchOne, createMenu, updateMenu } = useMenus()
const { fetchMenus, fetchRoles, fetchUsers } = useLookups()
const { hydrateMenuEdit } = useNavigationHydrate()
const { layouts: availableLayouts, loadLayouts } = useMenuLayouts()
const { success: showSuccess, error: showError } = useAlert()

const isEdit = computed(() => !!route.params.id)
const menuId = computed(() => route.params.id as string | undefined)
const layout = computed(() => (route.query.layout as string) || 'sidebar')

const loading = ref(true)
const saving = ref(false)
const errors = ref<Record<string, string[]>>({})
const menuName = ref('')

const cardTitle = computed(() =>
  isEdit.value ? t('web.menus.edit_card_title', { name: menuName.value }) : t('web.menus.new_card_title'),
)

const form = reactive({
  name: {} as Record<string, string>,
  description: {} as Record<string, string>,
  type: '',
  layout: layout.value,
  parent: '' as string | null,
  route: '',
  hash: '',
  icon: '',
  authenticate: false,
  guest_only: false,
  roles: [] as string[],
  user_includes: [] as string[],
  user_excludes: [] as string[],
  position: '',
  reference_id: '',
})

const typeOptions = computed<Record<string, string>>(() => ({
  h: t('web.menus.form.types.h'),
  p: t('web.menus.form.types.p'),
  c: t('web.menus.form.types.c'),
}))

const layoutOptions = computed<Record<string, string>>(() => {
  const fallback: Record<string, string> = {
    sidebar: t('web.menus.form.layouts.sidebar'),
    navbar: t('web.menus.form.layouts.navbar'),
    vtual: t('web.menus.form.layouts.vtual'),
  }
  const result: Record<string, string> = {}
  for (const key of availableLayouts.value.length ? availableLayouts.value : Object.keys(fallback)) {
    result[key] = fallback[key] ?? key
  }
  return result
})

const positionOptions = computed<Record<string, string>>(() => {
  if (isEdit.value) {
    return {
      before: t('web.menus.form.position.before'),
      after: t('web.menus.form.position.after'),
    } as Record<string, string>
  }
  return {
    append: t('web.menus.form.position.append'),
    before: t('web.menus.form.position.before'),
    after: t('web.menus.form.position.after'),
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
  loadLayouts().catch(() => {})
  try {
    if (isEdit.value && menuId.value) {
      const batchResult = await hydrateMenuEdit(menuId.value).catch(() => null)

      const menu = batchResult?.menu ?? await fetchOne(menuId.value)
      form.name = { ...(menu.name_translations ?? {}) }
      form.description = { ...(menu.description_translations ?? {}) }
      form.type = menu.type
      form.layout = menu.layout
      form.route = menu.route ?? ''
      form.hash = menu.hash ?? ''
      form.icon = menu.icon ?? ''
      form.authenticate = menu.is_authenticate
      form.guest_only = menu.is_guest_only
      form.parent = menu.parent_id ?? ''
      form.roles = [...(menu.role_ids ?? [])]
      form.user_includes = [...(menu.user_include_ids ?? [])]
      form.user_excludes = [...(menu.user_exclude_ids ?? [])]
      menuName.value = menu.name

      if (batchResult) {
        selectedParent.value = batchResult.parentOptions.map((r) => ({ value: r.id, label: r.text }))
        selectedRoles.value = batchResult.roleOptions.map((r) => ({ value: r.id, label: r.text }))
        selectedUserIncludes.value = batchResult.userIncludeOptions.map((r) => ({ value: r.id, label: r.text }))
        selectedUserExcludes.value = batchResult.userExcludeOptions.map((r) => ({ value: r.id, label: r.text }))
      } else {
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
    }
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.menus.load_failed'))
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
  if (form.hash) payload.hash = form.hash
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
      showSuccess(t('api.navigation.updated'))
    } else {
      await createMenu(payload)
      showSuccess(t('api.navigation.created'))
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
      showError(e instanceof Error ? e.message : t('web.menus.save_failed'))
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
      <router-link class="btn btn-outline-secondary btn-sm" :to="{ name: 'menus.index.view', query: { layout: layout } }">
        <i class="bi bi-arrow-left me-1"></i> {{ t('web.menus.back_to_list') }}
      </router-link>
    </template>

    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">{{ t('ui.loading') }}</span>
      </div>
    </div>

    <form v-else @submit.prevent="handleSubmit">
      <div class="row">
        <div class="col-md-6">
          <FormTranslatableInput
            name="name"
            :label="t('web.menus.form.name_label')"
            v-model="form.name"
            :error="fieldError('name')"
            :hint="t('web.menus.form.name_hint')"
            required
            :disabled="saving"
          />
        </div>
        <div class="col-md-6">
          <FormSelect2
            name="type"
            :label="t('web.menus.columns.type')"
            v-model="form.type"
            :options="typeOptions"
            :error="fieldError('type')"
            :placeholder="t('web.menus.form.type_placeholder')"
            :hint="t('web.menus.form.type_hint')"
            required
            :disabled="saving"
          />
        </div>
      </div>

      <FormSelect2
        v-if="!isEdit"
        name="layout"
        :label="t('web.menus.columns.layout')"
        v-model="form.layout"
        :options="layoutOptions"
        :error="fieldError('layout')"
        :hint="t('web.menus.form.layout_hint')"
        required
        :disabled="saving"
      />
      <FormInput
        v-else
        name="layout"
        :label="t('web.menus.columns.layout')"
        :model-value="form.layout"
        readonly
        :hint="t('web.menus.form.layout_readonly_hint')"
      />

      <FormTranslatableInput
        name="description"
        :label="t('web.menus.form.description_label')"
        v-model="form.description"
        :error="fieldError('description')"
        :hint="t('web.menus.form.description_hint')"
        :disabled="saving"
      />

      <FormSelect2
        name="parent"
        :label="t('web.menus.form.parent_label')"
        v-model="form.parent"
        :ajax-url="'lookups/menus'"
        :ajax-params="menuAjaxParams"
        :selected-options="selectedParent"
        :error="fieldError('parent')"
        :placeholder="t('web.menus.form.parent_placeholder')"
        :disabled="saving || form.type === 'h'"
        :hint="form.type === 'h' ? t('web.menus.form.headers_no_parent') : ''"
      />

      <div class="row">
        <div class="col-md-6">
          <FormInput
            name="route"
            :label="t('web.menus.form.route_label')"
            v-model="form.route"
            :error="fieldError('route')"
            :disabled="saving"
            :hint="t('web.menus.form.route_hint')"
          />
          <FormInput
            name="hash"
            :label="t('web.menus.form.hash_label')"
            v-model="form.hash"
            :error="fieldError('hash')"
            :disabled="saving"
            :hint="t('web.menus.form.hash_hint')"
          />
        </div>
        <div class="col-md-6">
          <FormInput
            name="icon"
            :label="t('web.menus.form.icon_label')"
            v-model="form.icon"
            :error="fieldError('icon')"
            :disabled="saving"
            :hint="t('web.menus.form.icon_hint')"
          />
        </div>
      </div>

      <div class="row">
        <div class="col-md-6">
          <FormCheckbox
            name="authenticate"
            :label="t('web.menus.form.authenticate')"
            v-model="form.authenticate"
            :error="fieldError('authenticate')"
            :disabled="saving"
          />
        </div>
        <div class="col-md-6">
          <FormCheckbox
            name="guest_only"
            :label="t('web.menus.form.guest_only')"
            v-model="form.guest_only"
            :error="fieldError('guest_only')"
            :disabled="saving"
          />
        </div>
      </div>

      <FormSelect2
        name="roles"
        :label="t('web.menus.form.roles_label')"
        v-model="form.roles"
        :multiple="true"
        :ajax-url="'lookups/roles'"
        :selected-options="selectedRoles"
        :error="fieldError('roles')"
        :hint="t('web.menus.form.roles_hint')"
        :disabled="saving"
      />

      <div class="row">
        <div class="col-md-6">
          <FormSelect2
            name="user_includes"
            :label="t('web.menus.form.user_includes')"
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
            :label="t('web.menus.form.user_excludes')"
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
      <p class="text-muted small mb-2">{{ t('web.menus.form.placement_heading') }}</p>

      <div class="row">
        <div class="col-md-6">
          <FormSelect2
            name="position"
            :label="t('web.menus.form.position_label')"
            v-model="form.position"
            :options="positionOptions"
            :error="fieldError('position')"
            :placeholder="isEdit ? t('web.menus.form.position_no_change') : t('web.menus.form.position_default')"
            :disabled="saving"
          />
        </div>
        <div class="col-md-6">
          <FormSelect2
            name="reference_id"
            :label="t('web.menus.form.reference_label')"
            v-model="form.reference_id"
            :ajax-url="'lookups/menus'"
            :ajax-params="menuAjaxParams"
            :selected-options="selectedReference"
            :error="fieldError('reference_id')"
            :placeholder="t('web.menus.form.reference_placeholder')"
            :hint="isEdit ? t('web.menus.form.reference_hint_edit') : t('web.menus.form.reference_hint_create')"
            :disabled="saving"
          />
        </div>
      </div>

      <div class="d-flex gap-2 mt-3">
        <SubmitButton :label="isEdit ? t('actions.update') : t('actions.save')" :loading="saving" variant="primary" />
        <router-link
          class="btn btn-outline-secondary"
          :class="{ disabled: saving }"
          :to="{ name: 'menus.index.view', query: { layout: form.layout } }"
          :aria-disabled="saving ? 'true' : undefined"
          :tabindex="saving ? -1 : undefined"
        >
          {{ t('actions.cancel') }}
        </router-link>
      </div>
    </form>
  </Card>
</template>
