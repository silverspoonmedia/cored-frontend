import { describe, expect, it } from 'vitest'
import { providerByKey } from '../src/composables/identity/useConnections'
import type { ProfileConnections } from '../src/api/types'

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
