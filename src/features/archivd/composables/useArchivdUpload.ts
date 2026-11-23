import { useI18n } from 'vue-i18n'
import { post, del } from '@/api/client'
import type { ApiResponse } from '@/api/types'
import type { ArUploadSession, ArUploadPart, ArUploadCompleteResult, HostedFile } from '../types'

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

// Composables read the active i18n instance through `useI18n()` rather than
// importing `@/i18n`: the core bundle imports the feature registry, so a feature
// importing the singleton would close the cycle (core → registry → feature →
// core) and evaluate the shell before it exists.
type Translator = (key: string, named?: Record<string, unknown>) => string

function localizedUploadMessage(t: Translator, key: 'init_failed' | 'sign_failed' | 'complete_failed'): string {
  return t(`web.archivd.upload.${key}`)
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
  return /network error|status 5\d\d|status 520|network error interrupted the upload/i.test(msg)
}

function isAuthExpired(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return /status 403|SignatureDoesNotMatch|expired|Request has expired/i.test(msg)
}

async function initUpload(t: Translator, file: File, ctx: UploadContext): Promise<ArUploadSession> {
  const body: Record<string, unknown> = {
    name: file.name,
    mime: resolveMimeType(file),
    size: file.size,
  }
  if (ctx.folderId) body.folder_id = ctx.folderId
  if (ctx.userId) body.user_id = ctx.userId
  if (ctx.workspaceId) body.workspace_id = ctx.workspaceId
  if (ctx.disk) body.disk = ctx.disk

  const res = await post<ApiResponse<ArUploadSession>>('archivd/uploads', body)
  if (res.status === 'success' && res.data) return res.data
  throw new Error(res.message ?? localizedUploadMessage(t, 'init_failed'))
}

async function initUploadWithRetry(t: Translator, file: File, ctx: UploadContext): Promise<ArUploadSession> {
  let lastErr: unknown
  for (let attempt = 1; attempt <= MAX_INIT_RETRIES; attempt++) {
    try {
      return await initUpload(t, file, ctx)
    } catch (e) {
      lastErr = e
      if (!isTooManyConcurrent(e)) throw e
      await sleep(500 * Math.pow(2, attempt - 1))
    }
  }
  throw lastErr
}

async function signParts(t: Translator, uploadId: string, partNumbers: number[]): Promise<ArUploadPart[]> {
  const res = await post<ApiResponse<{ parts: ArUploadPart[] }>>(
    `archivd/uploads/${uploadId}/sign-parts`,
    { part_numbers: partNumbers },
  )
  if (res.status === 'success' && res.data) return res.data.parts
  throw new Error(res.message ?? localizedUploadMessage(t, 'sign_failed'))
}

async function abortUpload(uploadId: string): Promise<void> {
  try {
    await del<ApiResponse<null>>(`archivd/uploads/${uploadId}`)
  } catch {
    // best-effort
  }
}

async function completeUpload(
  t: Translator,
  uploadId: string,
  parts: { part_number: number; etag: string; size: number }[],
): Promise<HostedFile> {
  const res = await post<ApiResponse<ArUploadCompleteResult>>(
    `archivd/uploads/${uploadId}/complete`,
    { parts },
  )
  if (res.status === 'success' && res.data) return res.data.file
  throw new Error(res.message ?? localizedUploadMessage(t, 'complete_failed'))
}

async function putPart(
  t: Translator,
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
      reject(new Error(t('web.archivd.upload.invalid_url')))
      return
    }
    if (
      (parsedUrl.protocol !== 'https:' && !(import.meta.env.DEV && parsedUrl.protocol === 'http:'))
      || parsedUrl.username
      || parsedUrl.password
    ) {
      reject(new Error(t('web.archivd.upload.invalid_url')))
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
        reject(new Error(t('web.archivd.upload.put_failed', { status: xhr.status })))
      }
    }

    xhr.onerror = () => reject(new Error(t('web.archivd.upload.network_error')))
    xhr.ontimeout = () => reject(new Error(t('web.archivd.upload.network_error')))
    xhr.send(blob)
  })
}

async function putPartWithRetry(
  t: Translator,
  part: ArUploadPart,
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
      const result = await putPart(t, currentUrl, blob, currentHeaders, onProgress)
      return { part_number: part.part_number, ...result }
    } catch (e) {
      lastErr = e
      if (!isRetriablePutError(e) && !isAuthExpired(e)) throw e

      // re-sign on expired/auth — single-PUT sessions have no multipart state,
      // so sign-parts would throw multipart_only; surface the original 403.
      if (isAuthExpired(e)) {
        if (strategy === 'single') throw e
        const fresh = await signParts(t, uploadId, [part.part_number])
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

function formatLocalized(locale: string, value: number, fractionDigits: number): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value)
}

export function formatBytes(locale: string, bytes: number): string {
  if (bytes < 1024) return `${formatLocalized(locale, bytes, 0)} B`
  if (bytes < 1024 * 1024) return `${formatLocalized(locale, bytes / 1024, 1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${formatLocalized(locale, bytes / (1024 * 1024), 1)} MB`
  return `${formatLocalized(locale, bytes / (1024 * 1024 * 1024), 2)} GB`
}

export function formatTransferRate(locale: string, bytesPerSecond: number): string {
  if (bytesPerSecond <= 0) return ''
  if (bytesPerSecond < 1024) return `${formatLocalized(locale, bytesPerSecond, 0)} B/s`
  if (bytesPerSecond < 1024 * 1024) return `${formatLocalized(locale, bytesPerSecond / 1024, 1)} KB/s`
  return `${formatLocalized(locale, bytesPerSecond / (1024 * 1024), 1)} MB/s`
}

export interface ArUploadResult {
  file: HostedFile
}

export async function uploadFile(
  t: Translator,
  locale: string,
  file: File,
  ctx: UploadContext,
  onProgress?: (p: UploadProgress) => void,
  onStatus?: (s: UploadStatus) => void,
): Promise<ArUploadResult> {
  let session: ArUploadSession | null = null

  try {
    onStatus?.('uploading')
    session = await initUploadWithRetry(t, file, ctx)

    const rateSampler = createRateSampler(5000)
    const totalBytes = file.size

    if (session.strategy === 'single') {
      const part = session.parts[0]
      if (!part) throw new Error(t('web.archivd.upload.part_list_missing'))

      const putResult = await putPartWithRetry(t, part, file, session.upload_id, session.strategy, (l) => {
        const percent = Math.min(100, Math.round((l / totalBytes) * 100))
        const bps = rateSampler(l)
        onProgress?.({ percent, bytesPerSecond: bps })
      })

      onStatus?.('completing')
      const result = await completeUpload(t, session.upload_id, [
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

      if (!part) throw new Error(t('web.archivd.upload.part_missing', { part: n }))

      const result = await putPartWithRetry(t, part, blob, session!.upload_id, session!.strategy, (l) => {
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

    const result = await completeUpload(t, session.upload_id, completeParts)
    onStatus?.('done')
    onProgress?.({ percent: 100, bytesPerSecond: 0 })
    return { file: result }
  } catch (e) {
    if (session) await abortUpload(session.upload_id)
    onStatus?.('error')
    throw e
  }
}

export function useArchivdUpload() {
  const { t, locale } = useI18n()
  const translate: Translator = (key, named) => t(key, named as Record<string, unknown> ?? {})

  return {
    uploadFile: (file: File, ctx: UploadContext, onProgress?: (p: UploadProgress) => void, onStatus?: (s: UploadStatus) => void) =>
      uploadFile(translate, locale.value, file, ctx, onProgress, onStatus),
    abortUpload,
    formatBytes: (bytes: number) => formatBytes(locale.value, bytes),
    formatTransferRate: (bytesPerSecond: number) => formatTransferRate(locale.value, bytesPerSecond),
  }
}
