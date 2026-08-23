/**
 * Cloudflare Zero Trust (Access) service-token helper for server-to-server
 * calls from this Worker to the Monolith API.
 *
 * OFF BY DEFAULT: when `CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET` are
 * not configured every helper returns without doing anything, so the Worker
 * behaves exactly as before (zero extra invocations, zero billing change).
 *
 * Billing note: the Access token is cached in-memory on the isolate (module
 * scope), NOT in `caches.default`. Enabling Workers Cache would bill every
 * request to this Worker — including the static assets that are currently
 * free. Do not switch this to the Cache API.
 */

export interface CfAccessEnv {
	CF_ACCESS_CLIENT_ID?: string
	CF_ACCESS_CLIENT_SECRET?: string
	/** e.g. https://<team>.cloudflareaccess.com/oauth/token */
	CF_ACCESS_TOKEN_URL?: string
}

let cachedToken: { value: string; expiresAt: number } | null = null
let inflight: Promise<string | null> | null = null

export function cfAccessConfigured(env: CfAccessEnv): boolean {
	return Boolean(env.CF_ACCESS_CLIENT_ID && env.CF_ACCESS_CLIENT_SECRET)
}

/**
 * Exchange the service token for an Access JWT (client_credentials) and cache
 * it on the isolate until just before `exp`. Returns null when unconfigured or
 * when no token URL is set (header-only mode does not need a JWT).
 */
export async function getAccessToken(env: CfAccessEnv): Promise<string | null> {
	if (!cfAccessConfigured(env)) return null
	const tokenUrl = env.CF_ACCESS_TOKEN_URL
	if (!tokenUrl) return null

	const now = Date.now()
	if (cachedToken && cachedToken.expiresAt - 30_000 > now) return cachedToken.value
	if (inflight) return inflight

	inflight = (async () => {
		try {
			const body = new URLSearchParams({
				grant_type: 'client_credentials',
				client_id: env.CF_ACCESS_CLIENT_ID as string,
				client_secret: env.CF_ACCESS_CLIENT_SECRET as string,
			})
			const res = await fetch(tokenUrl, {
				method: 'POST',
				headers: { 'content-type': 'application/x-www-form-urlencoded' },
				body,
			})
			if (!res.ok) return null
			const json = (await res.json()) as { access_token?: string; expires_in?: number }
			if (!json.access_token) return null
			const ttl = typeof json.expires_in === 'number' ? json.expires_in : 3600
			cachedToken = { value: json.access_token, expiresAt: Date.now() + ttl * 1000 }
			return json.access_token
		} catch {
			return null
		} finally {
			inflight = null
		}
	})()

	return inflight
}

/**
 * Fetch `url` with Cloudflare Access service-token credentials attached.
 * Default mode sends the raw `CF-Access-Client-Id`/`Secret` headers, which a
 * Service Auth policy accepts directly (no JWT exchange needed). When
 * `useJwt` is true and a token URL is configured, a cached Access JWT is sent
 * as `Cf-Access-Jwt-Assertion` instead. No-op passthrough when unconfigured.
 */
export async function fetchWithAccess(
	url: string | URL,
	init: RequestInit = {},
	env: CfAccessEnv,
	opts: { useJwt?: boolean } = {},
): Promise<Response> {
	if (!cfAccessConfigured(env)) return fetch(url, init)

	const headers = new Headers(init.headers)
	if (opts.useJwt) {
		const jwt = await getAccessToken(env)
		if (jwt) {
			headers.set('Cf-Access-Jwt-Assertion', jwt)
		} else {
			headers.set('CF-Access-Client-Id', env.CF_ACCESS_CLIENT_ID as string)
			headers.set('CF-Access-Client-Secret', env.CF_ACCESS_CLIENT_SECRET as string)
		}
	} else {
		headers.set('CF-Access-Client-Id', env.CF_ACCESS_CLIENT_ID as string)
		headers.set('CF-Access-Client-Secret', env.CF_ACCESS_CLIENT_SECRET as string)
	}
	return fetch(url, { ...init, headers })
}
