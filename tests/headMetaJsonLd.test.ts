// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { clearHeadMeta, setHeadMeta } from '../src/composables/useHeadMeta'

/**
 * `useHeadMeta` writes OG/Twitter/canonical tags plus one
 * `application/ld+json` block, all marked `data-monolith-meta` so the sweep
 * only removes what this module owns.
 *
 * The structured-data lifecycle is the risky half: a `Person` block left
 * attached to an unrelated route describes the wrong page, and a stale
 * `VideoObject` list can point at content the visitor is no longer looking at.
 * A `null`/omitted `jsonLd` must therefore *remove* the previous block.
 */

const JSONLD = 'script[type="application/ld+json"][data-monolith-meta]'

function jsonLdBlocks(): HTMLScriptElement[] {
  return Array.from(document.head.querySelectorAll<HTMLScriptElement>(JSONLD))
}

beforeEach(() => {
  document.head.innerHTML = ''
  clearHeadMeta()
})

describe('setHeadMeta jsonLd', () => {
  it('writes one marked ld+json block and keeps the meta tags marked too', () => {
    setHeadMeta({
      title: 'Aoi',
      description: 'A shared file',
      url: 'https://example.test/s/f/01a0a300',
      jsonLd: { '@context': 'https://schema.org', '@type': 'Person', name: 'Aoi' },
    })

    const blocks = jsonLdBlocks()
    expect(blocks).toHaveLength(1)
    expect(JSON.parse(blocks[0]!.textContent ?? '')).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: 'Aoi',
    })
    expect(document.head.querySelector('meta[property="og:title"][data-monolith-meta]')?.getAttribute('content')).toBe('Aoi')
    expect(document.head.querySelector('link[rel="canonical"][data-monolith-meta]')?.getAttribute('href')).toBe('https://example.test/s/f/01a0a300')
  })

  it('replaces the block on navigation instead of stacking a second one', () => {
    setHeadMeta({ title: 'Aoi', jsonLd: { '@type': 'Person', name: 'Aoi' } })
    setHeadMeta({ title: 'Management', jsonLd: { '@type': 'Organization', name: 'Management' } })

    const blocks = jsonLdBlocks()
    expect(blocks).toHaveLength(1)
    expect(JSON.parse(blocks[0]!.textContent ?? '')).toEqual({ '@type': 'Organization', name: 'Management' })
  })

  it('removes the block when the next page has no schema', () => {
    setHeadMeta({ title: 'Aoi', jsonLd: { '@type': 'Person', name: 'Aoi' } })
    setHeadMeta({ title: 'Dashboard' })

    expect(jsonLdBlocks()).toHaveLength(0)
  })

  it('removes the block when jsonLd is explicitly null', () => {
    setHeadMeta({ title: 'Aoi', jsonLd: { '@type': 'Person', name: 'Aoi' } })
    setHeadMeta({ title: 'Dashboard', jsonLd: null })

    expect(jsonLdBlocks()).toHaveLength(0)
  })
})

describe('clearHeadMeta', () => {
  it('removes every tag it owns and leaves foreign head tags alone', () => {
    document.head.insertAdjacentHTML('afterbegin', '<meta name="description" content="static from index.html">')
    setHeadMeta({
      title: 'Aoi',
      description: 'A shared file',
      url: 'https://example.test/s/f/01a0a300',
      jsonLd: { '@type': 'Person', name: 'Aoi' },
    })

    clearHeadMeta()

    expect(document.head.querySelectorAll('[data-monolith-meta]')).toHaveLength(0)
    expect(document.head.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('static from index.html')
  })
})
