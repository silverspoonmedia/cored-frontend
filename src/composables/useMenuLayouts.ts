import { ref } from 'vue'
import i18n from '@/i18n'
import { get } from '@/api/client'
import type { ApiResponse } from '@/api/types'

const layouts = ref<string[]>([])
const loaded = ref(false)
const error = ref<string | null>(null)
let fetchPromise: Promise<void> | null = null

async function loadLayouts(force = false): Promise<void> {
  if (loaded.value && !force) return
  if (fetchPromise) return fetchPromise

  error.value = null
  fetchPromise = (async () => {
    try {
      const res = await get<ApiResponse<{ layouts: string[] }>>('navigation/menus/layouts')
      if (res.status === 'success' && Array.isArray(res.data?.layouts)) {
        layouts.value = res.data.layouts
        loaded.value = true
      } else {
        error.value = res.message ?? i18n.global.t('web.navigation.load_failed')
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : i18n.global.t('web.navigation.load_failed')
    } finally {
      fetchPromise = null
    }
  })()

  return fetchPromise
}

export function useMenuLayouts() {
  return {
    layouts,
    loaded,
    error,
    loadLayouts,
  }
}
