import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  COOKIE_RACE_BACKOFF_MS,
  isTransientFetchError,
  withCookieRaceRetry,
} from '../src/api/netRetry'

/**
 * The one retry policy for the browser's transient fetch TypeError (a
 * cross-tab Set-Cookie collision surfaces as a CORS error). The loop is
 * bounded, and both the pre-attempt hook and the extra gate are caller-owned.
 */

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('isTransientFetchError', () => {
  it('accepts the browser network-abort messages', () => {
    expect(isTransientFetchError(new TypeError('Failed to fetch'))).toBe(true)
    expect(isTransientFetchError(new TypeError('Load failed'))).toBe(true)
    expect(isTransientFetchError(new TypeError('NetworkError when attempting to fetch resource.'))).toBe(true)
    expect(isTransientFetchError(new TypeError('Network request failed'))).toBe(true)
  })

  it('rejects non-TypeError and unrelated messages', () => {
    expect(isTransientFetchError(new Error('Failed to fetch'))).toBe(false)
    expect(isTransientFetchError(new TypeError('boom'))).toBe(false)
    expect(isTransientFetchError(null)).toBe(false)
    expect(isTransientFetchError('Failed to fetch')).toBe(false)
  })
})

describe('withCookieRaceRetry', () => {
  it('returns the first result without retrying', async () => {
    const run = vi.fn().mockResolvedValue('ok')

    await expect(withCookieRaceRetry(run)).resolves.toBe('ok')
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('retries a transient error then succeeds', async () => {
    vi.useFakeTimers()
    const run = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce('ok')

    const pending = withCookieRaceRetry(run)
    await vi.runAllTimersAsync()

    await expect(pending).resolves.toBe('ok')
    expect(run).toHaveBeenCalledTimes(2)
  })

  it('gives up after the backoff budget and rethrows the last error', async () => {
    vi.useFakeTimers()
    const run = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))

    const pending = withCookieRaceRetry(run)
    const assertion = expect(pending).rejects.toThrow('Failed to fetch')
    await vi.runAllTimersAsync()
    await assertion

    // One initial attempt plus one per backoff entry.
    expect(run).toHaveBeenCalledTimes(COOKIE_RACE_BACKOFF_MS.length + 1)
  })

  it('rethrows a non-transient error without retrying', async () => {
    const run = vi.fn().mockRejectedValue(new Error('boom'))

    await expect(withCookieRaceRetry(run)).rejects.toThrow('boom')
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('honors the retryable gate', async () => {
    const run = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(withCookieRaceRetry(run, { retryable: () => false })).rejects.toThrow('Failed to fetch')
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('awaits beforeAttempt before every attempt, including the first', async () => {
    vi.useFakeTimers()
    const order: string[] = []
    const run = vi.fn().mockImplementation(() => {
      order.push('run')
      return run.mock.calls.length === 1
        ? Promise.reject(new TypeError('Failed to fetch'))
        : Promise.resolve('ok')
    })
    const beforeAttempt = vi.fn(async () => {
      order.push('before')
    })

    const pending = withCookieRaceRetry(run, { beforeAttempt })
    await vi.runAllTimersAsync()

    await expect(pending).resolves.toBe('ok')
    expect(beforeAttempt).toHaveBeenCalledTimes(2)
    expect(order).toEqual(['before', 'run', 'before', 'run'])
  })
})
