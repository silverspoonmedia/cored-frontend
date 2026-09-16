import { ref } from 'vue'
import { post, del } from '@/api/client'
import type { ApiResponse, BlogMedia } from '@/api/types'

/**
 * Blog image upload — separate from the Archivd flow. Multipart POST to
 * `blog/media`, response is a `BlogMedia` with a ready-to-insert `url`.
 */
export function useBlogMedia() {
  const uploading = ref(false)
  const error = ref<string | null>(null)

  async function upload(file: File): Promise<BlogMedia> {
    uploading.value = true
    error.value = null

    const form = new FormData()
    form.append('file', file)

    try {
      const res = await post<ApiResponse<BlogMedia>>('blog/media', form)
      if (res.status === 'success' && res.data) {
        return res.data
      }
      throw new Error(res.message ?? 'upload_failed')
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'upload_failed'
      throw e
    } finally {
      uploading.value = false
    }
  }

  async function destroy(id: string): Promise<void> {
    await del<ApiResponse<null>>(`blog/media/${id}`)
  }

  return { uploading, error, upload, destroy }
}
