import { describe, expect, it } from 'vitest'
import type { VtualPublicManagementProfile, VtualPublicProfile } from '../src/api/types'
import { buildManagementJsonLd, buildVtuberJsonLd } from '../src/utils/vtualJsonLd'

/**
 * Structured data is read by machines, so the failure mode is silent: a
 * `VideoObject` missing a required property invalidates its node, and a
 * `sameAs`/`member` pointing at a relative path tells the crawler nothing.
 * These cases lock the two rules that make the blocks usable — required fields
 * or the node is dropped, and every URL is absolute.
 */

const ORIGIN = 'https://example.test'

function profile(overrides: Partial<VtualPublicProfile> = {}): VtualPublicProfile {
  return {
    slug: 'aoi',
    display_name: 'Aoi',
    bio: 'A vTuber.',
    avatar_url: '/storage/aoi.png',
    is_claimable: false,
    is_live: false,
    total_subscribers: 100,
    total_subscribers_formatted: '100',
    channels: [
      { platform_key: 'youtube', handle: 'aoi', url: 'https://youtube.com/@aoi', subscriber_count: 100, subscriber_count_formatted: '100', last_synced_at_human: '2 hours ago' },
      { platform_key: 'twitch', handle: 'aoi', url: 'https://youtube.com/@aoi', subscriber_count: 0, subscriber_count_formatted: '0' },
    ],
    links: [{ kind: 'social', label: 'X', url: 'https://x.com/aoi' }],
    contents: {
      items: [
        {
          type: 'archive',
          status: 'ended',
          title: 'First stream',
          thumbnail_url: 'https://img.test/1.jpg',
          url: 'https://youtube.com/watch?v=1',
          published_at: '2026-09-01T10:00:00+07:00',
          platform_key: 'youtube',
        },
      ],
      pagination: { current_page: 1, last_page: 1, per_page: 12, total: 1, has_more: false },
    },
    ...overrides,
  }
}

function graphOf(jsonLd: Record<string, unknown>): Array<Record<string, unknown>> {
  return jsonLd['@graph'] as Array<Record<string, unknown>>
}

describe('buildVtuberJsonLd', () => {
  it('describes the person with absolute URLs and a de-duplicated sameAs', () => {
    const jsonLd = buildVtuberJsonLd(profile(), ORIGIN)
    const [person] = graphOf(jsonLd)

    expect(jsonLd['@context']).toBe('https://schema.org')
    expect(person).toMatchObject({
      '@type': 'Person',
      name: 'Aoi',
      description: 'A vTuber.',
      url: 'https://example.test/vtual/vtubers/aoi',
      '@id': 'https://example.test/vtual/vtubers/aoi#person',
      image: 'https://example.test/storage/aoi.png',
    })
    // The duplicate channel URL appears once; the link block adds its own.
    expect(person?.sameAs).toEqual(['https://youtube.com/@aoi', 'https://x.com/aoi'])
  })

  it('lists the loaded videos as VideoObject items', () => {
    const jsonLd = buildVtuberJsonLd(profile(), ORIGIN)
    const [, list] = graphOf(jsonLd)

    expect(list).toMatchObject({ '@type': 'ItemList' })
    expect(list?.itemListElement).toEqual([
      {
        '@type': 'ListItem',
        position: 1,
        item: {
          '@type': 'VideoObject',
          name: 'First stream',
          thumbnailUrl: 'https://img.test/1.jpg',
          uploadDate: '2026-09-01T10:00:00+07:00',
          url: 'https://youtube.com/watch?v=1',
          provider: { '@type': 'Organization', name: 'youtube' },
        },
      },
    ])
  })

  it('drops a video that cannot satisfy the required properties', () => {
    const jsonLd = buildVtuberJsonLd(
      profile({
        contents: {
          items: [
            { type: 'archive', status: 'ended', title: 'No thumbnail', thumbnail_url: null, url: 'https://youtu.be/2', published_at: '2026-09-02T10:00:00+07:00', platform_key: 'youtube' },
            { type: 'archive', status: 'ended', title: 'No date', thumbnail_url: 'https://img.test/3.jpg', url: 'https://youtu.be/3', published_at: null, platform_key: 'youtube' },
            { type: 'archive', status: 'ended', title: 'Scheduled', thumbnail_url: 'https://img.test/4.jpg', url: 'https://youtu.be/4', published_at: null, scheduled_at: '2026-10-01T10:00:00+07:00', platform_key: 'youtube' },
          ],
          pagination: { current_page: 1, last_page: 1, per_page: 12, total: 3, has_more: false },
        },
      }),
      ORIGIN,
    )

    const items = (graphOf(jsonLd)[1]?.itemListElement as Array<Record<string, unknown>>) ?? []
    expect(items).toHaveLength(1)
    expect((items[0]?.item as Record<string, unknown>).name).toBe('Scheduled')
  })

  it('omits the ItemList entirely when nothing on the page qualifies', () => {
    const jsonLd = buildVtuberJsonLd(
      profile({
        contents: {
          items: [],
          pagination: { current_page: 1, last_page: 1, per_page: 12, total: 0, has_more: false },
        },
      }),
      ORIGIN,
    )

    expect(graphOf(jsonLd)).toHaveLength(1)
  })

  it('never emits a non-http(s) URL, which would be a broken asset or a script target', () => {
    const jsonLd = buildVtuberJsonLd(
      profile({
        avatar_url: 'javascript:alert(1)',
        channels: [],
        links: [{ kind: 'social', label: 'bad', url: 'javascript:alert(1)' }],
      }),
      ORIGIN,
    )
    const [person] = graphOf(jsonLd)

    expect(person?.image).toBeUndefined()
    expect(person?.sameAs).toBeUndefined()
  })
})

describe('buildManagementJsonLd', () => {
  const management: VtualPublicManagementProfile = {
    slug: 'studio',
    name: 'Studio',
    description: 'A management.',
    logo_url: '/storage/logo.png',
    links: [{ kind: 'site', label: 'Site', url: 'https://studio.test' }],
    creators: [
      { slug: 'aoi', display_name: 'Aoi', avatar_url: '/storage/aoi.png', bio_snippet: null, is_live: false, channels: [], total_subscribers: null, total_subscribers_formatted: null },
    ],
    stats: { creators: 1, live: 0, channels: 1, subscribers_total: 0, subscribers_total_formatted: '0' },
  }

  it('describes the brand and its roster with absolute URLs', () => {
    const jsonLd = buildManagementJsonLd(management, ORIGIN)

    expect(jsonLd).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Studio',
      description: 'A management.',
      url: 'https://example.test/vtual/managements/studio',
      logo: 'https://example.test/storage/logo.png',
      sameAs: ['https://studio.test/'],
      member: [
        {
          '@type': 'Person',
          name: 'Aoi',
          url: 'https://example.test/vtual/vtubers/aoi',
          image: 'https://example.test/storage/aoi.png',
        },
      ],
    })
  })

  it('omits member when the roster is empty', () => {
    const jsonLd = buildManagementJsonLd({ ...management, creators: [] }, ORIGIN)

    expect(jsonLd.member).toBeUndefined()
  })
})
