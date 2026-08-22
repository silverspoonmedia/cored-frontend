/**
 * The Worker no longer brokers any request. Auth and data traffic both go
 * direct from the browser to the Laravel API origin (cross-site HttpOnly cookie
 * + CSRF nonce), so `assets.run_worker_first` is empty and this handler is
 * effectively unreachable for normal traffic. It remains only as a guard: any
 * stray `/api/*` hit on this origin gets a clear JSON 404 instead of the SPA
 * fallback HTML.
 */
const WORKER_SECURITY_HEADERS = {
	'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
	'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=(), usb=()',
	'Referrer-Policy': 'no-referrer',
	'X-Content-Type-Options': 'nosniff',
	'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
	'X-Frame-Options': 'DENY',
}

function workerResponse(body: BodyInit | null, init: ResponseInit = {}): Response {
	const headers = new Headers(init.headers)
	for (const [name, value] of Object.entries(WORKER_SECURITY_HEADERS)) {
		headers.set(name, value)
	}
	return new Response(body, { ...init, headers })
}

export default {
	async fetch(request) {
		const url = new URL(request.url)
		if (url.pathname.startsWith('/api/')) {
			return workerResponse(JSON.stringify({ status: 'error', message: 'Not found.' }), {
				status: 404,
				headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
			})
		}
		return workerResponse(null, { status: 404 })
	},
} satisfies ExportedHandler<Env>
