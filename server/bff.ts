export const API_PREFIX = '/api/v1'
export const COOKIE_NAME = 'spa_jwt'
export const CSRF_HEADER = 'X-Requested-With'
export const CSRF_VALUE = 'XMLHttpRequest'

/**
 * The Worker BFF now brokers ONLY the auth session endpoints. Laravel mints the
 * cross-site HttpOnly `__Host-spa_jwt` cookie itself; the Worker's remaining
 * jobs are the security boundary the browser cannot provide:
 *   1. strip the raw JWT from the login/refresh JSON body so it never reaches JS,
 *   2. forward Laravel's `Set-Cookie` to the browser,
 *   3. keep the first-party CSRF gate on cookie-bearing mutations,
 *   4. expire the session cookie on logout.
 * Everything else (all data traffic) bypasses the Worker entirely.
 */
const TOKEN_ISSUE_PATHS = new Set([
	`${API_PREFIX}/auth/login`,
	`${API_PREFIX}/auth/register`,
	`${API_PREFIX}/auth/refresh`,
	`${API_PREFIX}/auth/two-factor/login`,
])

const LOGOUT_PATH = `${API_PREFIX}/auth/logout`

const FORWARD_REQUEST = ['authorization', 'content-type', 'accept', 'accept-language', 'x-csrf-token'] as const
const FORWARD_RESPONSE = ['content-type', 'cache-control'] as const

const SECURITY_HEADERS: ReadonlyArray<readonly [string, string]> = [
	['X-Content-Type-Options', 'nosniff'],
	['Referrer-Policy', 'strict-origin-when-cross-origin'],
	['Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=(), usb=()'],
]

export function applySecurityHeaders(headers: Headers): void {
	for (const [name, value] of SECURITY_HEADERS) {
		if (!headers.has(name)) {
			headers.set(name, value)
		}
	}
}

export function envelope(status: number, message: string): Response {
	const headers = new Headers({ 'content-type': 'application/json' })
	applySecurityHeaders(headers)
	return new Response(JSON.stringify({ status: 'error', message }), { status, headers })
}

/** Only the auth session endpoints are proxied; nothing else reaches the Worker. */
export function pathAllowed(pathname: string): boolean {
	let decoded = pathname
	try {
		decoded = decodeURIComponent(pathname)
	} catch {
		return false
	}

	if (decoded.includes('..') || decoded.includes('\\')) {
		return false
	}

	return TOKEN_ISSUE_PATHS.has(decoded) || decoded === LOGOUT_PATH
}

export function copyHeaders(source: Headers, names: readonly string[]): Headers {
	const headers = new Headers()
	for (const name of names) {
		const value = source.get(name)
		if (value !== null && value !== '') {
			headers.set(name, value)
		}
	}
	return headers
}

export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function readSpaJwt(cookieHeader: string | null): string | null {
	if (!cookieHeader) {
		return null
	}

	for (const part of cookieHeader.split(';')) {
		const idx = part.indexOf('=')
		if (idx === -1) {
			continue
		}
		const name = part.slice(0, idx).trim()
		if (name !== COOKIE_NAME) {
			continue
		}
		try {
			return decodeURIComponent(part.slice(idx + 1).trim())
		} catch {
			return part.slice(idx + 1).trim()
		}
	}

	return null
}

export function cookieFlags(request: Request): string {
	const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : ''
	return `Path=/; HttpOnly; SameSite=Strict${secure}`
}

export function mintCookie(request: Request, token: string, maxAge: number | null): string {
	const age = maxAge !== null ? `; Max-Age=${maxAge}` : ''
	return `${COOKIE_NAME}=${encodeURIComponent(token)}; ${cookieFlags(request)}${age}`
}

export function expireCookie(request: Request): string {
	return `${COOKIE_NAME}=; ${cookieFlags(request)}; Max-Age=0`
}

export function isMutating(method: string): boolean {
	return method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE'
}

function finalize(status: number, statusText: string, body: BodyInit | null, headers: Headers): Response {
	applySecurityHeaders(headers)
	return new Response(body, { status, statusText, headers })
}

/** Forward every upstream Set-Cookie (the __Host-spa_jwt mint/expire) to the browser. */
function forwardSetCookies(upstreamRes: Response, out: Headers): void {
	const getSetCookie = (upstreamRes.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie
	const values = typeof getSetCookie === 'function'
		? getSetCookie.call(upstreamRes.headers)
		: []
	if (values.length === 0) {
		const single = upstreamRes.headers.get('set-cookie')
		if (single) {
			out.append('Set-Cookie', single)
		}
		return
	}
	for (const value of values) {
		out.append('Set-Cookie', value)
	}
}

export async function attachSession(
	request: Request,
	upstreamRes: Response,
	pathname: string,
	method: string,
	spaJwt: string | null,
): Promise<Response> {
	const isLogout = method === 'POST' && pathname === LOGOUT_PATH
	const isIssue = method === 'POST' && TOKEN_ISSUE_PATHS.has(pathname)
	const contentType = upstreamRes.headers.get('content-type') ?? ''

	const out = copyHeaders(upstreamRes.headers, FORWARD_RESPONSE)
	forwardSetCookies(upstreamRes, out)

	if (isLogout) {
		out.append('Set-Cookie', expireCookie(request))
		return finalize(upstreamRes.status, upstreamRes.statusText, upstreamRes.body, out)
	}

	if (!isIssue || !contentType.toLowerCase().includes('application/json')) {
		return finalize(upstreamRes.status, upstreamRes.statusText, upstreamRes.body, out)
	}

	let json: unknown
	try {
		json = await upstreamRes.json()
	} catch {
		return finalize(upstreamRes.status, upstreamRes.statusText, null, out)
	}

	out.set('content-type', 'application/json')

	if (isRecord(json) && isRecord(json.data)) {
		const data = json.data
		const token = data.token
		const tokenType = data.token_type
		if (typeof token === 'string' && token !== '' && typeof tokenType === 'string' && tokenType !== '') {
			const rawAge = data.expires_in
			const maxAge = typeof rawAge === 'number' && Number.isFinite(rawAge) && rawAge > 0
				? Math.floor(rawAge)
				: null
			// Keep the raw JWT out of the browser JS runtime.
			delete data.token
			out.append('Set-Cookie', mintCookie(request, token, maxAge))
		}
	}

	return finalize(upstreamRes.status, upstreamRes.statusText, JSON.stringify(json), out)
}

export async function proxyToMonolith(request: Request, origin: string): Promise<Response> {
	const incoming = new URL(request.url)
	const method = request.method.toUpperCase()
	const spaJwt = readSpaJwt(request.headers.get('Cookie'))

	if (isMutating(method) && spaJwt !== null && spaJwt !== '') {
		if (request.headers.get(CSRF_HEADER) !== CSRF_VALUE) {
			return envelope(403, 'Missing request header.')
		}
	}

	const upstream = new URL(incoming.pathname + incoming.search, `${origin}/`)
	const headers = copyHeaders(request.headers, FORWARD_REQUEST)
	if (!headers.has('authorization') && spaJwt) {
		headers.set('authorization', `Bearer ${spaJwt}`)
	}

	const clientIp = request.headers.get('CF-Connecting-IP') ?? request.headers.get('X-Forwarded-For')
	if (clientIp) {
		headers.set('X-Forwarded-For', clientIp)
	}
	headers.set('X-Forwarded-Proto', incoming.protocol.replace(':', ''))

	// Marks the request as brokered by this BFF for observability (audit-only on
	// the Monolith side; not an auth control).
	headers.set('X-SPA-Origin', '1')
	if (clientIp) {
		headers.set('X-SPA-Client-IP', clientIp)
	}

	const init: RequestInit = {
		method,
		headers,
		redirect: 'follow',
	}
	if (method !== 'GET' && method !== 'HEAD' && request.body !== null) {
		init.body = request.body
		Object.assign(init, { duplex: 'half' })
	}

	let upstreamRes: Response
	try {
		upstreamRes = await fetch(upstream, init)
	} catch {
		return envelope(502, 'Upstream API is unreachable.')
	}

	return attachSession(request, upstreamRes, incoming.pathname, method, spaJwt)
}
