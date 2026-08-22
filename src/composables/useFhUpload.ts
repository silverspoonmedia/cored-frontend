import i18n from '@/i18n'
import { post, del } from '@/api/client'
import type {
  ApiResponse,
  FhUploadSession,
  FhUploadPart,
  FhUploadCompleteResult,
  HostedFile,
} from '@/api/types'

export interface UploadContext {
  folderId?: string | null
  userId?: string | null
  workspaceId?: string | null
  disk?: string | null
}

export interface UploadProgress {
  percent: number
  bytesPerSecond: number
}

export type UploadStatus = 'pending' | 'uploading' | 'completing' | 'done' | 'error'

const MAX_PART_CONCURRENCY = 3
const MAX_INIT_RETRIES = 3
const MAX_PART_RETRIES = 3

function localizedUploadMessage(key: 'init_failed' | 'sign_failed' | 'complete_failed'): string {
  return i18n.global.t(`web.file-hosting.upload.${key}`)
}

function resolveMimeType(file: File): string {
  if (file.type && file.type !== 'application/octet-stream') return file.type
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    pdf: 'application/pdf',
    txt: 'text/plain',
    csv: 'text/csv',
    json: 'application/json',
    mp4: 'video/mp4',
    mp3: 'audio/mpeg',
    zip: 'application/zip',
  }
  return map[ext] ?? 'application/octet-stream'
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function isTooManyConcurrent(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return /too many concurrent uploads/i.test(msg)
}

function isRetriablePutError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return /network error|status 5\d\d|status 520/i.test(msg)
}

function isAuthExpired(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return /status 403|SignatureDoesNotMatch|expired|Request has expired/i.test(msg)
}

async function initUpload(file: File, ctx: UploadContext): Promise<FhUploadSession> {
  const body: Record<string, unknown> = {
    name: file.name,
    mime: resolveMimeType(file),
    size: file.size,
  }
  if (ctx.folderId) body.folder_id = ctx.folderId
  if (ctx.userId) body.user_id = ctx.userId
  if (ctx.workspaceId) body.workspace_id = ctx.workspaceId
  if (ctx.disk) body.disk = ctx.disk

  const res = await post<ApiResponse<FhUploadSession>>('file-hosting/uploads', body)
  if (res.status === 'success' && res.data) return res.data
  throw new Error(res.message ?? localizedUploadMessage('init_failed'))
}

async function initUploadWithRetry(file: File, ctx: UploadContext): Promise<FhUploadSession> {
  let lastErr: unknown
  for (let attempt = 1; attempt <= MAX_INIT_RETRIES; attempt++) {
    try {
      return await initUpload(file, ctx)
    } catch (e) {
      lastErr = e
      if (!isTooManyConcurrent(e)) throw e
      await sleep(500 * Math.pow(2, attempt - 1))
    }
  }
  throw lastErr
}

async function signParts(uploadId: string, partNumbers: number[]): Promise<FhUploadPart[]> {
  const res = await post<ApiResponse<{ parts: FhUploadPart[] }>>(
    `file-hosting/uploads/${uploadId}/sign-parts`,
    { part_numbers: partNumbers },
  )
  if (res.status === 'success' && res.data) return res.data.parts
  throw new Error(res.message ?? localizedUploadMessage('sign_failed'))
}

async function abortUpload(uploadId: string): Promise<void> {
  try {
    await del<ApiResponse<null>>(`file-hosting/uploads/${uploadId}`)
  } catch {
    // best-effort
  }
}

async function completeUpload(
  uploadId: string,
  parts: { part_number: number; etag: string; size: number }[],
): Promise<HostedFile> {
  const res = await post<ApiResponse<FhUploadCompleteResult>>(
    `file-hosting/uploads/${uploadId}/complete`,
    { parts },
  )
  if (res.status === 'success' && res.data) return res.data.file
  throw new Error(res.message ?? localizedUploadMessage('complete_failed'))
}

async function putPart(
  url: string,
  blob: Blob,
  headers: Record<string, string[]> | null | undefined,
  onProgress?: (loaded: number) => void,
): Promise<{ etag: string; size: number }> {
  return new Promise((resolve, reject) => {
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      reject(new Error('Invalid upload URL'))
      return
    }
    if (
      (parsedUrl.protocol !== 'https:' && !(import.meta.env.DEV && parsedUrl.protocol === 'http:'))
      || parsedUrl.username
      || parsedUrl.password
    ) {
      reject(new Error('Invalid upload URL'))
      return
    }

    const xhr = new XMLHttpRequest()
    xhr.open('PUT', parsedUrl.toString())
    // Fail-fast: a stuck part must not hang a concurrency slot indefinitely.
    // Worker UploadPart has its own 60s deadline; 90s gives it room to retry first.
    xhr.timeout = 90_000

    if (headers) {
      for (const [key, values] of Object.entries(headers)) {
        for (const v of values) xhr.setRequestHeader(key, v)
      }
    }

    xhr.upload.onprogress = (e) => {
      if (onProgress && e.lengthComputable) onProgress(e.loaded)
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const etag = xhr.getResponseHeader('ETag')?.replace(/"/g, '') ?? ''
        resolve({ etag, size: blob.size })
      } else {
        reject(new Error(`PUT failed: status ${xhr.status}`))
      }
    }

    xhr.onerror = () => reject(new Error('network error'))
    xhr.ontimeout = () => reject(new Error('network error'))
    xhr.send(blob)
  })
}

async function putPartWithRetry(
  part: FhUploadPart,
  blob: Blob,
  uploadId: string,
  strategy: 'single' | 'multipart',
  onProgress?: (loaded: number) => void,
): Promise<{ part_number: number; etag: string; size: number }> {
  let lastErr: unknown
  let currentUrl = part.url
  let currentHeaders = part.headers

  for (let attempt = 1; attempt <= MAX_PART_RETRIES; attempt++) {
    try {
      const result = await putPart(currentUrl, blob, currentHeaders, onProgress)
      return { part_number: part.part_number, ...result }
    } catch (e) {
      lastErr = e
      if (!isRetriablePutError(e) && !isAuthExpired(e)) throw e

      // re-sign on expired/auth — single-PUT sessions have no multipart state,
      // so sign-parts would throw multipart_only; surface the original 403.
      if (isAuthExpired(e)) {
        if (strategy === 'single') throw e
        const fresh = await signParts(uploadId, [part.part_number])
        const np = fresh[0]
        if (np) {
          currentUrl = np.url
          currentHeaders = np.headers
        }
      }
      await sleep(400 * attempt)
    }
  }
  throw lastErr
}

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  const queue = items.map((item, index) => ({ item, index }))
  const runners: Promise<void>[] = []

  async function runNext(): Promise<void> {
    const next = queue.shift()
    if (!next) return
    await worker(next.item, next.index)
    await runNext()
  }

  for (let i = 0; i < Math.min(limit, queue.length); i++) {
    runners.push(runNext())
  }
  await Promise.all(runners)
}

function createRateSampler(windowMs = 5000): (bytes: number) => number {
  const samples: { ts: number; bytes: number }[] = []
  return (bytes: number): number => {
    const now = Date.now()
    samples.push({ ts: now, bytes })
    while (samples.length > 0) {
      const s = samples[0]
      if (!s || now - s.ts <= windowMs) break
      samples.shift()
    }
    if (samples.length < 2) return 0
    const first = samples[0]!
    const last = samples[samples.length - 1]!
    const elapsed = (last.ts - first.ts) / 1000
    if (elapsed <= 0) return 0
    return (last.bytes - first.bytes) / elapsed
  }
}

export interface UploadRow {
  id: string
  file: File
  name: string
  sizeLabel: string
  status: UploadStatus
  percent: number
  speed: string
  error: string
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export function formatTransferRate(bytesPerSecond: number): string {
  if (bytesPerSecond <= 0) return ''
  if (bytesPerSecond < 1024) return `${Math.round(bytesPerSecond)} B/s`
  if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`
  return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`
}

export interface FhUploadResult {
  file: HostedFile
}

export async function uploadFile(
  file: File,
  ctx: UploadContext,
  onProgress?: (p: UploadProgress) => void,
  onStatus?: (s: UploadStatus) => void,
): Promise<FhUploadResult> {
  let session: FhUploadSession | null = null

  try {
    onStatus?.('uploading')
    session = await initUploadWithRetry(file, ctx)

    const rateSampler = createRateSampler(5000)
    const totalBytes = file.size

    if (session.strategy === 'single') {
      const part = session.parts[0]
      if (!part) throw new Error('No upload part returned')

      const putResult = await putPartWithRetry(part, file, session.upload_id, session.strategy, (l) => {
        const percent = Math.min(100, Math.round((l / totalBytes) * 100))
        const bps = rateSampler(l)
        onProgress?.({ percent, bytesPerSecond: bps })
      })

      onStatus?.('completing')
      const result = await completeUpload(session.upload_id, [
        { part_number: 1, etag: putResult.etag, size: putResult.size },
      ])
      onStatus?.('done')
      onProgress?.({ percent: 100, bytesPerSecond: 0 })
      return { file: result }
    }

    // multipart
    const chunkSize = session.chunk_size
    const partCount = session.part_count
    const partProgress = new Map<number, number>()
    const partResults = new Map<number, { part_number: number; etag: string; size: number }>()

    const uploadOne = async (n: number): Promise<void> => {
      const start = (n - 1) * chunkSize
      const end = Math.min(start + chunkSize, file.size)
      const blob = file.slice(start, end)
      const part = session!.parts.find((p) => p.part_number === n)

      if (!part) throw new Error(`Missing part ${n}`)

      const result = await putPartWithRetry(part, blob, session!.upload_id, session!.strategy, (l) => {
        partProgress.set(n, l)
        const total = Array.from(partProgress.values()).reduce((a, b) => a + b, 0)
        const percent = Math.min(100, Math.round((total / totalBytes) * 100))
        const bps = rateSampler(total)
        onProgress?.({ percent, bytesPerSecond: bps })
      })
      partResults.set(n, result)
    }

    const partNumbers = Array.from({ length: partCount }, (_, i) => i + 1)
    await runWithConcurrency(partNumbers, MAX_PART_CONCURRENCY, uploadOne)

    onStatus?.('completing')
    const completeParts = partNumbers.map((n) => partResults.get(n)!)

    const result = await completeUpload(session.upload_id, completeParts)
    onStatus?.('done')
    onProgress?.({ percent: 100, bytesPerSecond: 0 })
    return { file: result }
  } catch (e) {
    if (session) await abortUpload(session.upload_id)
    onStatus?.('error')
    throw e
  }
}

export function useFhUpload() {
  return {
    uploadFile,
    abortUpload,
    formatBytes,
    formatTransferRate,
  }
}
