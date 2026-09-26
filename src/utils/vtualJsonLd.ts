/**
 * schema.org JSON-LD builders for the public vTual surfaces.
 *
 * Pure functions — no DOM, no reactivity — so the views stay thin and the
 * payloads are unit-testable in the node test environment. Emission goes
 * through `setHeadMeta({ jsonLd })`; see docs/head-meta.md.
 *
 * Only fields that actually exist are emitted. An empty string or a `null` URL
 * is dropped instead of serialized as `""`, because a required property with an
 * empty value invalidates the whole node — and an invalid node can cost the
 * whole graph, not just the field.
 */
import type { VtualPublicManagementProfile, VtualPublicProfile } from '@/api/types'

const SCHEMA_CONTEXT = 'https://schema.org'

export type JsonLd = Record<string, unknown>

/** Resolve to an absolute http(s) URL, or `null` when the value is unusable. */
function absoluteUrl(value: string | null | undefined, origin: string): string | null {
  const trimmed = (value ?? '').trim()
  if (trimmed === '') {
    return null
  }
  try {
    const parsed = new URL(trimmed, origin)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null
    }
    return parsed.toString()
  } catch {
    return null
  }
}

function nonEmpty(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim()
  return trimmed === '' ? null : trimmed
}

/** Collapse blanks, duplicates and unusable values in one pass. */
function uniqueUrls(values: Array<string | null | undefined>, origin: string): string[] {
  const seen = new Set<string>()
  for (const value of values) {
    const url = absoluteUrl(value, origin)
    if (url !== null) {
      seen.add(url)
    }
  }
  return Array.from(seen)
}

/**
 * `VideoObject` requires name, thumbnailUrl and uploadDate to be eligible for a
 * video rich result, so an item missing any of the three is left out rather
 * than published half-formed.
 */
function buildVideoObject(
  item: VtualPublicProfile['contents']['items'][number],
  origin: string,
): JsonLd | null {
  const name = nonEmpty(item.title)
  const thumbnailUrl = absoluteUrl(item.thumbnail_url, origin)
  const url = absoluteUrl(item.url, origin)
  const uploadDate = nonEmpty(item.published_at) ?? nonEmpty(item.scheduled_at)

  if (name === null || thumbnailUrl === null || url === null || uploadDate === null) {
    return null
  }

  const video: JsonLd = {
    '@type': 'VideoObject',
    name,
    thumbnailUrl,
    uploadDate,
    url,
  }

  const platform = nonEmpty(item.platform_key)
  if (platform !== null) {
    video.provider = { '@type': 'Organization', name: platform }
  }

  return video
}

/**
 * Creator profile: `Person` for the channel owner plus an `ItemList` of the
 * videos currently rendered on the page. Only the loaded page of contents is
 * described — the block must match what the visitor can see, and a partial list
 * is a valid list.
 */
export function buildVtuberJsonLd(profile: VtualPublicProfile, origin: string): JsonLd {
  const profileUrl = absoluteUrl(`/vtual/vtubers/${profile.slug}`, origin)
  const person: JsonLd = { '@type': 'Person', name: profile.display_name }

  if (profileUrl !== null) {
    person.url = profileUrl
    person['@id'] = `${profileUrl}#person`
  }

  const description = nonEmpty(profile.bio)
  if (description !== null) {
    person.description = description
  }

  const image = absoluteUrl(profile.avatar_url, origin)
  if (image !== null) {
    person.image = image
  }

  // Channels and link blocks both point at the same person elsewhere; one
  // de-duplicated `sameAs` list beats two overlapping ones.
  const sameAs = uniqueUrls(
    [
      ...profile.channels.map((channel) => channel.url),
      ...profile.links.map((link) => link.url),
    ],
    origin,
  )
  if (sameAs.length > 0) {
    person.sameAs = sameAs
  }

  const graph: JsonLd[] = [person]

  const videos = profile.contents.items
    .map((item) => buildVideoObject(item, origin))
    .filter((video): video is JsonLd => video !== null)

  if (videos.length > 0) {
    graph.push({
      '@type': 'ItemList',
      itemListElement: videos.map((video, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: video,
      })),
    })
  }

  return { '@context': SCHEMA_CONTEXT, '@graph': graph }
}

/**
 * Management profile: `Organization` with its roster as `member`. Management is
 * a brand, not a person, so the roster members are `Person` nodes pointing at
 * their public profile pages.
 */
export function buildManagementJsonLd(
  profile: VtualPublicManagementProfile,
  origin: string,
): JsonLd {
  const profileUrl = absoluteUrl(`/vtual/managements/${profile.slug}`, origin)
  const organization: JsonLd = { '@type': 'Organization', name: profile.name }

  if (profileUrl !== null) {
    organization.url = profileUrl
    organization['@id'] = `${profileUrl}#organization`
  }

  const description = nonEmpty(profile.description)
  if (description !== null) {
    organization.description = description
  }

  const logo = absoluteUrl(profile.logo_url, origin)
  if (logo !== null) {
    organization.logo = logo
  }

  const sameAs = uniqueUrls(
    profile.links.map((link) => link.url),
    origin,
  )
  if (sameAs.length > 0) {
    organization.sameAs = sameAs
  }

  const members = profile.creators
    .map((creator) => {
      const member: JsonLd = { '@type': 'Person', name: creator.display_name }
      const memberUrl = absoluteUrl(`/vtual/vtubers/${creator.slug}`, origin)
      if (memberUrl !== null) {
        member.url = memberUrl
      }
      const memberImage = absoluteUrl(creator.avatar_url, origin)
      if (memberImage !== null) {
        member.image = memberImage
      }
      return member
    })
    .filter((member) => nonEmpty(member.name as string | null) !== null)

  if (members.length > 0) {
    organization.member = members
  }

  return { '@context': SCHEMA_CONTEXT, ...organization }
}
