import { batch } from '@/api/client'
import { bodyOf } from '@/api/batch'
import type {
  ApiResponse,
  PagedList,
  VtualCreator,
  VtualPlatform,
  VtualPlatformCredential,
  VtualChannel,
  VtualChannelClaim,
  VtualCreatorClaim,
  VtualExternalLink,
  VtualVtuberProfile,
  ProfileConnections,
} from '@/api/types'

/**
 * Batch-hydrate composable for VTUAL domain views. Replaces the per-view
 * multi-fetch pattern (Promise.all with 2-7 independent GETs) with a single
 * /api/v1/batch call, returning null entries on per-path failure so callers
 * can fall back to individual loaders.
 */

interface VtualProfileShowResult {
  creator: VtualCreator | null
  channels: VtualChannel[] | null
  archivedChannels: VtualChannel[] | null
  channelClaims: VtualChannelClaim[] | null
  links: VtualExternalLink[] | null
  platforms: VtualPlatform[] | null
  connections: ProfileConnections | null
}

interface VtualCredentialsResult {
  platforms: VtualPlatform[] | null
  credentials: Record<string, VtualPlatformCredential[] | null>
}

interface VtualOrphanEditResult {
  orphan: VtualCreator | null
  channels: VtualChannel[] | null
  platforms: VtualPlatform[] | null
}

interface VtualVtuberClaimResult {
  profile: VtualVtuberProfile | null
  myClaims: VtualCreatorClaim[] | null
}

function listData<T>(body: ApiResponse<T[] | PagedList<T>> | null): T[] | null {
  if (!body) return null
  if (Array.isArray(body.data)) return body.data
  if (body.data && typeof body.data === 'object' && 'items' in body.data && Array.isArray((body.data as PagedList<T>).items)) {
    return (body.data as PagedList<T>).items
  }
  return null
}

async function hydrateProfileShow(creatorId: string): Promise<VtualProfileShowResult> {
  const [creatorRes, channelsRes, archivedRes, claimsRes, linksRes, platformsRes, connectionsRes] = await batch<unknown>([
    { path: `vtual/creators/${creatorId}` },
    { path: `vtual/creators/${creatorId}/channels` },
    { path: `vtual/creators/${creatorId}/channels/archived` },
    { path: `vtual/creators/${creatorId}/channel-claims` },
    { path: `vtual/creators/${creatorId}/links` },
    { path: 'vtual/platforms' },
    { path: 'profile/connections' },
  ])

  return {
    creator: bodyOf<VtualCreator>(creatorRes)?.data ?? null,
    channels: listData(bodyOf<VtualChannel[]>(channelsRes)),
    archivedChannels: listData(bodyOf<VtualChannel[]>(archivedRes)),
    channelClaims: listData(bodyOf<VtualChannelClaim[]>(claimsRes)),
    links: listData(bodyOf<VtualExternalLink[]>(linksRes)),
    platforms: listData(bodyOf<VtualPlatform[]>(platformsRes)),
    connections: bodyOf<ProfileConnections>(connectionsRes)?.data ?? null,
  }
}

async function hydrateCredentials(platformIds: string[]): Promise<VtualCredentialsResult> {
  const requests = [
    { path: 'vtual/platforms' },
    ...platformIds.map((id) => ({ path: `vtual/admin/platforms/${id}/credentials` })),
  ]
  const responses = await batch<unknown>(requests)
  const [platformsRes, ...credentialRes] = responses

  const credentials: Record<string, VtualPlatformCredential[] | null> = {}
  platformIds.forEach((id, i) => {
    credentials[id] = listData(bodyOf<VtualPlatformCredential[]>(credentialRes[i]))
  })

  return {
    platforms: listData(bodyOf<VtualPlatform[]>(platformsRes)),
    credentials,
  }
}

async function hydrateOrphanEdit(orphanId: string): Promise<VtualOrphanEditResult> {
  const [orphanRes, channelsRes, platformsRes] = await batch<unknown>([
    { path: `vtual/creators/orphans/${orphanId}` },
    { path: `vtual/creators/${orphanId}/channels` },
    { path: 'vtual/platforms' },
  ])

  return {
    orphan: bodyOf<VtualCreator>(orphanRes)?.data ?? null,
    channels: listData(bodyOf<VtualChannel[]>(channelsRes)),
    platforms: listData(bodyOf<VtualPlatform[]>(platformsRes)),
  }
}

async function hydrateVtuberClaim(slug: string): Promise<VtualVtuberClaimResult> {
  const [profileRes, myClaimsRes] = await batch<unknown>([
    { path: `vtual/vtubers/${slug}` },
    { path: 'vtual/claims/mine' },
  ])

  return {
    profile: bodyOf<VtualVtuberProfile>(profileRes)?.data ?? null,
    myClaims: listData(bodyOf<VtualCreatorClaim[]>(myClaimsRes)),
  }
}

export function useVtualHydrate() {
  return {
    hydrateProfileShow,
    hydrateCredentials,
    hydrateOrphanEdit,
    hydrateVtuberClaim,
  }
}
