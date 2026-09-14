import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { apiUrl, isCrossOrigin, resolveApiUrl } from '../src/api/baseUrl'

// Note on stubbing the API origin: `resolveApiUrl` reads `import.meta.env` at call
// time. Each test sets `VITE_API_BASE_URL` before calling, and resets after.
const ORIGINAL_ENV = { ...import.meta.env }

afterEach(() => {
  for (const key of Object.keys(import.meta.env)) {
    delete (import.meta.env as Record<string, unknown>)[key]
  }
  Object.assign(import.meta.env, ORIGINAL_ENV)
})

describe('resolveApiUrl', () => {
  it('falls back to same-origin /api/v1 prefix when VITE_API_BASE_URL is empty', () => {
    ;(import.meta.env as Record<string, unknown>).VITE_API_BASE_URL = ''
    expect(resolveApiUrl('auth/me')).toBe('/api/v1/auth/me')
    expect(resolveApiUrl('/apps/roles')).toBe('/api/v1/apps/roles')
    expect(resolveApiUrl('vtual/public/vtubers')).toBe('/api/v1/vtual/public/vtubers')
  })

  it('routes auth and data paths alike to the absolute API origin', () => {
    ;(import.meta.env as Record<string, unknown>).VITE_API_BASE_URL =
      'https://monolith-ph24.spnd.uk/api/v1'
    expect(resolveApiUrl('auth/login')).toBe('https://monolith-ph24.spnd.uk/api/v1/auth/login')
    expect(resolveApiUrl('auth/me')).toBe('https://monolith-ph24.spnd.uk/api/v1/auth/me')
    expect(resolveApiUrl('auth/refresh')).toBe('https://monolith-ph24.spnd.uk/api/v1/auth/refresh')
    expect(resolveApiUrl('vtual/public/vtubers')).toBe(
      'https://monolith-ph24.spnd.uk/api/v1/vtual/public/vtubers',
    )
  })

  it('strips trailing slashes from the origin before joining', () => {
    ;(import.meta.env as Record<string, unknown>).VITE_API_BASE_URL =
      'https://api.example.com/api/v1/'
    expect(resolveApiUrl('batch')).toBe('https://api.example.com/api/v1/batch')
  })

  it('rejects HTTP API origins outside development builds', () => {
    ;(import.meta.env as Record<string, unknown>).DEV = false
    ;(import.meta.env as Record<string, unknown>).VITE_API_BASE_URL = 'http://api.example.com/api/v1'
    expect(resolveApiUrl('auth/me')).toBe('/api/v1/auth/me')
  })

  it('falls back to same-origin when configured API URL is unsafe', () => {
    for (const value of [
      'javascript:alert(1)',
      'https://user:pass@example.com/api/v1',
      'https://api.example.com/api/v1?token=secret',
      'https://api.example.com/api/v1#fragment',
      'not a url',
    ]) {
      ;(import.meta.env as Record<string, unknown>).VITE_API_BASE_URL = value
      expect(resolveApiUrl('auth/me')).toBe('/api/v1/auth/me')
    }
  })
})

describe('apiUrl', () => {
  const g = globalThis as Record<string, unknown>
  let originalWindow: unknown

  beforeEach(() => {
    originalWindow = g.window
    g.window = { location: { origin: 'http://localhost:5173' } }
    ;(import.meta.env as Record<string, unknown>).VITE_API_BASE_URL = ''
  })

  afterEach(() => {
    if (originalWindow === undefined) {
      delete g.window
    } else {
      g.window = originalWindow
    }
  })

  it('resolves relative paths against the API prefix', () => {
    expect(apiUrl('lookups/roles').toString()).toBe(
      'http://localhost:5173/api/v1/lookups/roles',
    )
  })

  it('serializes array values as repeated params (Laravel `ids[]` contract)', () => {
    const url = apiUrl('lookups/roles', { 'ids[]': ['a', 'b'] })

    expect(url.searchParams.getAll('ids[]')).toEqual(['a', 'b'])
    expect(url.search).toBe('?ids%5B%5D=a&ids%5B%5D=b')
  })

  it('skips null and undefined values, including inside arrays', () => {
    const url = apiUrl('lookups/roles', {
      'ids[]': ['a', null, undefined, 'b'],
      q: null,
      page: undefined,
    })

    expect(url.searchParams.getAll('ids[]')).toEqual(['a', 'b'])
    expect(url.searchParams.has('q')).toBe(false)
    expect(url.searchParams.has('page')).toBe(false)
  })

  it('keeps scalar values as single params', () => {
    const url = apiUrl('lookups/menus', { layout: 'sidebar', exclude: 'menu-1' })

    expect(url.searchParams.get('layout')).toBe('sidebar')
    expect(url.searchParams.get('exclude')).toBe('menu-1')
  })

  it('returns an untouched URL when no query is given', () => {
    expect(apiUrl('lookups/roles', null).search).toBe('')
    expect(apiUrl('lookups/roles').search).toBe('')
  })
})

describe('isCrossOrigin', () => {
  const g = globalThis as Record<string, unknown>
  let originalWindow: unknown

  beforeEach(() => {
    originalWindow = g.window
    g.window = { location: { origin: 'http://localhost:5173' } }
  })

  afterEach(() => {
    if (originalWindow === undefined) {
      delete g.window
    } else {
      g.window = originalWindow
    }
  })

  it('returns true for absolute URLs on a different origin', () => {
    expect(isCrossOrigin('https://monolith-ph24.spnd.uk/api/v1/apps/roles')).toBe(true)
  })

  it('returns false for absolute URLs on the same origin', () => {
    expect(isCrossOrigin('http://localhost:5173/api/v1/auth/login')).toBe(false)
  })

  it('returns false for same-origin relative paths', () => {
    expect(isCrossOrigin('/api/v1/auth/me')).toBe(false)
  })

  it('returns false for garbage input instead of throwing', () => {
    expect(isCrossOrigin('::not a url::')).toBe(false)
  })
})
