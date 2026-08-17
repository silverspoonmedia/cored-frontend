import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { get, put } from '@/api/client'
import type { ApiResponse, DomainAccess } from '@/api/types'

const items = ref<DomainAccess[]>([])
const loading = ref(false)
const updatingKey = ref<string | null>(null)
const error = ref<string | null>(null)

export function useDomainAccess() {
  const { t } = useI18n()

  async function fetchList(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const res = await get<ApiResponse<DomainAccess[]>>('admin/domain-access')
      items.value = res.data ?? []
    } catch (e) {
      error.value = e instanceof Error ? e.message : t('web.domain-access.load_failed')
    } finally {
      loading.value = false
    }
  }

  async function toggleVisibility(key: string, visibility: 'public' | 'private'): Promise<boolean> {
    updatingKey.value = key
    error.value = null
    try {
      const res = await put<ApiResponse<DomainAccess>>(`admin/domain-access/${key}`, { visibility })
      if (res.data) {
        const idx = items.value.findIndex((d) => d.key === key)
        if (idx >= 0) {
          items.value[idx] = res.data
        }
        return true
      }
      return false
    } catch (e) {
      error.value = e instanceof Error ? e.message : t('web.domain-access.failed_update_visibility', { label: key })
      return false
    } finally {
      updatingKey.value = null
    }
  }

  return {
    items,
    loading,
    updatingKey,
    error,
    fetchList,
    toggleVisibility,
  }
}
