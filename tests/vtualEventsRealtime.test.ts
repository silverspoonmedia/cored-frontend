import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PusherEcho } from 'laravel-echo'
import type { VtualManagementEvent } from '../src/api/types'

/**
 * `useVtualEventEdit` is the event form's data + realtime seam.
 *
 * The backend broadcasts `.management.updated` with `kind=event` on create /
 * update / cancel. Before this wiring the SPA had no subscriber for that kind,
 * so a form open in one tab kept stale values while another member cancelled the
 * event — and the submit then failed with `event_not_actionable`.
 *
 * Three things must hold, and each is a distinct failure mode:
 *
 * - only `kind=event` triggers a refetch (a member or invite push must not
 *   reload the form, and must not steal focus);
 * - a push that names a *different* event is ignored (`ref_id` filter), while a
 *   null `ref_id` is treated as relevant — the payload is ids-only and a future
 *   backend that drops `ref_id` must not silently stop notifying;
 * - the subscription is released on unmount and never re-registered while the
 *   form stays on the same org. `subscribeManagement()` returns whether the
 *   *channel* is attached, and attach is deferred until Echo exists, so a
 *   handler that used that return value as its "registered" flag would leak on
 *   a form opened before `initEcho()`.
 */

const api = vi.hoisted(() => ({
  fetchOne: vi.fn(),
  updateEvent: vi.fn(),
  createEvent: vi.fn(),
  fetchList: vi.fn(),
}))

vi.mock('../src/composables/vtual/useVtualEvents', () => ({
  useVtualEvents: () => ({
    fetchOne: api.fetchOne,
    updateEvent: api.updateEvent,
    createEvent: api.createEvent,
  }),
}))

vi.mock('../src/composables/vtual/useVtualManagements', () => ({
  useVtualManagements: () => ({
    fetchList: api.fetchList,
  }),
}))

const routeParams: Record<string, string> = {}
const routerPush = vi.fn()

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: routeParams }),
  useRouter: () => ({ push: routerPush }),
}))

vi.mock('vue-i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-i18n')>()
  return {
    ...actual,
    useI18n: () => ({ t: (key: string) => key }),
  }
})

vi.mock('../src/composables/useAlert', () => ({
  useAlert: () => ({ success: vi.fn(), error: vi.fn() }),
}))

const mountedCallbacks: Array<() => void> = []

vi.mock('vue', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue')>()
  return {
    ...actual,
    onUnmounted: (cb: () => void) => { mountedCallbacks.push(cb) },
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

const event = (overrides: Partial<VtualManagementEvent> = {}): VtualManagementEvent => ({
  id: 'e1',
  management_id: 'm1',
  title: 'Debut stream',
  description: 'first',
  thumbnail_url: null,
  url: null,
  starts_at: '2026-10-01T10:00:00.000000Z',
  ends_at: null,
  timezone: null,
  creator_id: null,
  is_featured: false,
  status: 'scheduled',
  management: { name: 'Org' },
  ...overrides,
} as VtualManagementEvent)

/** Mount the composable and let its immediate watchers settle. */
async function loadComposable() {
  const echo = await import('../src/composables/useEcho')
  echo.__setEchoForTests(makeFakeEcho())
  const { useVtualEventEdit } = await import('../src/composables/vtual/useVtualEventEdit')
  const state = useVtualEventEdit()
  await vi.waitFor(() => {
    expect(api.fetchOne).toHaveBeenCalled()
  })
  await vi.waitFor(() => {
    expect(channels.get('vtual.management.m1')).toBeDefined()
  })
  return state
}

beforeEach(() => {
  routeParams.id = 'e1'
  channels.clear()
  leftChannels.length = 0
  mountedCallbacks.length = 0
  vi.clearAllMocks()
  api.fetchList.mockResolvedValue([])
  api.fetchOne.mockResolvedValue(event())
})

afterEach(() => {
  vi.resetModules()
})

describe('event realtime subscription', () => {
  it('binds the org channel and refetches on kind=event', async () => {
    const state = await loadComposable()
    expect(state.form.title).toBe('Debut stream')

    api.fetchOne.mockResolvedValue(event({ title: 'Debut stream (rescheduled)' }))
    channels.get('vtual.management.m1')?.listeners['.management.updated']?.({
      management_id: 'm1',
      kind: 'event',
      ref_id: 'e1',
      action: 'updated',
    })

    await vi.waitFor(() => {
      expect(api.fetchOne).toHaveBeenCalledTimes(2)
    })
    // The form was pristine, so the fresh snapshot is adopted.
    await vi.waitFor(() => {
      expect(state.form.title).toBe('Debut stream (rescheduled)')
    })
  })

  it('ignores kinds other than event', async () => {
    await loadComposable()

    channels.get('vtual.management.m1')?.listeners['.management.updated']?.({
      management_id: 'm1',
      kind: 'member',
      ref_id: 'u1',
      action: 'updated',
    })

    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(api.fetchOne).toHaveBeenCalledTimes(1)
  })

  it('ignores an event push naming another event, but honours a null ref_id', async () => {
    await loadComposable()

    channels.get('vtual.management.m1')?.listeners['.management.updated']?.({
      management_id: 'm1',
      kind: 'event',
      ref_id: 'other-event',
      action: 'updated',
    })
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(api.fetchOne).toHaveBeenCalledTimes(1)

    channels.get('vtual.management.m1')?.listeners['.management.updated']?.({
      management_id: 'm1',
      kind: 'event',
      ref_id: null,
      action: 'updated',
    })
    await vi.waitFor(() => {
      expect(api.fetchOne).toHaveBeenCalledTimes(2)
    })
  })

  it('locks the form when the event left an editable status', async () => {
    const state = await loadComposable()
    expect(state.remoteLocked.value).toBe(false)

    api.fetchOne.mockResolvedValue(event({ status: 'cancelled' }))
    channels.get('vtual.management.m1')?.listeners['.management.updated']?.({
      management_id: 'm1',
      kind: 'event',
      ref_id: 'e1',
      action: 'cancelled',
    })

    await vi.waitFor(() => {
      expect(state.remoteLocked.value).toBe(true)
    })
  })

  it('does not overwrite unsaved edits while the actor is typing', async () => {
    const state = await loadComposable()
    state.form.title = 'Local draft'

    api.fetchOne.mockResolvedValue(event({ title: 'Remote title' }))
    channels.get('vtual.management.m1')?.listeners['.management.updated']?.({
      management_id: 'm1',
      kind: 'event',
      ref_id: 'e1',
      action: 'updated',
    })

    await vi.waitFor(() => {
      expect(api.fetchOne).toHaveBeenCalledTimes(2)
    })
    expect(state.form.title).toBe('Local draft')
  })

  it('releases the channel on unmount', async () => {
    await loadComposable()
    expect(leftChannels).not.toContain('vtual.management.m1')

    for (const cb of mountedCallbacks) cb()
    expect(leftChannels).toContain('vtual.management.m1')
    expect(channels.get('vtual.management.m1')).toBeUndefined()
  })
})
