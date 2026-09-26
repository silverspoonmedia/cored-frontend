/**
 * Presentation decisions for the public vTual surfaces, kept out of the
 * components so they are testable without a DOM (see docs/testing.md —
 * component rendering is not the repo's test seam; the decision is).
 */
import type { VtualPublicChannel, VtualPublicContent } from '@/api/types'

/**
 * Region hint for a content card.
 *
 * The platform either withholds a video in `region_blocked` or plays it only in
 * `region_allowed`; both null means unrestricted. Blocked wins when a payload
 * somehow carries both, because it is the narrower statement.
 *
 * Returns the i18n key plus the region list to interpolate, or `null` when the
 * card needs no notice. The card is never hidden — content that silently
 * disappears reads as a bug to the visitor, and the cause would be invisible.
 */
export function regionNotice(
  item: Pick<VtualPublicContent, 'region_allowed' | 'region_blocked'>,
): { key: string; regions: string } | null {
  const blocked = cleanRegions(item.region_blocked)
  if (blocked.length > 0) {
    return { key: 'web.vtual.public.video.region_blocked', regions: blocked.join(', ') }
  }

  const allowed = cleanRegions(item.region_allowed)
  if (allowed.length > 0) {
    return { key: 'web.vtual.public.video.region_allowed', regions: allowed.join(', ') }
  }

  return null
}

function cleanRegions(regions: string[] | null | undefined): string[] {
  return (regions ?? []).map((code) => code.trim()).filter((code) => code !== '')
}

/**
 * Metrics freshness for a public channel card: the API's relative label
 * ("2 hours ago"), or `null` when the channel has never synced — never a
 * placeholder date, which would claim a freshness that does not exist.
 */
export function channelSyncedTime(
  channel: Pick<VtualPublicChannel, 'last_synced_at_human'>,
): string | null {
  const human = (channel.last_synced_at_human ?? '').trim()
  return human === '' ? null : human
}
