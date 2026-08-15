import { batch } from '@/api/client'
import { bodyOf } from '@/api/batch'
import type {
  AssignableRole,
  NotificationAudience,
  NotificationAudienceListPayload,
} from '@/api/types'

/**
 * Batch-hydrate for Notification audience edit view.
 */

interface NotificationAudienceEditResult {
  audience: NotificationAudience | null
  assignableRoles: AssignableRole[] | null
}

async function hydrateAudienceEdit(audienceType: string): Promise<NotificationAudienceEditResult> {
  const [audienceRes, listRes] = await batch<unknown>([
    { path: `admin/notification-audiences/${audienceType}` },
    { path: 'admin/notification-audiences' },
  ])

  const listPayload = bodyOf<NotificationAudienceListPayload>(listRes)?.data ?? null

  return {
    audience: bodyOf<NotificationAudience>(audienceRes)?.data ?? null,
    assignableRoles: listPayload?.assignable_roles ?? null,
  }
}

export function useNotificationsHydrate() {
  return {
    hydrateAudienceEdit,
  }
}
