/**
 * Event create/edit state for VtualEventEditView.
 * Mirrors useVtualManagementEdit: create vs edit via route param,
 * load/save, ApiError validation mapping.
 */
import { ref, reactive, computed, watch, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useVtualEvents } from '@/composables/vtual/useVtualEvents'
import { useVtualManagements } from '@/composables/vtual/useVtualManagements'
import { useAlert } from '@/composables/useAlert'
import { useVtualRealtime, type ManagementUpdatedPayload } from '@/composables/vtual/useVtualRealtime'
import { ApiError } from '@/api/types'
import type { VtualManagement, VtualManagementEvent } from '@/api/types'

/** Statuses the backend refuses to update (`event_not_actionable`). */
const LOCKED_STATUSES = new Set(['ended', 'cancelled'])

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
    remoteLocked.value = false
    try {
      const event = await events.fetchOne(eventId.value)
      loadedEvent.value = event
      form.management_id = event.management_id
      applyEvent(event)
      remoteLocked.value = LOCKED_STATUSES.has(event.status)
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
    if (saving.value || remoteLocked.value) return
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

  // --- Realtime -------------------------------------------------------------
  // Another org member may create/update/cancel an event while this form is
  // open. The form holds only editable fields, so applying a remote snapshot
  // blindly would overwrite whatever the actor has typed — the same hazard
  // `useVtualManagementEdit` avoids by applying collections only.
  //
  // Rule: refetch on the push, then
  //   - event gone, or left an editable status → lock the form (the submit
  //     would only fail with `event_not_actionable`) and say why;
  //   - otherwise → adopt the fresh values only when the actor has no unsaved
  //     edits. While they are typing, the form is left alone.

  const remoteLocked = ref(false)

  /**
   * Whether our handler is registered on the management channel. Deliberately
   * not `subscribeManagement()`'s return value: that reports whether the channel
   * is *attached*, and attach is deferred until Echo exists, so a form opened
   * before `initEcho()` would read `false` and never release its handler.
   */
  let realtimeRegistered = false

  /** Does the form still hold exactly what the server last told us? */
  function formIsPristine(event: VtualManagementEvent): boolean {
    return (
      form.title === event.title
      && form.description === (event.description ?? '')
      && form.thumbnail_url === (event.thumbnail_url ?? '')
      && form.url === (event.url ?? '')
      && form.starts_at === toDatetimeLocal(event.starts_at)
      && form.ends_at === toDatetimeLocal(event.ends_at)
      && form.timezone === (event.timezone ?? '')
      && form.is_featured === event.is_featured
    )
  }

  function applyEvent(event: VtualManagementEvent): void {
    form.title = event.title
    form.description = event.description ?? ''
    form.thumbnail_url = event.thumbnail_url ?? ''
    form.url = event.url ?? ''
    form.starts_at = toDatetimeLocal(event.starts_at)
    form.ends_at = toDatetimeLocal(event.ends_at)
    form.timezone = event.timezone ?? ''
    form.creator_id = event.creator_id ?? ''
    form.is_featured = event.is_featured
  }

  async function refetchRealtime(): Promise<void> {
    if (!isEdit.value || saving.value) return

    try {
      const event = await events.fetchOne(eventId.value)

      if (LOCKED_STATUSES.has(event.status)) {
        loadedEvent.value = event
        remoteLocked.value = true
        showError(t('web.vtual-events.errors.not_editable'))
        return
      }

      if (loadedEvent.value && formIsPristine(loadedEvent.value)) {
        applyEvent(event)
      }
      loadedEvent.value = event
    } catch {
      // 404 / gone: the event was archived out from under the form. Lock it
      // rather than let the actor submit into a 404.
      remoteLocked.value = true
      showError(t('web.vtual-events.errors.not_editable'))
    }
  }

  function onManagementUpdated(payload: ManagementUpdatedPayload): void {
    if (payload.kind !== 'event') return
    // A null ref_id means the push did not name the row; treat it as relevant.
    if (payload.ref_id !== null && payload.ref_id !== eventId.value) return
    void refetchRealtime()
  }

  function subscribeRealtime(): void {
    if (realtimeRegistered || !isEdit.value) return
    const managementId = loadedEvent.value?.management_id
    if (!managementId) return

    const { subscribeManagement } = useVtualRealtime()
    subscribeManagement(managementId, onManagementUpdated)
    realtimeRegistered = true
  }

  function unsubscribeRealtime(): void {
    if (!realtimeRegistered) return
    const managementId = loadedEvent.value?.management_id
    if (managementId) {
      const { unsubscribeManagement } = useVtualRealtime()
      unsubscribeManagement(managementId, onManagementUpdated)
    }
    realtimeRegistered = false
  }

  onUnmounted(() => {
    unsubscribeRealtime()
  })

  watch(isEdit, () => {
    void load()
  }, { immediate: true })

  watch(isEdit, () => {
    void loadManagements()
  }, { immediate: true })

  // Re-subscribe when the target org changes (create → edit, or a different id).
  // Keyed on the id, not on `loadedEvent`, so a realtime refetch — which
  // replaces that object — does not re-bind or re-fetch the org list.
  watch([isEdit, loadedManagementId], () => {
    if (isEdit.value && loadedManagementId.value !== '') {
      subscribeRealtime()
    } else {
      unsubscribeRealtime()
    }
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
    remoteLocked,
  }
}
