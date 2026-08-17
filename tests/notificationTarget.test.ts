import { describe, expect, it } from 'vitest'
import type { Router } from 'vue-router'
import { resolveNotificationLocation } from '../src/utils/notificationTarget'

function fakeRouter(names: string[]): Router {
  return {
    hasRoute: (name: string) => names.includes(name),
  } as unknown as Router
}

describe('resolveNotificationLocation', () => {
  it('maps Blade users.edit + user param onto SPA :id', () => {
    const loc = resolveNotificationLocation(
      fakeRouter(['users.edit.view']),
      'users.edit',
      { user: '01900000-0000-7000-8000-000000000001' },
    )
    expect(loc).toEqual({
      name: 'users.edit.view',
      params: { id: '01900000-0000-7000-8000-000000000001' },
    })
  })

  it('maps modelCard onto id for inference show', () => {
    const loc = resolveNotificationLocation(
      fakeRouter(['inference.model-cards.show.view']),
      'inference.model-cards.show',
      { modelCard: 'card-1' },
    )
    expect(loc).toEqual({
      name: 'inference.model-cards.show.view',
      params: { id: 'card-1' },
    })
  })

  it('returns null when the SPA has no matching route', () => {
    expect(resolveNotificationLocation(fakeRouter([]), 'missing.index', {})).toBeNull()
    expect(resolveNotificationLocation(fakeRouter(['dashboard.view']), null, {})).toBeNull()
  })
})
