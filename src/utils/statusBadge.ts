export type BadgeColor =
  | 'success'
  | 'warning'
  | 'secondary'
  | 'danger'
  | 'dark'
  | 'info'
  | 'light'
  | 'primary'

export const STATUS_BADGE_DEFAULT: Record<string, BadgeColor> = {
  active: 'success',
  pending: 'warning',
  archived: 'secondary',
  revoked: 'dark',
  inactive: 'secondary',
  verified: 'success',
  unverified: 'warning',
  enabled: 'success',
  disabled: 'danger',
  draft: 'secondary',
  published: 'success',
  suspended: 'danger',
  expired: 'dark',
}

/** Invoice / checkout statuses. `expired` is secondary here, not default dark. */
export const INVOICE_STATUS_BADGE: Record<string, BadgeColor> = {
  paid: 'success',
  pending: 'warning',
  challenge: 'info',
  expired: 'secondary',
  failed: 'danger',
  cancelled: 'dark',
  refunded: 'info',
}

/** Catalog `Service.status`. Draft is warning (overrides default secondary). */
export const SERVICE_STATUS_BADGE: Record<string, BadgeColor> = {
  active: 'success',
  draft: 'warning',
  archived: 'secondary',
}

export const SUBSCRIPTION_STATUS_BADGE: Record<string, BadgeColor> = {
  active: 'success',
  trialing: 'info',
  cancelled: 'danger',
  expired: 'secondary',
}

export const ERROR_LOG_STATUS_BADGE: Record<string, BadgeColor> = {
  resolved: 'success',
  ignored: 'secondary',
  open: 'warning',
}

export const ERROR_LOG_LEVEL_BADGE: Record<string, BadgeColor> = {
  error: 'danger',
  critical: 'dark',
}

/** Product activation `state`. `expired` is danger here, not default dark. */
export const PRODUCT_ACTIVATION_STATE_BADGE: Record<string, BadgeColor> = {
  active: 'success',
  pending: 'warning',
  suspended: 'secondary',
  expired: 'danger',
}

/**
 * AI connection lifecycle. `disabled` is secondary (an operator switched it
 * off on purpose), not the default danger — only `pending` is a warning.
 */
export const AI_CONNECTION_STATUS_BADGE: Record<string, BadgeColor> = {
  active: 'success',
  pending: 'warning',
  disabled: 'secondary',
}

/**
 * Resolve a status string to a badge color: the caller's mapping first, then
 * the shared default table, then `fallback`.
 */
export function resolveBadgeColor(
  status: string | null | undefined,
  mapping: Record<string, BadgeColor> = {},
  fallback: BadgeColor = 'secondary',
): BadgeColor {
  const key = (status ?? '').trim().toLowerCase()
  if (!key) return fallback
  return mapping[key] ?? STATUS_BADGE_DEFAULT[key] ?? fallback
}
