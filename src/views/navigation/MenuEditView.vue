<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed, watch, defineAsyncComponent } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import FormInput from '@/components/FormInput.vue'
// select2 pulls jQuery — load async so non-form views never download it.
const FormSelect2 = defineAsyncComponent(() => import('@/components/FormSelect2.vue'))
import FormTranslatableInput from '@/components/FormTranslatableInput.vue'
import SubmitButton from '@/components/SubmitButton.vue'
import { useMenus } from '@/composables/navigation/useMenus'
import { normalizeTranslatableMap } from '@/i18n'
import { useLookups } from '@/composables/useLookups'
import { useNavigationHydrate } from '@/composables/navigation/useNavigationHydrate'
import type { MenuLookupKey } from '@/composables/navigation/useNavigationHydrate'
import { useMenuLayouts } from '@/composables/navigation/useMenuLayouts'
import { useMenusRealtime } from '@/composables/navigation/useMenusRealtime'
import { useEchoResync } from '@/composables/useEcho'
import { useAlert } from '@/composables/useAlert'
import { useBreadcrumbTitle } from '@/composables/useBreadcrumbs'
import { isTerminalBatchError } from '@/api/batch'
import { pruneUnresolvedReferences } from '@/utils/navigation/pruneUnresolvedReferences'
import { ApiError } from '@/api/types'
import type { MenuAudience } from '@/api/types'
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

// Trailing breadcrumb crumb: the loaded menu's name, so the crumb reads
// `Menus / Edit / <name>` instead of exposing the uuid route param. Empty on
// create, which leaves the trail at `Menus / Add`.
useBreadcrumbTitle(() => menuName.value || null)

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
  audience: 'auth' as MenuAudience,
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

const audienceOptions = computed<Record<string, string>>(() => ({
  all: t('web.menus.audience.all'),
  auth: t('web.menus.audience.auth'),
  role: t('web.menus.audience.role'),
  guest: t('web.menus.audience.guest'),
}))

const layoutOptions = computed<Record<string, string>>(() => {
  const keys = availableLayouts.value.length ? availableLayouts.value : ['sidebar', 'navbar']
  return Object.fromEntries(keys.map((key) => [key, t(`web.menus.form.layouts.${key}`)]))
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

/**
 * Lookups whose hydrate batch entry did not succeed.
 *
 * A failed lookup leaves its select showing nothing while `form` still holds the
 * ids the menu resource returned, so this list is only used to warn the admin
 * and to skip pruning — pruning a field whose lookup failed
 * would delete stored references on the strength of a failed request.
 */
const failedLookups = ref<MenuLookupKey[]>([])

/**
 * Apply {@link pruneUnresolvedReferences} to the form.
 *
 * The rule itself lives in `src/utils/navigation/pruneUnresolvedReferences.ts`
 * so it can be unit-tested without a component render; this is the adapter that
 * maps the form refs in and the pruned fields back out.
 */
function pruneUnresolved(failed: MenuLookupKey[]): void {
  const pruned = pruneUnresolvedReferences(
    {
      parent: form.parent,
      roles: form.roles,
      userIncludes: form.user_includes,
      userExcludes: form.user_excludes,
    },
    {
      parent: selectedParent.value.map((o) => String(o.value)),
      roles: selectedRoles.value.map((o) => String(o.value)),
      includes: selectedUserIncludes.value.map((o) => String(o.value)),
      excludes: selectedUserExcludes.value.map((o) => String(o.value)),
    },
    failed,
  )

  form.parent = pruned.parent
  form.roles = pruned.roles
  form.user_includes = pruned.userIncludes
  form.user_excludes = pruned.userExcludes
}

const menuAjaxParams = computed(() => ({
  layout: form.layout,
  exclude: menuId.value ?? undefined,
}))

function fieldError(field: string): string | string[] | null {
  return errors.value[field] ?? null
}

async function load(): Promise<void> {
  loading.value = true
  failedLookups.value = []
  loadLayouts().catch(() => {})
  try {
    if (isEdit.value && menuId.value) {
      const batchResult = await hydrateMenuEdit(menuId.value).catch((e) => {
        // A terminal rejection (401/403/429) must not be re-fired standalone:
        // it would just repeat the rejection and a 401 trips global logout.
        if (isTerminalBatchError(e)) throw e
        return null
      })

      const menu = batchResult?.menu ?? await fetchOne(menuId.value)
      form.name = { ...(menu.name_translations ?? {}) }
      form.description = { ...(menu.description_translations ?? {}) }
      form.type = menu.type
      form.layout = menu.layout
      form.route = menu.route ?? ''
      form.hash = menu.hash ?? ''
      form.icon = menu.icon ?? ''
      form.audience = menu.audience
      form.parent = menu.parent_id ?? ''
      form.roles = [...(menu.role_ids ?? [])]
      form.user_includes = [...(menu.user_include_ids ?? [])]
      form.user_excludes = [...(menu.user_exclude_ids ?? [])]
      menuName.value = menu.name

      if (batchResult) {
        failedLookups.value = batchResult.failedLookups
        selectedParent.value = batchResult.parentOptions.map((r) => ({
          value: r.id,
          label: r.text,
          group: r.group,
          level: r.level,
        }))
        selectedRoles.value = batchResult.roleOptions.map((r) => ({ value: r.id, label: r.text }))
        selectedUserIncludes.value = batchResult.userIncludeOptions.map((r) => ({ value: r.id, label: r.text }))
        selectedUserExcludes.value = batchResult.userExcludeOptions.map((r) => ({ value: r.id, label: r.text }))

        // A lookup that succeeded but omitted an id means the reference is
        // genuinely gone (deleted role/user). Drop it so a save cannot send a
        // stale id. Skipped when the lookup itself failed — its emptiness is
        // not evidence.
        pruneUnresolved(batchResult.failedLookups)
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

      // Tell the admin the selects are showing empty because the lookup failed,
      // not because the menu has no roles/users. Without this the form looks
      // loaded and correct but is missing the stored restrictions.
      if (failedLookups.value.length > 0) {
        showError(t('web.menus.hydrate_partial_warning'))
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
    // Defense in depth: the translatable inputs already normalize keys to
    // backend locale codes (`zh_CN`); re-normalize here in case another
    // writer ever feeds the form with SPA keys (`zh-CN`).
    name: normalizeTranslatableMap(form.name),
    description: normalizeTranslatableMap(form.description),
    type: form.type,
    layout: form.layout,
  }

  if (form.route) payload.route = form.route
  if (form.hash) payload.hash = form.hash
  if (form.icon) payload.icon = form.icon
  payload.parent = form.parent || null
  payload.audience = form.audience
  // Role restrictions only exist for the `role` audience; sending them for any
  // other audience would be rejected, and the local selection is kept so
  // toggling back and forth does not lose the admin's picks.
  payload.roles = form.audience === 'role' ? form.roles : []
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

// Live update: this menu edited elsewhere reloads the form data.
const { subscribe: subscribeMenus, unsubscribe: unsubscribeMenus } = useMenusRealtime()
const realtimeHandlers = {
  onMenuTreeChanged: (e: { layout: string; target_user_id?: string | null }) => {
    if (!e.target_user_id && (!e.layout || e.layout === layout.value)) {
      void load()
    }
  },
}

useEchoResync(() => { void load() })

onMounted(() => {
  load()
  subscribeMenus(realtimeHandlers)
})

onUnmounted(() => {
  unsubscribeMenus(realtimeHandlers)
})
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
        :ajax-url="'navigation/lookups/menus'"
        :ajax-params="menuAjaxParams"
        :selected-options="selectedParent"
        grouped
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

      <FormSelect2
        name="audience"
        :label="t('web.menus.form.audience_label')"
        v-model="form.audience"
        :options="audienceOptions"
        :error="fieldError('audience')"
        :hint="t('web.menus.form.audience_hint')"
        :disabled="saving"
      />

      <FormSelect2
        name="roles"
        :label="t('web.menus.form.roles_label')"
        v-model="form.roles"
        :multiple="true"
        :ajax-url="'lookups/roles'"
        :selected-options="selectedRoles"
        :error="fieldError('roles')"
        :hint="t('web.menus.form.roles_hint')"
        :disabled="saving || form.audience !== 'role'"
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
            :ajax-url="'navigation/lookups/menus'"
            :ajax-params="menuAjaxParams"
            :selected-options="selectedReference"
            grouped
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
