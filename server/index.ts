const API_PREFIX = '/api/v1'
const COOKIE_NAME = 'spa_jwt'
const CSRF_HEADER = 'X-Requested-With'
const CSRF_VALUE = 'XMLHttpRequest'

const TOKEN_ISSUE_PATHS = new Set([
	`${API_PREFIX}/auth/login`,
	`${API_PREFIX}/auth/register`,
	`${API_PREFIX}/auth/refresh`,
	`${API_PREFIX}/auth/two-factor/login`,
])

const FORWARD_REQUEST = ['authorization', 'content-type', 'accept', 'accept-language'] as const
const FORWARD_RESPONSE = ['content-type', 'content-disposition', 'cache-control'] as const

// Reference-data GET responses are shared across users only when they carry no
// session. Authed requests stay private so a cached admin payload never leaks.
const CACHEABLE_GET_EXACT = new Map<string, string>([
	[`${API_PREFIX}/navigation/menus`, 'private, max-age=60'],
	[`${API_PREFIX}/services/options`, 'private, max-age=60'],
])
const CACHEABLE_GET_PREFIX: ReadonlyArray<readonly [string, string]> = [
	[`${API_PREFIX}/currencies`, 'private, max-age=300'],
]

function cacheControlFor(method: string, pathname: string, authed: boolean): string | null {
	if (method !== 'GET') {
		return null
	}
	const directive = CACHEABLE_GET_EXACT.get(pathname)
		?? CACHEABLE_GET_PREFIX.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))?.[1]
		?? null
	if (directive === null) {
		return null
	}
	return authed ? directive : directive.replace('private', 'public')
}

function envelope(status: number, message: string): Response {
	return Response.json({ status: 'error', message }, { status })
}

function pathAllowed(pathname: string): boolean {
	let decoded = pathname
	try {
		decoded = decodeURIComponent(pathname)
	} catch {
		return false
	}

	if (decoded.includes('..') || decoded.includes('\\')) {
		return false
	}

	return decoded === API_PREFIX || decoded.startsWith(`${API_PREFIX}/`)
}

function copyHeaders(source: Headers, names: readonly string[]): Headers {
	const headers = new Headers()
	for (const name of names) {
		const value = source.get(name)
		if (value !== null && value !== '') {
			headers.set(name, value)
		}
	}
	return headers
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readSpaJwt(cookieHeader: string | null): string | null {
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

function cookieFlags(request: Request): string {
	const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : ''
	return `Path=/; HttpOnly; SameSite=Strict${secure}`
}

function mintCookie(request: Request, token: string, maxAge: number | null): string {
	const age = maxAge !== null ? `; Max-Age=${maxAge}` : ''
	return `${COOKIE_NAME}=${encodeURIComponent(token)}; ${cookieFlags(request)}${age}`
}

function expireCookie(request: Request): string {
	return `${COOKIE_NAME}=; ${cookieFlags(request)}; Max-Age=0`
}

function isMutating(method: string): boolean {
	return method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE'
}

async function attachSession(
	request: Request,
	upstreamRes: Response,
	pathname: string,
	method: string,
	spaJwt: string | null,
): Promise<Response> {
	const isLogout = method === 'POST' && pathname === `${API_PREFIX}/auth/logout`
	const isIssue = method === 'POST' && TOKEN_ISSUE_PATHS.has(pathname)
	const contentType = upstreamRes.headers.get('content-type') ?? ''

	if (!isLogout && !isIssue) {
		const out = copyHeaders(upstreamRes.headers, FORWARD_RESPONSE)
		if (upstreamRes.ok) {
			const cacheable = cacheControlFor(method, pathname, spaJwt !== null && spaJwt !== '')
			if (cacheable !== null && !out.has('set-cookie')) {
				out.set('cache-control', cacheable)
			}
		}
		return new Response(upstreamRes.body, {
			status: upstreamRes.status,
			statusText: upstreamRes.statusText,
			headers: out,
		})
	}

	if (!contentType.toLowerCase().includes('application/json')) {
		const out = copyHeaders(upstreamRes.headers, FORWARD_RESPONSE)
		if (isLogout) {
			out.append('Set-Cookie', expireCookie(request))
		}
		return new Response(upstreamRes.body, {
			status: upstreamRes.status,
			statusText: upstreamRes.statusText,
			headers: out,
		})
	}

	let json: unknown
	try {
		json = await upstreamRes.json()
	} catch {
		const out = copyHeaders(upstreamRes.headers, FORWARD_RESPONSE)
		if (isLogout) {
			out.append('Set-Cookie', expireCookie(request))
		}
		return new Response(null, {
			status: upstreamRes.status,
			statusText: upstreamRes.statusText,
			headers: out,
		})
	}

	const out = copyHeaders(upstreamRes.headers, FORWARD_RESPONSE)
	out.set('content-type', 'application/json')

	if (isLogout) {
		out.append('Set-Cookie', expireCookie(request))
	} else if (isRecord(json) && isRecord(json.data)) {
		const data = json.data
		const token = data.token
		const tokenType = data.token_type
		if (typeof token === 'string' && token !== '' && typeof tokenType === 'string' && tokenType !== '') {
			const rawAge = data.expires_in
			const maxAge = typeof rawAge === 'number' && Number.isFinite(rawAge) && rawAge > 0
				? Math.floor(rawAge)
				: null
			delete data.token
			out.append('Set-Cookie', mintCookie(request, token, maxAge))
		}
	}

	return new Response(JSON.stringify(json), {
		status: upstreamRes.status,
		statusText: upstreamRes.statusText,
		headers: out,
	})
}

async function proxyToMonolith(request: Request, origin: string): Promise<Response> {
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

	// Marks the request as brokered by this BFF so Monolith can audit the
	// direct hits that bypass the Worker. Not an auth control by itself.
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

export default {
	async fetch(request, env) {
		const url = new URL(request.url)

		if (!pathAllowed(url.pathname)) {
			if (url.pathname.startsWith('/api/')) {
				return envelope(404, 'Not found.')
			}
			return new Response(null, { status: 404 })
		}

		const origin = (env.MONOLITH_API_ORIGIN ?? '').trim().replace(/\/+$/, '')
		if (origin === '') {
			return envelope(503, 'SPA API origin is not configured.')
		}

		try {
			new URL(origin)
		} catch {
			return envelope(503, 'SPA API origin is not configured.')
		}

		return proxyToMonolith(request, origin)
	},
} satisfies ExportedHandler<Env>
