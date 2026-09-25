/**
 * Event create/edit state for VtualEventEditView.
 * Mirrors useVtualManagementEdit: create vs edit via route param,
 * load/save, ApiError validation mapping.
 */
import { ref, reactive, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useVtualEvents } from '@/composables/vtual/useVtualEvents'
import { useVtualManagements } from '@/composables/vtual/useVtualManagements'
import { useAlert } from '@/composables/useAlert'
import { ApiError } from '@/api/types'
import type { VtualManagement, VtualManagementEvent } from '@/api/types'

function toDatetimeLocal(value: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function useVtualEventEdit() {
  const route = useRoute()
  const router = useRouter()
  const { t } = useI18n()
  const events = useVtualEvents()
  const managements = useVtualManagements()
  const { success: showSuccess, error: showError } = useAlert()

  const isEdit = computed(() => typeof route.params.id === 'string' && route.params.id.length > 0)
  const eventId = computed(() => (typeof route.params.id === 'string' ? route.params.id : ''))
  const loading = ref(isEdit.value)
  const saving = ref(false)
  const errors = ref<Record<string, string[]>>({})

  const form = reactive({
    management_id: '',
    title: '',
    description: '',
    thumbnail_url: '',
    url: '',
    starts_at: '',
    ends_at: '',
    timezone: '',
    creator_id: '',
    is_featured: false,
  })

  const managementOptions = ref<{ value: string; label: string }[]>([])
  const loadedEvent = ref<VtualManagementEvent | null>(null)
  const loadedManagementId = computed(() => loadedEvent.value?.management_id ?? '')

  function fieldError(bag: Record<string, string[]>, field: string): string | null {
    const list = bag[field]
    return list && list.length > 0 ? list[0] ?? null : null
  }

  async function loadManagements(): Promise<void> {
    try {
      const list = await managements.fetchList({ per_page: 100 })
      managementOptions.value = list
        .filter((m: VtualManagement) => m.my_role === 'owner' || m.my_role === 'admin' || m.my_role === 'staff')
        .map((m: VtualManagement) => ({ value: m.id, label: m.name }))
      if (!isEdit.value && managementOptions.value.length > 0 && !form.management_id) {
        form.management_id = managementOptions.value[0]?.value ?? ''
      }
      if (isEdit.value && loadedEvent.value && !managementOptions.value.some((o) => o.value === loadedManagementId.value)) {
        managementOptions.value = [
          { value: loadedManagementId.value, label: loadedEvent.value.management?.name ?? '—' },
          ...managementOptions.value,
        ]
      }
    } catch {
      // silent — create shows its own save error, edit keeps loaded value
    }
  }

  async function load(): Promise<void> {
    if (!isEdit.value) {
      loading.value = false
      return
    }
    loading.value = true
    try {
      const event = await events.fetchOne(eventId.value)
      loadedEvent.value = event
      form.management_id = event.management_id
      form.title = event.title
      form.description = event.description ?? ''
      form.thumbnail_url = event.thumbnail_url ?? ''
      form.url = event.url ?? ''
      form.starts_at = toDatetimeLocal(event.starts_at)
      form.ends_at = toDatetimeLocal(event.ends_at)
      form.timezone = event.timezone ?? ''
      form.creator_id = event.creator_id ?? ''
      form.is_featured = event.is_featured
    } catch (e) {
      showError(e instanceof Error ? e.message : t('web.vtual-events.errors.load_failed'))
    } finally {
      loading.value = false
    }
  }

  function buildPayload(): Record<string, unknown> {
    return {
      title: form.title,
      description: form.description || null,
      thumbnail_url: form.thumbnail_url || null,
      url: form.url || null,
      starts_at: form.starts_at,
      ends_at: form.ends_at || null,
      timezone: form.timezone || null,
      creator_id: form.creator_id || null,
      is_featured: form.is_featured,
    }
  }

  /**
   * PATCH body. `creator_id` is omitted on purpose: the form has no creator
   * picker, so sending `null` would silently detach an existing line-up.
   */
  function buildUpdatePayload(): Record<string, unknown> {
    const payload = buildPayload()
    delete payload.creator_id

    return payload
  }

  async function handleSubmit(): Promise<void> {
    if (saving.value) return
    saving.value = true
    errors.value = {}

    try {
      if (isEdit.value) {
        await events.updateEvent(form.management_id, eventId.value, buildUpdatePayload())
        showSuccess(t('api.vtual.management.event_updated'))
        await router.push({ name: 'vtual.events.index.view' })
        return
      }

      if (!form.management_id) {
        errors.value = { management_id: [t('web.vtual-events.form.management_required')] }
        return
      }
      await events.createEvent(form.management_id, buildPayload())
      showSuccess(t('api.vtual.management.event_created'))
      await router.push({ name: 'vtual.events.index.view' })
    } catch (e) {
      if (e instanceof ApiError && e.isValidation) {
        errors.value = e.errors ?? {}
        if (Object.keys(errors.value).length === 0) showError(e.message)
      } else if (e instanceof ApiError) {
        showError(e.message)
      } else {
        showError(e instanceof Error ? e.message : t('web.vtual-events.errors.save_failed'))
      }
    } finally {
      saving.value = false
    }
  }

  function goIndex(): void {
    void router.push({ name: 'vtual.events.index.view' })
  }

  watch(isEdit, () => {
    void load()
  }, { immediate: true })

  watch([isEdit, loadedEvent], () => {
    void loadManagements()
  }, { immediate: true })

  return {
    isEdit,
    loading,
    saving,
    errors,
    form,
    managementOptions,
    fieldError,
    handleSubmit,
    goIndex,
  }
}
