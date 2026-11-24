/**
 * Runtime head meta injection for public SPA surfaces (OG/SEO).
 *
 * Pure client-side DOM — never add a Worker/Pages Function for this
 * (every invocation bills a request; see docs/worker.md invariant 1).
 * Tags carry `data-cored-meta` so clearHeadMeta() only removes what
 * this module owns, leaving index.html's static meta untouched.
 */

export interface HeadMetaInput {
  title: string
  description?: string | null
  image?: string | null
  url?: string | null
  type?: 'website' | 'profile' | 'article'
  /**
   * Structured data for the current page, written as a
   * `<script type="application/ld+json">` tagged with the module marker so
   * `clearHeadMeta()` removes it with the rest. Omit or pass `null` for a
   * surface that has no schema (the previous page's block is then removed).
   */
  jsonLd?: Record<string, unknown> | null
}

const MARKER = 'data-cored-meta'
const SITE_NAME = 'Cored'

function upsertMeta(attr: 'name' | 'property', key: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"][${MARKER}]`)
  if (!(el instanceof HTMLMetaElement)) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    el.setAttribute(MARKER, '1')
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertCanonical(href: string): void {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="canonical"][${MARKER}]`)
  if (!(el instanceof HTMLLinkElement)) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    el.setAttribute(MARKER, '1')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

/**
 * One `application/ld+json` block per page. A `null` input removes the block
 * instead of leaving the previous page's schema attached to a page it does not
 * describe — a stale `Person` on an unrelated route is worse than no schema.
 */
function upsertJsonLd(jsonLd: Record<string, unknown> | null | undefined): void {
  const existing = document.head.querySelector<HTMLScriptElement>(`script[type="application/ld+json"][${MARKER}]`)

  if (jsonLd === null || jsonLd === undefined) {
    existing?.remove()
    return
  }

  const el = existing ?? document.createElement('script')
  if (existing === null) {
    el.setAttribute('type', 'application/ld+json')
    el.setAttribute(MARKER, '1')
    document.head.appendChild(el)
  }
  el.textContent = JSON.stringify(jsonLd)
}

export function setHeadMeta(input: HeadMetaInput): void {
  const title = input.title
  const description = (input.description ?? '').trim()
  const type = input.type ?? 'website'

  upsertMeta('name', 'description', description)
  upsertMeta('name', 'robots', 'index, follow')

  upsertMeta('property', 'og:title', title)
  upsertMeta('property', 'og:description', description)
  upsertMeta('property', 'og:type', type)
  upsertMeta('property', 'og:site_name', SITE_NAME)
  if (input.url) {
    upsertMeta('property', 'og:url', input.url)
    upsertCanonical(input.url)
  }
  if (input.image) {
    upsertMeta('property', 'og:image', input.image)
  }

  upsertMeta('name', 'twitter:card', input.image ? 'summary_large_image' : 'summary')
  upsertMeta('name', 'twitter:title', title)
  upsertMeta('name', 'twitter:description', description)
  if (input.image) {
    upsertMeta('name', 'twitter:image', input.image)
  }

  upsertJsonLd(input.jsonLd)
}

export function clearHeadMeta(): void {
  document.head.querySelectorAll(`[${MARKER}]`).forEach((el) => el.remove())
}
