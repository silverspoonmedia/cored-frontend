export type { Messages } from '@/features/types'

import type { Messages } from '@/features/types'

/**
 * Translation helpers for the core/features split.
 *
 * The core shell owns one pack per locale (`src/i18n/locales/{locale}.json`).
 * Each feature owns its own (`src/i18n/features/{name}/{locale}.json`) and
 * declares how to load it in its `FeatureModule.messages`, so this module names
 * no product: a fork deletes a feature's directory and its registry line and
 * nothing here moves.
 */

/** Deep merge, later values winning. */
export function mergeMessages(base: Messages, overlay: Messages): Messages {
  const out: Messages = { ...base }

  for (const [key, value] of Object.entries(overlay)) {
    const current = out[key]
    const mergeable = isContainer(current) && isContainer(value)
    out[key] = mergeable ? mergeMessages(current as Messages, value as Messages) : value
  }

  return out
}

export function isContainer(value: unknown): value is Messages {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
