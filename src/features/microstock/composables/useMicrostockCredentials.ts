import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { get, post, del } from '@/api/client'
import type { ApiResponse } from '@/api/types'
import type { MicrostockCredential } from '../types'

export function useMicrostockCredentials() {
  const { t } = useI18n()
  const items = ref<MicrostockCredential[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchList(): Promise<MicrostockCredential[]> {
    loading.value = true
    error.value = null
    try {
      const res = await get<ApiResponse<MicrostockCredential[]>>('microstock/credentials')
      items.value = res.data ?? []
      return items.value
    } catch (e) {
      error.value = e instanceof Error ? e.message : t('web.microstock-credentials.errors.load_failed')
      items.value = []
      return []
    } finally {
      loading.value = false
    }
  }

  async function create(data: {
    marketplace: string
    label: string
    secret: Record<string, string>
  }): Promise<MicrostockCredential> {
    const res = await post<ApiResponse<MicrostockCredential>>('microstock/credentials', data as unknown as Record<string, unknown>)
    if (res.status === 'success' && res.data) {
      return res.data
    }
    throw new Error(res.message ?? t('web.microstock-credentials.errors.save_failed'))
  }

  async function destroy(id: string): Promise<void> {
    const res = await del<ApiResponse<null>>(`microstock/credentials/${id}`)
    if (res.status !== 'success') {
      throw new Error(res.message ?? t('web.microstock-credentials.errors.delete_failed'))
    }
  }

  return {
    items,
    loading,
    error,
    fetchList,
    create,
    destroy,
  }
}
