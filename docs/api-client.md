# API client (`src/api/`)

The only HTTP layer. Views/composables never call `fetch` directly against the API — they use `client.ts` helpers (`get`/`post`/`put`/`patch`/`del`/`getBlob`/`batch`) or domain composables built on them.

## Request conventions

- URL resolution: `apiUrl(uri)` in `baseUrl.ts` joins `VITE_API_BASE_URL`; `isCrossOrigin()` decides credentials mode (`include` cross-site, `same-origin` local dev).
- Headers on every request: `Accept: application/json`, `X-Requested-With: XMLHttpRequest`, `X-SPA-Origin: 1`, `X-SPA-Locale: <backend locale code>` (`requestHeaders.ts` — `zh-CN` maps to `zh_CN` via `backendLocale()`).
- Cross-origin mutations (`POST`/`PUT`/`PATCH`/`DELETE`) attach the double-submit `X-CSRF-Token` header and call `ensureCsrf()` first. **Auth-session paths** (`auth/login`, `auth/register`, `auth/refresh`, `auth/logout`, `auth/forgot-password`, `auth/reset-password`, `auth/two-factor/login`) skip the nonce fetch — the server skips CSRF there and pre-minting a nonce races the first authenticated batch (see [auth-session.md](auth-session.md)).
- `FormData` bodies skip the JSON `Content-Type` (browser sets the multipart boundary).

## Error normalization

Non-2xx → `ApiError` (`src/api/types.ts`):

| Server body | ApiError shape |
|-------------|----------------|
| Laravel validation body (`{ message, errors }`) | `message` + `errors` bag preserved (422) |
| Canonical envelope (`{ status, message }`) | envelope `message` |
| Anything else | `message` field if string, else localized fallback |

Fallback messages go through `translateFallback(i18n.global.t, key)` from `src/i18n/fallbacks.ts` — never hardcoded English. Server messages remain preferred when present. Envelope contract: `monolith/docs/platform/api-envelope.md`.

## 419 (CSRF mismatch)

Cross-origin mutation gets 419 → `refreshCsrfOnce()` → retry the original request. Only one retry; auth-session paths are excluded (a 419 there is not a stale nonce).

`refreshCsrfOnce()` ([csrf.ts](../src/api/csrf.ts)) is single-flighted across callers: N concurrent 419s (e.g. the channel-auth burst when Echo connects) share ONE nonce mint. Plain per-caller `refreshCsrf()` would rotate the shared `spa_csrf` cookie again and strand the other callers' in-flight retries on a nonce that no longer matches the cookie — repeat 419, hard failure.

## 401 handling

- `skipAuthRefresh` paths (`auth/refresh`, `auth/logout`, `auth/me`, `navigation/menus`) never trigger refresh — an `auth/me` 401 means "no session", not "expired JWT".
- Settle window (5 s after `markSessionIssued()`): 401 retries the original URI with backoff (`SESSION_SETTLE_BACKOFF_MS` = 50/150/400 ms) — never `POST /auth/refresh`, never `clearAuth()`.
- Outside the window: single-flight `refreshHandler()` (`ensureRefresh` dedupes concurrent callers); on success retry once, on failure `unauthorizedHandler()` + localized `sessionExpired` error.
- Transient network errors (`TypeError: Failed to fetch` etc.) during the settle window also retry with backoff — a cookie-settle race looks like CORS to the browser.

## Batch hydration

`batch(requests)` fans read-only GET/HEAD calls into `POST batch` (server cap 10 per call — `MAX_BATCH_REQUESTS` mirrors `BatchController::MAX_REQUESTS`). Larger fan-outs split into sequential chunks and re-join positionally. Each entry returns `{ status, body }` where `body` keeps its own full API envelope; the outer response is always 200 — callers must inspect per-entry `status`. Backend contract: `monolith/docs/platform/api-envelope.md#batch`. Which views hydrate through batch: `monolith/docs/integration/vue-workers-spa.md#invocation-budget-controls`.

## Blob downloads

`getBlob(uri)` for CSV/file downloads: same cookie session + settle/401 semantics as `get()`, parses `Content-Disposition` (`filename*=` UTF-8 first). Views combine with `src/utils/download.ts`.

## Echo broadcast auth

The Echo authorizer goes through `client.post('broadcasting/auth')` (not a private `fetch`) so it inherits CSRF/419 retry. `AppNavbar` awaits `hydrateShell()` before `initEcho()`. Details: [auth-session.md](auth-session.md) + `monolith/docs/integration/vue-workers-spa.md#auth`.

Authorizers are **serialized** in `useEcho.ts` (a promise queue — at most one `broadcasting/auth` in flight per socket). pusher-js fires one authorize per channel in parallel; on connect after init that is a ~15-request burst. Parallel 419s would rotate the CSRF cookie against in-flight retries (surfacing in Chrome as a CORS TypeError on the overlapping cookie write) and pressure the API rate limiter; the queue turns the burst into an ordered sequence (~10-50 ms each). Backend side: a dedicated `throttle:broadcast` limiter (120/min per user) on `api/v1/broadcasting/auth`.

## Tests

`tests/client.test.ts`, `tests/csrf.test.ts`, `tests/requestHeaders.test.ts`, `tests/baseUrl.test.ts` lock this behavior — extend them when changing the client (see [testing.md](testing.md)).
