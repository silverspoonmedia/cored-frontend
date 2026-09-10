import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Echo private-channel auth must go through client.post (CSRF + 419 retry),
 * not a private fetch.
 */

const post = vi.fn()

vi.mock('@/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/client')>()
  return {
    ...actual,
    post: (...args: unknown[]) => post(...args),
  }
})

describe('authorizeBroadcastChannel', () => {
  beforeEach(() => {
    post.mockReset()
    vi.stubGlobal('window', {
      location: { origin: 'http://localhost:5173' },
      addEventListener: () => {},
      removeEventListener: () => {},
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('posts socket_id and channel_name to broadcasting/auth', async () => {
    post.mockResolvedValue({ auth: 'key:sig', channel_data: '{"user_id":1}' })
    const { authorizeBroadcastChannel } = await import('../src/composables/useEcho')

    const out = await authorizeBroadcastChannel('private-navigation.menus', '1.2')

    expect(post).toHaveBeenCalledWith('broadcasting/auth', {
      socket_id: '1.2',
      channel_name: 'private-navigation.menus',
    })
    expect(out).toEqual({ auth: 'key:sig', channel_data: '{"user_id":1}' })
  })

  it('rejects a payload without an auth string', async () => {
    post.mockResolvedValue({ status: 'error', message: 'forbidden' })
    const { authorizeBroadcastChannel } = await import('../src/composables/useEcho')

    await expect(authorizeBroadcastChannel('private-x', '1.1')).rejects.toThrow(
      'Could not authorize the realtime connection.',
    )
  })
})
