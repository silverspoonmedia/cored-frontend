import { describe, expect, it } from 'vitest'
import {
  API_PREFIX,
  COOKIE_NAME,
  CSRF_HEADER,
  CSRF_VALUE,
  attachSession,
  cacheControlFor,
  cookieFlags,
  envelope,
  expireCookie,
  mintCookie,
  pathAllowed,
  proxyToMonolith,
  readSpaJwt,
} from '../server/bff'

describe('pathAllowed', () => {
  it('allows the versioned API prefix', () => {
    expect(pathAllowed('/api/v1')).toBe(true)
    expect(pathAllowed('/api/v1/auth/me')).toBe(true)
  })

  it('rejects traversal and non-v1 API paths', () => {
    expect(pathAllowed('/api/v1/../secret')).toBe(false)
    expect(pathAllowed('/api/v2/auth/me')).toBe(false)
    expect(pathAllowed('/apps/dashboard')).toBe(false)
  })
})

describe('cacheControlFor', () => {
  it('is private when a session is present', () => {
    expect(cacheControlFor('GET', `${API_PREFIX}/navigation/menus`, true)).toBe('private, max-age=60')
    expect(cacheControlFor('GET', `${API_PREFIX}/currencies/idr`, true)).toBe('private, max-age=300')
  })

  it('is public for anonymous reference data', () => {
    expect(cacheControlFor('GET', `${API_PREFIX}/services/options`, false)).toBe('public, max-age=60')
  })

  it('skips mutations and unknown paths', () => {
    expect(cacheControlFor('POST', `${API_PREFIX}/navigation/menus`, true)).toBeNull()
    expect(cacheControlFor('GET', `${API_PREFIX}/auth/me`, true)).toBeNull()
  })
})

describe('spa_jwt cookie', () => {
  it('reads the cookie value', () => {
    expect(readSpaJwt('foo=bar; spa_jwt=abc%2Edef')).toBe('abc.def')
    expect(readSpaJwt('other=1')).toBeNull()
  })

  it('mints HttpOnly SameSite=Strict cookies', () => {
    const http = new Request('http://localhost/api/v1/auth/login', { method: 'POST' })
    const https = new Request('https://spa.test/api/v1/auth/login', { method: 'POST' })
    expect(cookieFlags(http)).toContain('HttpOnly')
    expect(cookieFlags(http)).toContain('SameSite=Strict')
    expect(cookieFlags(http)).not.toContain('Secure')
    expect(cookieFlags(https)).toContain('Secure')
    expect(mintCookie(https, 'tok', 120)).toContain(`${COOKIE_NAME}=tok`)
    expect(mintCookie(https, 'tok', 120)).toContain('Max-Age=120')
    expect(expireCookie(https)).toContain('Max-Age=0')
  })
})

describe('attachSession', () => {
  it('strips data.token on login and sets spa_jwt', async () => {
    const request = new Request('https://spa.test/api/v1/auth/login', { method: 'POST' })
    const upstream = new Response(JSON.stringify({
      status: 'success',
      message: 'ok',
      data: { token: 'jwt-secret', token_type: 'bearer', expires_in: 240, user: { id: '1' } },
    }), { headers: { 'content-type': 'application/json' } })

    const out = await attachSession(request, upstream, `${API_PREFIX}/auth/login`, 'POST', null)
    const json = await out.json() as { data: Record<string, unknown> }

    expect(json.data.token).toBeUndefined()
    expect(json.data.user).toEqual({ id: '1' })
    expect(out.headers.get('Set-Cookie')).toContain(`${COOKIE_NAME}=jwt-secret`)
    expect(out.headers.get('X-Content-Type-Options')).toBe('nosniff')
  })
})

describe('CSRF cookie gate', () => {
  it('rejects mutating cookie requests without X-Requested-With', async () => {
    const request = new Request('https://spa.test/api/v1/users', {
      method: 'POST',
      headers: { Cookie: `${COOKIE_NAME}=abc` },
      body: '{}',
    })
    const res = await proxyToMonolith(request, 'https://api.example')
    expect(res.status).toBe(403)
    const json = await res.json() as { message: string }
    expect(json.message).toBe('Missing request header.')
  })

  it('does not CSRF-block when the header is present (fetch may 502)', async () => {
    const request = new Request('https://spa.test/api/v1/users', {
      method: 'POST',
      headers: {
        Cookie: `${COOKIE_NAME}=abc`,
        [CSRF_HEADER]: CSRF_VALUE,
        'content-type': 'application/json',
      },
      body: '{}',
    })
    const res = await proxyToMonolith(request, 'https://invalid.invalid')
    expect(res.status).toBe(502)
  })
})

describe('envelope', () => {
  it('stamps security headers', async () => {
    const res = envelope(503, 'SPA API origin is not configured.')
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
  })
})
