import { onMounted, ref } from 'vue'
import type { Ref } from 'vue'
import { useI18n } from 'vue-i18n'

export interface DetailLoader<T> {
  data: Ref<T | null>
  loading: Ref<boolean>
  error: Ref<string | null>
  load: () => Promise<T | null>
}

/**
 * Standard detail-view loader: auto-loads on mount, exposes an error ref so the
 * view can render an ErrorState with retry instead of going blank on failure.
 */
export function useDetailLoader<T>(
  loader: () => Promise<T>,
  options?: { immediate?: boolean; fallbackMessage?: string },
): DetailLoader<T> {
  const { t } = useI18n()
  const data: Ref<T | null> = ref(null)
  const loading = ref(true)
  const error = ref<string | null>(null)

  async function load(): Promise<T | null> {
    loading.value = true
    error.value = null
    try {
      data.value = await loader()
      return data.value
    } catch (e) {
      data.value = null
      error.value = e instanceof Error && e.message
        ? e.message
        : (options?.fallbackMessage ?? t('ui.shared.load_failed'))
      return null
    } finally {
      loading.value = false
    }
  }

  if (options?.immediate !== false) {
    onMounted(load)
  }

  return { data, loading, error, load }
}
