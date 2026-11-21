import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * `batch` is the only thing mocked: `@/api/batch` is kept real so the
 * terminal/non-terminal split is exercised against the actual `bodyOfOrThrow`
 * implementation rather than a stub of it.
 */
const batch = vi.fn()

vi.mock('@/api/client', () => ({
  batch: (...args: unknown[]) => batch(...args),
}))

type HydrateModule = typeof import('../src/composables/navigation/useNavigationHydrate')
type PruneModule = typeof import('../src/utils/navigation/pruneUnresolvedReferences')

/**
 * `hydrateMenuEdit` is not exported on its own — the module only exposes the
 * composable — so unwrap it the same way the view does.
 */
async function importHydrate(): Promise<HydrateModule['useNavigationHydrate'] extends () => infer R ? R : never> {
  const mod = await import('../src/composables/navigation/useNavigationHydrate')
  return mod.useNavigationHydrate()
}

function ok<T>(data: T) {
  return { status: 200, body: { status: 'success', message: 'ok', data } }
}

function err(status: number, message = 'nope') {
  return { status, body: { status: 'error', message, data: null } }
}

const MENU_ID = 'menu-1'

/** A menu with all four references set, so every lookup is requested. */
const MENU = {
  id: MENU_ID,
  parent_id: 'parent-1',
  layout: 'sidebar',
  name: 'Dashboard',
  description: null,
  name_translations: { en: 'Dashboard' },
  description_translations: {},
  icon: null,
  route: 'dashboard',
  hash: null,
  type: 'p',
  order: 1,
  audience: 'role',
  role_ids: ['role-1'],
  user_include_ids: ['user-1'],
  user_exclude_ids: ['user-2'],
} as const

const RESULTS = {
  parent: { results: [{ id: 'parent-1', text: 'Parent' }], pagination: { more: false } },
  roles: { results: [{ id: 'role-1', text: 'Admin' }], pagination: { more: false } },
  users: { results: [{ id: 'user-1', text: 'One' }, { id: 'user-2', text: 'Two' }], pagination: { more: false } },
}

type Entry = { status: number; body: unknown }

/** Lookup entries in request order: parent, roles, includes, excludes. */
function lookupBatch(overrides: Partial<Record<0 | 1 | 2 | 3, Entry>> = {}): Entry[] {
  return [
    overrides[0] ?? ok(RESULTS.parent),
    overrides[1] ?? ok(RESULTS.roles),
    overrides[2] ?? ok(RESULTS.users),
    overrides[3] ?? ok(RESULTS.users),
  ]
}

/**
 * Stage 1 fetches the menu, stage 2 fans out the lookups — two separate `batch`
 * calls, so each test queues both responses in order.
 */
function queueHydrate(menu: Entry, lookups: Entry[] = lookupBatch()): void {
  batch.mockResolvedValueOnce([menu])
  batch.mockResolvedValueOnce(lookups)
}

beforeEach(() => {
  batch.mockReset()
  vi.resetModules()
})

describe('hydrateMenuEdit', () => {
  it('returns every option set and no failed lookups when all entries succeed', async () => {
    queueHydrate(ok(MENU))

    const { hydrateMenuEdit } = await importHydrate()
    const result = await hydrateMenuEdit(MENU_ID)

    expect(result.menu?.id).toBe(MENU_ID)
    expect(result.parentOptions.map((o) => o.id)).toEqual(['parent-1'])
    expect(result.roleOptions.map((o) => o.id)).toEqual(['role-1'])
    expect(result.userIncludeOptions.map((o) => o.id)).toEqual(['user-1', 'user-2'])
    expect(result.userExcludeOptions.map((o) => o.id)).toEqual(['user-1', 'user-2'])
    expect(result.failedLookups).toEqual([])
  })

  it('requests multi-value ids[] as arrays, never a comma-joined string', async () => {
    queueHydrate(ok(MENU))

    const { hydrateMenuEdit } = await importHydrate()
    await hydrateMenuEdit(MENU_ID)

    const requests = batch.mock.calls[1][0] as Array<{ path: string; query?: Record<string, unknown> }>
    expect(requests.map((r) => r.path)).toEqual([
      'navigation/lookups/menus',
      'lookups/roles',
      'lookups/users',
      'lookups/users',
    ])
    // The multi-value ids must reach apiUrl as arrays; joining them into one
    // string would fail `ids.* => uuid` (422).
    expect(requests[1].query?.['ids[]']).toEqual(['role-1'])
    expect(requests[2].query?.['ids[]']).toEqual(['user-1'])
    expect(requests[3].query?.['ids[]']).toEqual(['user-2'])
    for (const request of requests.slice(1)) {
      expect(Array.isArray(request.query?.['ids[]'])).toBe(true)
    }
    // The parent lookup is scoped to the menu's layout and excludes itself.
    expect(requests[0].query).toMatchObject({ layout: 'sidebar', exclude: MENU_ID })
  })

  it.each([401, 403, 429])(
    'rejects with TerminalBatchError when a lookup answers %i',
    async (status) => {
      queueHydrate(ok(MENU), lookupBatch({ 2: err(status) }))

      const { hydrateMenuEdit } = await importHydrate()
      const { isTerminalBatchError } = await import('../src/api/batch')

      await expect(hydrateMenuEdit(MENU_ID)).rejects.toSatisfy(
        (e: unknown) => isTerminalBatchError(e) && e.status === status,
      )
    },
  )

  it('rejects with TerminalBatchError when the menu record is terminal', async () => {
    batch.mockResolvedValueOnce([err(403)])

    const { hydrateMenuEdit } = await importHydrate()
    const { isTerminalBatchError } = await import('../src/api/batch')

    await expect(hydrateMenuEdit(MENU_ID)).rejects.toSatisfy(isTerminalBatchError)
  })

  it.each([422, 500, 504])(
    'records a non-terminal %i as a failed lookup and keeps the siblings',
    async (status) => {
      queueHydrate(ok(MENU), lookupBatch({ 1: err(status) }))

      const { hydrateMenuEdit } = await importHydrate()
      const result = await hydrateMenuEdit(MENU_ID)

      expect(result.failedLookups).toEqual(['roles'])
      expect(result.roleOptions).toEqual([])
      // The other lookups must survive: one bad entry cannot blank the form.
      expect(result.parentOptions.map((o) => o.id)).toEqual(['parent-1'])
      expect(result.userIncludeOptions.map((o) => o.id)).toEqual(['user-1', 'user-2'])
      expect(result.userExcludeOptions.map((o) => o.id)).toEqual(['user-1', 'user-2'])
    },
  )

  it('records several failed lookups without losing the successful ones', async () => {
    queueHydrate(ok(MENU), lookupBatch({ 0: err(500), 2: err(504) }))

    const { hydrateMenuEdit } = await importHydrate()
    const result = await hydrateMenuEdit(MENU_ID)

    expect(result.failedLookups).toEqual(['parent', 'includes'])
    expect(result.parentOptions).toEqual([])
    expect(result.userIncludeOptions).toEqual([])
    expect(result.roleOptions.map((o) => o.id)).toEqual(['role-1'])
    expect(result.userExcludeOptions.map((o) => o.id)).toEqual(['user-1', 'user-2'])
  })

  it('returns a null menu with empty lookups when the menu entry is non-200', async () => {
    batch.mockResolvedValueOnce([err(404)])

    const { hydrateMenuEdit } = await importHydrate()
    const result = await hydrateMenuEdit(MENU_ID)

    expect(result.menu).toBeNull()
    expect(result.parentOptions).toEqual([])
    expect(result.roleOptions).toEqual([])
    expect(result.userIncludeOptions).toEqual([])
    expect(result.userExcludeOptions).toEqual([])
    expect(result.failedLookups).toEqual([])
    // No lookup fan-out when the record itself did not load.
    expect(batch).toHaveBeenCalledTimes(1)
  })

  it('skips lookups for references the menu does not have', async () => {
    batch.mockResolvedValueOnce([
      ok({ ...MENU, parent_id: null, role_ids: [], user_include_ids: [], user_exclude_ids: [] }),
    ])

    const { hydrateMenuEdit } = await importHydrate()
    const result = await hydrateMenuEdit(MENU_ID)

    expect(batch).toHaveBeenCalledTimes(1)
    expect(result.failedLookups).toEqual([])
  })
})

describe('pruneUnresolvedReferences', () => {
  let prune: PruneModule['pruneUnresolvedReferences']

  const ids = {
    parent: 'parent-1',
    roles: ['role-1', 'role-gone'],
    userIncludes: ['user-1', 'user-gone'],
    userExcludes: ['user-2'],
  }

  const resolved = {
    parent: ['parent-1'],
    roles: ['role-1'],
    includes: ['user-1'],
    excludes: ['user-2'],
  }

  beforeEach(async () => {
    vi.resetModules()
    prune = (await import('../src/utils/navigation/pruneUnresolvedReferences')).pruneUnresolvedReferences
  })

  it('drops ids a successful lookup did not resolve', () => {
    const pruned = prune(ids, resolved, [])

    expect(pruned.roles).toEqual(['role-1'])
    expect(pruned.userIncludes).toEqual(['user-1'])
    expect(pruned.userExcludes).toEqual(['user-2'])
    expect(pruned.parent).toBe('parent-1')
  })

  it('keeps every id when the lookup failed — emptiness is not evidence', () => {
    const pruned = prune(ids, { parent: [], roles: [], includes: [], excludes: [] }, [
      'parent',
      'roles',
      'includes',
      'excludes',
    ])

    expect(pruned).toEqual(ids)
  })

  it('clears the parent only when its lookup succeeded and resolved nothing', () => {
    expect(prune(ids, { ...resolved, parent: [] }, []).parent).toBe('')
    // Failed parent lookup: the stored parent must survive.
    expect(prune(ids, { ...resolved, parent: [] }, ['parent']).parent).toBe('parent-1')
    // Resolved parent stays.
    expect(prune(ids, resolved, []).parent).toBe('parent-1')
  })

  it('leaves an unset parent unset', () => {
    expect(prune({ ...ids, parent: '' }, { ...resolved, parent: [] }, []).parent).toBe('')
  })

  it('does not mutate the input', () => {
    const input = { ...ids, roles: [...ids.roles] }
    prune(input, resolved, [])

    expect(input.roles).toEqual(['role-1', 'role-gone'])
  })

  it('compares ids as strings so a numeric id still matches', () => {
    const pruned = prune(
      { parent: '', roles: [1, 2], userIncludes: [], userExcludes: [] },
      { parent: [], roles: ['1'], includes: [], excludes: [] },
      [],
    )

    expect(pruned.roles).toEqual([1])
  })
})
