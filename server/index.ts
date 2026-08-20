/**
 * The Worker no longer brokers any request. Auth and data traffic both go
 * direct from the browser to the Laravel API origin (cross-site HttpOnly cookie
 * + CSRF nonce), so `assets.run_worker_first` is empty and this handler is
 * effectively unreachable for normal traffic. It remains only as a guard: any
 * stray `/api/*` hit on this origin gets a clear JSON 404 instead of the SPA
 * fallback HTML.
 */
export default {
	async fetch(request) {
		const url = new URL(request.url)
		if (url.pathname.startsWith('/api/')) {
			return new Response(JSON.stringify({ status: 'error', message: 'Not found.' }), {
				status: 404,
				headers: { 'content-type': 'application/json' },
			})
		}
		return new Response(null, { status: 404 })
	},
} satisfies ExportedHandler<Env>
