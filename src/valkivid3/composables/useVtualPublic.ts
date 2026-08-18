import { get } from '@/api/client'
import type {
  ApiResponse,
  VtualPublicContentFeed,
  VtualPublicDirectory,
  VtualPublicItems,
  VtualPublicLanding,
  VtualPublicProfile,
  VtualPublicStats,
} from '@/api/types'

export function useVtualPublic() {
  async function fetchDirectory(
    page: number = 1,
    search: string = '',
    perPage: number = 12,
  ): Promise<VtualPublicDirectory> {
    const res = await get<ApiResponse<VtualPublicDirectory>>('vtual/public/vtubers', {
      page,
      per_page: perPage,
      ...(search.trim() !== '' ? { search: search.trim() } : {}),
    })
    return res.data as VtualPublicDirectory
  }

  async function fetchContents(
    page: number = 1,
    perPage: number = 12,
  ): Promise<VtualPublicContentFeed> {
    const res = await get<ApiResponse<VtualPublicContentFeed>>('vtual/public/contents', {
      page,
      per_page: perPage,
    })
    return res.data as VtualPublicContentFeed
  }

  async function fetchProfile(
    slug: string,
    page: number = 1,
    perPage: number = 12,
  ): Promise<VtualPublicProfile> {
    const res = await get<ApiResponse<VtualPublicProfile>>(
      `vtual/public/vtubers/${encodeURIComponent(slug)}`,
      { page, per_page: perPage },
    )
    return res.data as VtualPublicProfile
  }

  async function fetchLanding(): Promise<VtualPublicLanding> {
    const res = await get<ApiResponse<VtualPublicLanding>>('vtual/public/landing')
    return res.data as VtualPublicLanding
  }

  async function fetchStats(): Promise<VtualPublicStats> {
    const res = await get<ApiResponse<VtualPublicStats>>('vtual/public/stats')
    return res.data as VtualPublicStats
  }

  async function fetchLive(): Promise<VtualPublicItems> {
    const res = await get<ApiResponse<VtualPublicItems>>('vtual/public/live')
    return res.data as VtualPublicItems
  }

  async function fetchSchedule(): Promise<VtualPublicItems> {
    const res = await get<ApiResponse<VtualPublicItems>>('vtual/public/schedule')
    return res.data as VtualPublicItems
  }

  return {
    fetchDirectory,
    fetchContents,
    fetchProfile,
    fetchLanding,
    fetchStats,
    fetchLive,
    fetchSchedule,
  }
}
