import { describe, expect, it, vi } from 'vitest'
import { providerByKey } from '../src/composables/identity/useConnections'
import type { ProfileConnections } from '../src/api/types'

// `useConnections` pulls `@/api/client`, which pulls the CSRF layer and, in
// turn, the realtime registry. Seed the client's handler slots so the store
// registering them on import cannot re-enter a partially evaluated module.
vi.mock('@/api/client', () => ({
  get: vi.fn(),
  post: vi.fn(),
  del: vi.fn(),
  setRefreshHandler: vi.fn(),
  setUnauthorizedHandler: vi.fn(),
}))

const snapshot: ProfileConnections = {
  providers: [
    {
      key: 'discord',
      connected: true,
      oauth_configured: true,
      supports_sync: true,
      synced_at: null,
      synced_at_formatted: null,
      synced_at_human: null,
      connections: [],
    },
  ],
}

describe('providerByKey', () => {
  it('returns the matching provider row', () => {
    expect(providerByKey(snapshot, 'discord')?.connected).toBe(true)
  })

  it('returns undefined for a missing key or empty snapshot', () => {
    expect(providerByKey(snapshot, 'google')).toBeUndefined()
    expect(providerByKey(null, 'discord')).toBeUndefined()
    expect(providerByKey(undefined, 'discord')).toBeUndefined()
  })
})
