import { envelope, pathAllowed, proxyToMonolith } from './bff'

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
