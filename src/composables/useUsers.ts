import { ref } from 'vue'
import { get, post, put, del } from '@/api/client'
import type { ApiResponse, UserManagement, UserAssignableRole } from '@/api/types'
import { useResource } from '@/composables/useResource'

export function useUsers() {
  const base = useResource<UserManagement>('users')

  const assignableRoles = ref<UserAssignableRole[]>([])
  const rolesLoading = ref(false)

  async function fetchAssignableRoles(): Promise<UserAssignableRole[]> {
    rolesLoading.value = true
    try {
      const res = await get<ApiResponse<UserAssignableRole[]>>('users/assignable-roles')
      assignableRoles.value = res.data ?? []
      return assignableRoles.value
    } catch {
      assignableRoles.value = []
      return []
    } finally {
      rolesLoading.value = false
    }
  }

  async function createUser(data: Record<string, unknown>): Promise<UserManagement> {
    const res = await post<ApiResponse<UserManagement>>('users', data)
    if (res.status === 'success' && res.data) {
      return res.data
    }
    throw new Error(res.message ?? 'Failed to create user')
  }

  async function updateUser(id: number | string, data: Record<string, unknown>): Promise<UserManagement> {
    const res = await put<ApiResponse<UserManagement>>(`users/${id}`, data)
    if (res.status === 'success' && res.data) {
      return res.data
    }
    throw new Error(res.message ?? 'Failed to update user')
  }

  async function deleteUser(id: number | string): Promise<void> {
    await del<ApiResponse<null>>(`users/${id}`)
  }

  return {
    items: base.items,
    pagination: base.pagination,
    loading: base.loading,
    error: base.error,
    fetchList: base.fetchList,
    fetchOne: base.fetchOne,
    assignableRoles,
    rolesLoading,
    fetchAssignableRoles,
    createUser,
    updateUser,
    deleteUser,
  }
}
