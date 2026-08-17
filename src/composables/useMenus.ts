import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { get, post, put, del } from '@/api/client'
import type { ApiResponse, MenuListItem, MenuTrashedItem } from '@/api/types'

export function useMenus() {
  const { t } = useI18n()
  const items = ref<MenuListItem[]>([])
  const trashedItems = ref<MenuTrashedItem[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchList(layout = 'sidebar', loadType?: string): Promise<MenuListItem[]> {
    loading.value = true
    error.value = null
    try {
      const params: Record<string, unknown> = { display_mode: 'query', layout }
      if (loadType) params.load_type = loadType
      const res = await get<ApiResponse<MenuListItem[]>>('navigation/menus/list', params)
      items.value = res.data ?? []
      return items.value
    } catch (e) {
      error.value = e instanceof Error ? e.message : t('web.menus.load_failed')
      items.value = []
      return []
    } finally {
      loading.value = false
    }
  }

  async function fetchTrashed(layout = 'sidebar', loadType?: string): Promise<MenuTrashedItem[]> {
    loading.value = true
    error.value = null
    try {
      const params: Record<string, unknown> = { display_mode: 'query', layout }
      if (loadType) params.load_type = loadType
      const res = await get<ApiResponse<MenuTrashedItem[]>>('navigation/menus/trashed', params)
      trashedItems.value = res.data ?? []
      return trashedItems.value
    } catch (e) {
      error.value = e instanceof Error ? e.message : t('web.menus.load_trashed_failed')
      trashedItems.value = []
      return []
    } finally {
      loading.value = false
    }
  }

  async function fetchOne(id: string): Promise<MenuListItem> {
    const res = await get<ApiResponse<MenuListItem>>(`navigation/menus/${id}`)
    if (res.status === 'success' && res.data) {
      return res.data
    }
    throw new Error(res.message ?? t('web.menus.load_failed'))
  }

  async function createMenu(data: Record<string, unknown>): Promise<MenuListItem> {
    const res = await post<ApiResponse<MenuListItem>>('navigation/menus', data)
    if (res.status === 'success' && res.data) {
      return res.data
    }
    throw new Error(res.message ?? t('web.menus.save_failed'))
  }

  async function updateMenu(id: string, data: Record<string, unknown>): Promise<MenuListItem> {
    const res = await put<ApiResponse<MenuListItem>>(`navigation/menus/${id}`, data)
    if (res.status === 'success' && res.data) {
      return res.data
    }
    throw new Error(res.message ?? t('web.menus.save_failed'))
  }

  async function deleteMenu(id: string, cascade = false): Promise<void> {
    await del<ApiResponse<null>>(`navigation/menus/${id}`, cascade ? { cascade: true } : undefined)
  }

  async function restoreMenu(id: string): Promise<MenuListItem> {
    const res = await post<ApiResponse<MenuListItem>>(`navigation/menus/${id}/restore`)
    if (res.status === 'success' && res.data) {
      return res.data
    }
    throw new Error(res.message ?? t('web.menus.restore_failed'))
  }

  return {
    items,
    trashedItems,
    loading,
    error,
    fetchList,
    fetchTrashed,
    fetchOne,
    createMenu,
    updateMenu,
    deleteMenu,
    restoreMenu,
  }
}
