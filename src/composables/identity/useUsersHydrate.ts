import { batch } from '@/api/client'
import { bodyOf } from '@/api/batch'
import type { UserManagement, UserAssignableRole, ActivityLog } from '@/api/types'

/**
 * Batch-hydrate for User management views.
 */

interface UserEditResult {
  user: UserManagement | null
  assignableRoles: UserAssignableRole[] | null
  activityLogs: ActivityLog[] | null
}

async function hydrateUserEdit(userId: string): Promise<UserEditResult> {
  const [userRes, rolesRes, logsRes] = await batch<unknown>([
    { path: `users/${userId}` },
    { path: 'users/assignable-roles' },
    { path: `users/${userId}/activity-logs`, query: { display_mode: 'query' } },
  ])

  return {
    user: bodyOf<UserManagement>(userRes)?.data ?? null,
    assignableRoles: bodyOf<UserAssignableRole[]>(rolesRes)?.data ?? null,
    activityLogs: bodyOf<ActivityLog[]>(logsRes)?.data ?? null,
  }
}

export function useUsersHydrate() {
  return {
    hydrateUserEdit,
  }
}
