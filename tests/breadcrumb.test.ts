import { describe, expect, it } from 'vitest'
import {
  appendEntityCrumb,
  breadcrumbLabelKey,
  buildBreadcrumbChain,
  normalizeEntityLabel,
  paramKeysOf,
  pickParams,
  readBreadcrumbMeta,
  BREADCRUMB_MAX_DEPTH,
  type BreadcrumbLocation,
  type BreadcrumbMetaSource,
} from '../src/utils/breadcrumb'

/**
 * Breadcrumb resolution contract.
 *
 * The route tree is the single source of truth (there is no central label map
 * any more), so these tests lock the two things that used to drift: label
 * fallback to `meta.titleKey`, and the parent chain order. They also lock the
 * entity-title rules — a published record title is normalized before it can
 * become a crumb, and a raw/empty label is never rendered.
 */

function location(
  name: string,
  meta: BreadcrumbMetaSource,
  params: Record<string, string | string[]> = {},
): BreadcrumbLocation {
  return { name, meta, params }
}

/** Build a resolver out of a name -> location table. */
function resolverFrom(table: Record<string, BreadcrumbLocation>) {
  return (name: string, params: Record<string, string | string[]>): BreadcrumbLocation | null => {
    const found = table[name]
    if (!found) return null
    return { ...found, params: { ...found.params, ...params } }
  }
}

describe('readBreadcrumbMeta', () => {
  it('reads titleKey and breadcrumb keys, ignoring junk', () => {
    expect(
      readBreadcrumbMeta({
        titleKey: 'web.users.title',
        breadcrumb: { parent: 'users.index.view', labelKey: 'ui.breadcrumb.edit' },
      }),
    ).toEqual({ titleKey: 'web.users.title', parent: 'users.index.view', labelKey: 'ui.breadcrumb.edit' })

    expect(readBreadcrumbMeta({ titleKey: '', breadcrumb: { parent: 42 } })).toEqual({})
    expect(readBreadcrumbMeta(undefined)).toEqual({})
  })
})

describe('breadcrumbLabelKey', () => {
  it('prefers an explicit labelKey over titleKey', () => {
    expect(breadcrumbLabelKey({ titleKey: 'web.users.edit_title', breadcrumb: { labelKey: 'ui.breadcrumb.edit' } })).toBe(
      'ui.breadcrumb.edit',
    )
  })

  it('falls back to titleKey so routes need no duplicate label entry', () => {
    expect(breadcrumbLabelKey({ titleKey: 'web.services.show_title' })).toBe('web.services.show_title')
    expect(breadcrumbLabelKey({ breadcrumb: { parent: 'services.index.view' } })).toBeNull()
  })
})

describe('buildBreadcrumbChain', () => {
  it('orders the chain root first', () => {
    const resolve = resolverFrom({
      'users.index.view': location('users.index.view', {
        titleKey: 'web.users.title',
        breadcrumb: { labelKey: 'web.users.breadcrumb' },
      }),
    })

    const chain = buildBreadcrumbChain({
      start: location('users.edit.view', {
        titleKey: 'web.users.edit_title',
        breadcrumb: { parent: 'users.index.view', labelKey: 'ui.breadcrumb.edit' },
      }),
      resolve,
    })

    expect(chain.map((c) => c.labelKey)).toEqual(['web.users.breadcrumb', 'ui.breadcrumb.edit'])
    expect(chain.map((c) => c.routeName)).toEqual(['users.index.view', 'users.edit.view'])
  })

  it('emits a single crumb for a route without breadcrumb meta (self-healing)', () => {
    const chain = buildBreadcrumbChain({
      start: location('currencies.index.view', { titleKey: 'web.currencies.title' }),
      resolve: () => null,
    })

    expect(chain).toEqual([{ routeName: 'currencies.index.view', labelKey: 'web.currencies.title', params: {} }])
  })

  it('skips unlabeled links but keeps walking up', () => {
    const resolve = resolverFrom({
      'services.index.view': location('services.index.view', { titleKey: 'web.services.title' }),
    })

    const chain = buildBreadcrumbChain({
      start: location('services.edit.view', {
        breadcrumb: { parent: 'services.index.view' },
      }),
      resolve,
    })

    expect(chain.map((c) => c.routeName)).toEqual(['services.index.view'])
  })

  it('carries the child params into a param-bound parent link', () => {
    const resolve = resolverFrom({
      'vtual.vtuber.show.view': location('vtual.vtuber.show.view', {
        titleKey: 'web.vtual-vtuber.title',
        breadcrumb: { parent: 'vtual.vtuber.index.view' },
      }),
    })

    const chain = buildBreadcrumbChain({
      start: location(
        'vtual.vtuber.claim.view',
        { titleKey: 'web.vtual-vtuber.claim_page_title', breadcrumb: { parent: 'vtual.vtuber.show.view' } },
        { slug: 'kirin' },
      ),
      resolve,
    })

    expect(chain[0]?.params).toEqual({ slug: 'kirin' })
    expect(chain.map((c) => c.routeName)).toEqual(['vtual.vtuber.show.view', 'vtual.vtuber.claim.view'])
  })

  it('stops when a parent cannot be resolved', () => {
    const chain = buildBreadcrumbChain({
      start: location('users.edit.view', {
        titleKey: 'web.users.edit_title',
        breadcrumb: { parent: 'users.index.view' },
      }),
      resolve: () => null,
    })

    expect(chain.map((c) => c.routeName)).toEqual(['users.edit.view'])
  })

  it('breaks parent cycles', () => {
    const resolve = resolverFrom({
      a: location('a', { titleKey: 'a', breadcrumb: { parent: 'b' } }),
      b: location('b', { titleKey: 'b', breadcrumb: { parent: 'a' } }),
    })

    const chain = buildBreadcrumbChain({ start: location('a', { titleKey: 'a', breadcrumb: { parent: 'b' } }), resolve })

    expect(chain.length).toBeLessThanOrEqual(BREADCRUMB_MAX_DEPTH)
    expect(new Set(chain.map((c) => c.routeName)).size).toBe(chain.length)
  })
})

describe('paramKeysOf / pickParams', () => {
  it('reads param names out of a route path, in order and without duplicates', () => {
    expect(paramKeysOf('/apps/users/:id/edit')).toEqual(['id'])
    expect(paramKeysOf('/apps/vtual/platform-credentials/:platformId/create')).toEqual(['platformId'])
    expect(paramKeysOf('/apps/users')).toEqual([])
    expect(paramKeysOf('/apps/vtual/vtubers/:slug/claim')).toEqual(['slug'])
  })

  it('keeps only the params the target route declares', () => {
    const childParams = { id: '01a0a300', slug: 'kirin' }

    expect(pickParams(['slug'], childParams)).toEqual({ slug: 'kirin' })
    expect(pickParams([], childParams)).toEqual({})
    expect(pickParams(['missing'], childParams)).toEqual({})
  })
})

describe('normalizeEntityLabel', () => {
  it('trims a published title', () => {
    expect(normalizeEntityLabel('  Andi Wijaya  ')).toBe('Andi Wijaya')
    expect(normalizeEntityLabel('Kirin')).toBe('Kirin')
  })

  it('treats a blank or missing title as nothing to render', () => {
    expect(normalizeEntityLabel('')).toBeNull()
    expect(normalizeEntityLabel('   ')).toBeNull()
    expect(normalizeEntityLabel('\n\t')).toBeNull()
  })

  it('rejects non-string sources (record still loading, wrong field)', () => {
    expect(normalizeEntityLabel(null)).toBeNull()
    expect(normalizeEntityLabel(undefined)).toBeNull()
    expect(normalizeEntityLabel(42)).toBeNull()
    expect(normalizeEntityLabel({ name: 'Andi' })).toBeNull()
  })
})

describe('appendEntityCrumb', () => {
  const base = [{ routeName: 'users.edit.view', labelKey: 'ui.breadcrumb.edit' }]

  it('appends the loaded record title as a non-link crumb', () => {
    const out = appendEntityCrumb(base, 'users.edit.view', {
      routeName: 'users.edit.view',
      label: 'Andi Wijaya',
    })

    expect(out.at(-1)).toEqual({ routeName: '', labelText: 'Andi Wijaya' })
  })

  it('ignores a title published for another route', () => {
    expect(appendEntityCrumb(base, 'users.create.view', { routeName: 'users.edit.view', label: 'Andi' })).toEqual(base)
  })

  it('never renders an empty or whitespace-only title', () => {
    expect(appendEntityCrumb(base, 'users.edit.view', { routeName: 'users.edit.view', label: '   ' })).toEqual(base)
    expect(appendEntityCrumb(base, 'users.edit.view', null)).toEqual(base)
  })

  it('does not create a lone entity crumb when the chain is empty', () => {
    expect(appendEntityCrumb([], 'users.edit.view', { routeName: 'users.edit.view', label: 'Andi' })).toEqual([])
  })
})
