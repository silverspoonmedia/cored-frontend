import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PusherEcho } from 'laravel-echo'

/**
 * `useVtualIncidents` is the incident triage queue's data + realtime seam.
 *
 * The queue is read + triage only: rows are written by the failure paths
 * themselves, so this composable must never expose a create/delete, and the
 * triage click must send the *status* the endpoint expects rather than the
 * action key the view happened to render.
 *
 * `private-vtual.incidents` carries ids + enums and nothing else — the
 * incident `title`/`detail` are free text assembled from platform error
 * responses and fan out to every staff subscriber at once. A ping therefore
 * means refetch, and the payload must reach the view untouched: no enrichment
 * locally, and no `title`/`detail` on the wire.
 */

const api = vi.hoisted(() => ({
  patch: vi.fn(),
  get: vi.fn(),
}))

vi.mock('../src/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/api/client')>()
  return {
    ...actual,
    patch: api.patch,
    get: api.get,
  }
})

vi.mock('vue-i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-i18n')>()
  return {
    ...actual,
    useI18n: () => ({ t: (key: string) => key }),
  }
})

const leftChannels: string[] = []
const channels = new Map<string, { listen: ReturnType<typeof vi.fn>; listeners: Record<string, (payload: unknown) => void> }>()

function makeFakeEcho(): PusherEcho {
  return {
    private: vi.fn((name: string) => {
      let ch = channels.get(name)
      if (!ch) {
        ch = {
          listen: vi.fn((event: string, fn: (payload: unknown) => void) => {
            ch!.listeners[event] = fn
          }),
          listeners: {},
        }
        channels.set(name, ch)
      }
      return ch as unknown as never
    }),
    leave: vi.fn((name: string) => {
      leftChannels.push(name)
      channels.delete(name)
    }),
  } as unknown as PusherEcho
}

async function loadComposable() {
  const echo = await import('../src/composables/useEcho')
  echo.__setEchoForTests(makeFakeEcho())
  const { useVtualIncidents } = await import('../src/composables/vtual/useVtualIncidents')
  return useVtualIncidents()
}

beforeEach(() => {
  channels.clear()
  leftChannels.length = 0
  vi.clearAllMocks()
})

afterEach(() => {
  vi.resetModules()
})

describe('triage', () => {
  it('translates the action key into the status the endpoint expects', async () => {
    const incidents = await loadComposable()
    api.patch.mockResolvedValue({ status: 'success', data: { id: 'i1', status: 'acknowledged' } })

    await incidents.triage('i1', 'acknowledge')
    expect(api.patch).toHaveBeenCalledWith('vtual/admin/incidents/i1/status', { status: 'acknowledged' })

    api.patch.mockResolvedValue({ status: 'success', data: { id: 'i1', status: 'resolved' } })
    await incidents.triage('i1', 'resolve')
    expect(api.patch).toHaveBeenLastCalledWith('vtual/admin/incidents/i1/status', { status: 'resolved' })
  })

  it('returns the server row so the view can re-render without a refetch', async () => {
    const incidents = await loadComposable()
    const row = { id: 'i1', status: 'resolved' }
    api.patch.mockResolvedValue({ status: 'success', data: row })

    await expect(incidents.triage('i1', 'resolve')).resolves.toBe(row)
  })

  it('surfaces the server message when the transition is refused', async () => {
    const incidents = await loadComposable()
    api.patch.mockResolvedValue({ status: 'error', message: 'Incident already resolved.' })

    await expect(incidents.triage('i1', 'acknowledge')).rejects.toThrow('Incident already resolved.')
  })

  it('falls back to the localized key when the server sends no message', async () => {
    const incidents = await loadComposable()
    api.patch.mockResolvedValue({ status: 'error' })

    await expect(incidents.triage('i1', 'acknowledge')).rejects.toThrow('web.vtual.incidents.errors.action_failed')
  })
})

describe('queue realtime', () => {
  it('binds private-vtual.incidents and forwards ids + enums untouched', async () => {
    const incidents = await loadComposable()
    const handler = vi.fn()

    incidents.subscribeRealtime({ onIncidentChanged: handler })

    const channel = channels.get('vtual.incidents')
    expect(channel).toBeDefined()

    const payload = { action: 'created', incident_id: 'i1', kind: 'websub', severity: 'error', status: 'open' }
    channel?.listeners['.incident.changed']?.(payload)

    expect(handler).toHaveBeenCalledTimes(1)
    // Same object: nothing is enriched locally.
    expect(handler.mock.calls[0]?.[0]).toBe(payload)
    // The free-text incident body never travels on the broadcast channel.
    expect(handler.mock.calls[0]?.[0]).not.toHaveProperty('title')
    expect(handler.mock.calls[0]?.[0]).not.toHaveProperty('detail')
  })

  it('leaves the queue channel when the last consumer detaches', async () => {
    const incidents = await loadComposable()
    const handlers = { onIncidentChanged: vi.fn() }

    incidents.subscribeRealtime(handlers)
    expect(leftChannels).not.toContain('vtual.incidents')

    incidents.unsubscribeRealtime(handlers)
    expect(leftChannels).toContain('vtual.incidents')
    expect(channels.get('vtual.incidents')).toBeUndefined()
  })
})
