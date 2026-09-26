# API client (`src/api/`)

The only HTTP layer. Views/composables never call `fetch` directly against the API — they use `client.ts` helpers (`get`/`post`/`put`/`patch`/`del`/`getBlob`/`batch`) or domain composables built on them. `src/api/netRetry.ts` is the shared retry policy beneath them.

## Request conventions

- URL resolution: `apiUrl(uri)` in `baseUrl.ts` joins `VITE_API_BASE_URL`; `isCrossOrigin()` decides credentials mode (`include` cross-site, `same-origin` local dev). Array query values serialize as **repeated params** (`apiUrl('lookups/roles', { 'ids[]': ids })` → `ids[]=a&ids[]=b`) — pass the array, never a pre-joined comma string (Laravel's `ids.* => uuid` rejects the latter with 422). `null`/`undefined` values are skipped, including inside arrays.
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

Cross-origin mutation gets 419 → `refreshCsrfOnce()` → retry the original request. Up to **two** refresh+retry rounds (not one): `refreshCsrfOnce()` is single-flighted per tab only, so a peer tab can rotate the shared `spa_csrf` cookie again between our mint and our retry. Auth-session paths are excluded (a 419 there is not a stale nonce).

`refreshCsrfOnce()` ([csrf.ts](../src/api/csrf.ts)) is single-flighted across callers: N concurrent 419s (e.g. the channel-auth burst when Echo connects) share ONE nonce mint. Plain per-caller `refreshCsrf()` would rotate the shared `spa_csrf` cookie again and strand the other callers' in-flight retries on a nonce that no longer matches the cookie — repeat 419, hard failure.

## Cross-tab cookie-race retry

Chromium reports a cross-tab `Set-Cookie` collision on the shared `__Host-spa_csrf` cookie as `TypeError: Failed to fetch` — indistinguishable from a CORS error, so a peer tab rotating the nonce surfaces as a random "CORS error" on an arbitrary endpoint. `whenCsrfCookieQuiet()` covers nonce fetches *this* tab started plus a `CSRF_COOKIE_SETTLE_MS` (100 ms) window after the last successful mint, so recovery is a retry after the write settles.

`whenCsrfCookieQuiet()` is also the **prevention** path: `authorizeBroadcastChannel()` awaits it before `POST broadcasting/auth`, and `AppNavbar` awaits it before `initEcho()`. Echo authorizes channels at times nothing else controls (connect, reconnect, late subscribe), so without the gate the very first authorize can overlap the nonce write from `POST /batch` and fail before any retry policy applies.

One policy, one implementation: `src/api/netRetry.ts` (`withCookieRaceRetry`, `isTransientFetchError`, `COOKIE_RACE_BACKOFF_MS = [50, 150, 400, 800]`). Consumers:

| Consumer | Retry gate |
|----------|-----------|
| `client.ts` GET/HEAD, `getBlob`, `POST batch`, `POST broadcasting/auth` | ungated (server-side read-only — a retry cannot double-submit) |
| `client.ts` other mutations (`PUT`/`PATCH`/`DELETE`, other `POST`) | session-settle window only (Chromium may already have transmitted the aborted request; replaying a real write would apply it twice) |
| `csrf.ts` `fetchNonce` | ungated |
| `useShellHydrate.ts` | ungated for a transient `TypeError`, settle window for anything else |

`fetchNonce()` must **not** pass `beforeAttempt: whenCsrfCookieQuiet`: `ensureCsrf()` assigns `pendingFetch` before `fetchNonce` runs, so the quiet gate would await itself and deadlock.

## 401 handling

- `skipAuthRefresh` paths (`auth/refresh`, `auth/logout`, `auth/me`, `navigation/menus`) never trigger refresh — an `auth/me` 401 means "no session", not "expired JWT".
- Settle window (5 s after `markSessionIssued()`): 401 retries the original URI with backoff (`SESSION_SETTLE_BACKOFF_MS` = 50/150/400 ms) — never `POST /auth/refresh`, never `clearAuth()`.
- Outside the window: single-flight `refreshHandler()` (`ensureRefresh` dedupes concurrent callers); on success retry once, on failure `unauthorizedHandler()` + localized `sessionExpired` error.
- Transient network errors (`TypeError: Failed to fetch` etc.) retry with backoff regardless of the window for read-only requests, and inside the window for mutations — see [Cross-tab cookie-race retry](#cross-tab-cookie-race-retry). A cookie-settle race looks like CORS to the browser.

## Batch hydration

`batch(requests)` fans read-only GET/HEAD calls into `POST batch` (server cap 10 per call — `MAX_BATCH_REQUESTS` mirrors `BatchController::MAX_REQUESTS`). Larger fan-outs split into sequential chunks and re-join positionally. Each entry returns `{ status, body }` where `body` keeps its own full API envelope; the outer response is always 200 — callers must inspect per-entry `status`. `bodyOf()` / `dataOf()` unwrap only a 200 success envelope and return `null` for anything else. That is silent **for a caller that uses them alone**: a rejected sub-request (malformed query → 422) pre-selects nothing instead of erroring. `bodyOfOrThrow()` is the alternative — it throws `TerminalBatchError` on 401/403/429 so callers know not to retry standalone (a 401 would trip the global force-logout). Hydrates that must not confuse "rejected" with "no value" pair `bodyOfOrThrow()` with their own record of the failed key, which also catches the non-terminal non-200s (422/500/504) that `bodyOfOrThrow()` still degrades to `null`: `useNavigationHydrate` keeps a `failedLookups` list for the menu-edit lookups, and `MenuEditView` then skips pruning and warns the admin — [ui-patterns.md](ui-patterns.md#select2-values-must-survive-a-failed-hydrate). Backend contract: `monolith/docs/platform/api-envelope.md#batch`. Which views hydrate through batch: `monolith/docs/integration/vue-workers-spa.md#invocation-budget-controls`.

## Blob downloads

`getBlob(uri)` for CSV/file downloads: same cookie session + settle/401 semantics as `get()`, parses `Content-Disposition` (`filename*=` UTF-8 first). Views combine with `src/utils/download.ts`.

Cross-origin, the header only reaches JS because the API exposes it — `config/cors.php` `exposed_headers` includes `Content-Disposition`. Without that the browser hides it, `filenameFromDisposition()` returns `null`, and callers fall back to a generic name (`useInvoices.ts` → `invoices.csv`). Backend side: `monolith/docs/platform/security.md#cors`.

## Echo broadcast auth

The Echo authorizer goes through `client.post('broadcasting/auth')` (not a private `fetch`) so it inherits CSRF/419 retry. `AppNavbar` awaits `hydrateShell()` **and** `whenCsrfCookieQuiet()` before `initEcho()`, and `authorizeBroadcastChannel()` awaits the same gate before each POST. Details: [auth-session.md](auth-session.md) + `monolith/docs/integration/vue-workers-spa.md#auth`.

`broadcasting/auth` is on the read-only POST allowlist, so its transient (cross-tab cookie-race) `TypeError` retries unconditionally — Echo authorizes channels at unpredictable times, usually outside the 5 s settle window. No local retry wrapper exists in `useEcho.ts`; the policy lives in `client.ts` + [netRetry.ts](../src/api/netRetry.ts).

Authorizers are **serialized** in `useEcho.ts` (a promise queue — at most one `broadcasting/auth` in flight per socket). pusher-js fires one authorize per channel in parallel; on connect after init that is a ~15-request burst. Parallel 419s would rotate the CSRF cookie against in-flight retries (surfacing in Chrome as a CORS TypeError on the overlapping cookie write) and pressure the API rate limiter; the queue turns the burst into an ordered sequence (~10-50 ms each). Backend side: a dedicated `throttle:broadcast` limiter (120/min per user) on `api/v1/broadcasting/auth`.

### Endpoint must resolve to `/api/v1`

`resolveApiUrl('broadcasting/auth')` appends to `apiOrigin()`, so `apiOrigin()` guarantees a `/api/v1` suffix (appending it, and `console.warn`-ing in DEV when `VITE_API_BASE_URL` omitted it). Without that guarantee the request lands on the backend's **web twin** `POST /broadcasting/auth` — CSRF-guarded, and until `config/cors.php` listed it, answered 403 with no `Access-Control-*` header, i.e. an opaque browser "CORS error" that looked like a broken allowlist. Guard: `tests/baseUrl.test.ts`; backend invariant: `tests/Feature/Http/CorsBroadcastAuthTest.php`.

### Channel lifecycle goes through the registry

Never call `echo.private()` / `echo.leave()` / `subscribeWhenEchoReady()` in a composable. Use `src/composables/echo/channelRegistry.ts` (or the declarative `createRealtimeChannel` / `createKeyedRealtimeChannel` in `src/composables/echo/realtimeChannel.ts`), which ref-counts **per channel name**, always defers the attach until Echo exists, and leaves only when the last holder releases. Shared channels (`navigation.menus`, `ai.connections`, `vtual.claims`, `App.Models.User.{id}`) and dynamic names (`settings.{group}`, `archivd.workspace.{id}`, `payments.invoice.{id}`, `vtual.claim.{id}`) are the two bug classes this removes — a second consumer leaving the channel out from under the first, and a dynamic name whose previous value was never left. `ai.connections` carries `.ai.connection.changed`; `vtual.claims` is the staff queue ping (`CreatorClaimStaffChanged`, ids + action + status only) and must stay separate from the owner-only `vtual.claim.{id}` payload, which includes the bio token. `tests/echoConventions.test.ts` fails the build if the raw APIs reappear outside the registry.

## Tests

`tests/client.test.ts`, `tests/csrf.test.ts`, `tests/netRetry.test.ts`, `tests/requestHeaders.test.ts`, `tests/baseUrl.test.ts` lock this behavior — extend them when changing the client (see [testing.md](testing.md)).
