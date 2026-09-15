import type { MenuLookupKey } from '@/composables/navigation/useNavigationHydrate'

/**
 * The four id fields on the menu form that point at other records.
 */
export interface MenuReferenceIds {
  /** Single parent menu id (`''` or `null` when unset). */
  parent: string | null
  /** Role ids (only meaningful for the `role` audience). */
  roles: string[]
  /** Included user ids. */
  userIncludes: string[]
  /** Excluded user ids. */
  userExcludes: string[]
}

/** Resolved option ids per lookup, i.e. what the pre-hydration lookup returned. */
export type ResolvedLookupIds = Record<MenuLookupKey, string[]>

/**
 * Drop reference ids that a *successful* lookup did not resolve back to an
 * option.
 *
 * `FormSelect2.applyValue()` no longer echoes a degraded DOM value back through
 * `update:modelValue`, so a reference the backend can no longer resolve would
 * otherwise stay on the form and be submitted again. Pruning is deliberately
 * skipped for lookups listed in `failed`: an empty result from a request that
 * never succeeded is not evidence that the reference is gone, and deleting it
 * would wipe stored pivots on the strength of a failed request.
 *
 * Pure: returns the pruned fields instead of mutating the caller's form.
 */
export function pruneUnresolvedReferences(
  ids: MenuReferenceIds,
  resolved: ResolvedLookupIds,
  failed: readonly MenuLookupKey[],
): MenuReferenceIds {
  const failedSet = new Set(failed)
  const known = (key: MenuLookupKey) => new Set(resolved[key].map(String))

  const keep = (key: MenuLookupKey, values: string[]): string[] => {
    if (failedSet.has(key)) return values
    const allowed = known(key)
    return values.filter((id) => allowed.has(String(id)))
  }

  // The parent is a single select: it clears only when its lookup succeeded and
  // resolved nothing at all (the stored parent is genuinely gone).
  const parent =
    !failedSet.has('parent') && ids.parent && resolved.parent.length === 0
      ? ''
      : ids.parent

  return {
    parent,
    roles: keep('roles', ids.roles),
    userIncludes: keep('includes', ids.userIncludes),
    userExcludes: keep('excludes', ids.userExcludes),
  }
}
