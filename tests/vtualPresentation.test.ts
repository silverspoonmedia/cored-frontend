import { describe, expect, it } from 'vitest'
import { channelSyncedTime, regionNotice } from '../src/utils/vtualPresentation'

/**
 * Region + freshness decisions for the public vTual surfaces. Both live outside
 * the components so the rule is testable without a DOM (docs/testing.md: the
 * decision is the seam, not the markup).
 */

describe('regionNotice', () => {
  it('prefers the blocked list, which is the narrower statement', () => {
    expect(regionNotice({ region_blocked: ['US', 'CA'], region_allowed: ['JP'] })).toEqual({
      key: 'web.vtual.public.video.region_blocked',
      regions: 'US, CA',
    })
  })

  it('reports an allow-list when only that is set', () => {
    expect(regionNotice({ region_blocked: null, region_allowed: ['JP', 'KR'] })).toEqual({
      key: 'web.vtual.public.video.region_allowed',
      regions: 'JP, KR',
    })
  })

  it('returns null when the content is unrestricted', () => {
    expect(regionNotice({ region_blocked: null, region_allowed: null })).toBeNull()
    expect(regionNotice({})).toBeNull()
  })

  it('treats empty and blank entries as no restriction, not as a notice with no regions', () => {
    expect(regionNotice({ region_blocked: [], region_allowed: [] })).toBeNull()
    expect(regionNotice({ region_blocked: ['  ', ''], region_allowed: null })).toBeNull()
  })

  it('trims region codes and drops the blanks around them', () => {
    expect(regionNotice({ region_blocked: [' US ', ''], region_allowed: null })).toEqual({
      key: 'web.vtual.public.video.region_blocked',
      regions: 'US',
    })
  })
})

describe('channelSyncedTime', () => {
  it('passes the API relative label through', () => {
    expect(channelSyncedTime({ last_synced_at_human: '2 hours ago' })).toBe('2 hours ago')
  })

  it('returns null when the channel has never synced', () => {
    expect(channelSyncedTime({ last_synced_at_human: null })).toBeNull()
    expect(channelSyncedTime({})).toBeNull()
    expect(channelSyncedTime({ last_synced_at_human: '   ' })).toBeNull()
  })

  it('trims the label', () => {
    expect(channelSyncedTime({ last_synced_at_human: ' 3 days ago ' })).toBe('3 days ago')
  })
})
