const API_PREFIX = '/api/v1'

const FORWARD_REQUEST = ['authorization', 'content-type', 'accept', 'accept-language'] as const
const FORWARD_RESPONSE = ['content-type', 'content-disposition', 'cache-control'] as const

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

async function proxyToMonolith(request: Request, origin: string): Promise<Response> {
	const incoming = new URL(request.url)
	const upstream = new URL(incoming.pathname + incoming.search, `${origin}/`)

	const headers = copyHeaders(request.headers, FORWARD_REQUEST)
	const clientIp = request.headers.get('CF-Connecting-IP') ?? request.headers.get('X-Forwarded-For')
	if (clientIp) {
		headers.set('X-Forwarded-For', clientIp)
	}
	headers.set('X-Forwarded-Proto', incoming.protocol.replace(':', ''))

	const method = request.method.toUpperCase()
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

	const out = copyHeaders(upstreamRes.headers, FORWARD_RESPONSE)
	return new Response(upstreamRes.body, {
		status: upstreamRes.status,
		statusText: upstreamRes.statusText,
		headers: out,
	})
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
