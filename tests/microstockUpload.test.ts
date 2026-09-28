import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Marketplace-upload client contract (decision:
 * monolith/docs/domains/microstock/reference-marketplace-upload.md).
 *
 * The two endpoints are a pair — POST queues and returns the attempt, GET reads
 * the latest attempt and must surface an explicit `null` (never `undefined`, and
 * never a thrown error) so the SPA can tell "never attempted" from "failed".
 * The upload is additive to the CSV path: no client method here touches the
 * export or download routes.
 */

const get = vi.fn()
const post = vi.fn()

vi.mock('@/api/client', () => ({
  get: (...args: unknown[]) => get(...args),
  post: (...args: unknown[]) => post(...args),
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

type ComposableModule = typeof import('../src/composables/microstock/useMicrostock')

function attempt(partial: Record<string, unknown> = {}) {
  return {
    id: 'upload-1',
    marketplace: 'adobe_stock',
    status: 'queued',
    remote_path: '/incoming',
    file_count: 3,
    byte_count: 4096,
    error: null,
    started_at: null,
    finished_at: null,
    created_at: '2026-09-27T20:30:00+07:00',
    ...partial,
  }
}

async function importComposable(): Promise<ComposableModule> {
  return import('../src/composables/microstock/useMicrostock')
}

beforeEach(() => {
  get.mockReset()
  post.mockReset()
  vi.resetModules()
})

describe('useMicrostock marketplace upload', () => {
  it('queues against the collection upload route with the credential id', async () => {
    post.mockResolvedValue({ status: 'success', message: 'ok', data: attempt() })

    const { useMicrostock } = await importComposable()
    const result = await useMicrostock().uploadCollection('folder-1', 'cred-9')

    expect(post).toHaveBeenCalledWith('microstock/collections/folder-1/upload', {
      credential_id: 'cred-9',
    })
    expect(result.status).toBe('queued')
    expect(result.remote_path).toBe('/incoming')
  })

  it('surfaces the backend message when the queue is refused', async () => {
    post.mockResolvedValue({
      status: 'error',
      message: 'Marketplace upload is turned off on this platform.',
      data: null,
    })

    const { useMicrostock } = await importComposable()

    await expect(useMicrostock().uploadCollection('folder-1', 'cred-9')).rejects.toThrow(
      'Marketplace upload is turned off on this platform.',
    )
  })

  it('reads the latest attempt from the same route', async () => {
    get.mockResolvedValue({ status: 'success', message: 'ok', data: attempt({ status: 'uploaded' }) })

    const { useMicrostock } = await importComposable()
    const result = await useMicrostock().fetchUploadStatus('folder-1')

    expect(get).toHaveBeenCalledWith('microstock/collections/folder-1/upload')
    expect(result?.status).toBe('uploaded')
  })

  it('returns null — not a throw — when the collection was never uploaded', async () => {
    get.mockResolvedValue({ status: 'success', message: 'ok', data: null })

    const { useMicrostock } = await importComposable()

    await expect(useMicrostock().fetchUploadStatus('folder-1')).resolves.toBeNull()
  })

  it('throws the backend message when the status read fails', async () => {
    get.mockResolvedValue({ status: 'error', message: 'Collection not found.', data: null })

    const { useMicrostock } = await importComposable()

    await expect(useMicrostock().fetchUploadStatus('folder-1')).rejects.toThrow('Collection not found.')
  })
})
