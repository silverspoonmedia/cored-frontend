# API client (`src/api/`)

The only HTTP layer. Views and composables never call `fetch` directly against the API — they use `client.ts` helpers (`get`/`post`/`put`/`patch`/`del`/`getBlob`/`batch`) or domain composables built on them. Full invariants: [.cursor/rules/api-client.mdc](../.cursor/rules/api-client.mdc).

| Module | Owns |
|--------|------|
| `client.ts` | Request pipeline: headers, credentials mode, CSRF, 419/401 handling, settle window, retry gating |
| `csrf.ts` | Nonce fetch, cross-tab adoption, single-flight (`refreshCsrfOnce`), cookie-settle gate (`whenCsrfCookieQuiet`) |
| `netRetry.ts` | One retry policy for the cross-tab cookie race (`withCookieRaceRetry`, bounded backoff) |
| `batch.ts` | Read-only fan-in via `POST /batch`, chunking, `bodyOf`/`dataOf`/`bodyOfOrThrow` |
| `baseUrl.ts` | `apiUrl()` / `apiOrigin()` — `/api/v1` suffix guarantee, cross-origin detection |
| `requestHeaders.ts` | `X-SPA-Origin`, `X-SPA-Locale` (backend code mapping) |
| `types.ts` | `ApiError` + payload types mirroring the Laravel Resources (snake_case, no transform layer) |

| Need | Path |
|------|------|
| Backend envelope + error mapping | `cored-backend/docs/platform/api-envelope.md` |
| Batch contract + invocation budget | `cored-backend/docs/integration/vue-workers-spa.md` |
| Response data minimization | `cored-backend/docs/platform/reference-security.md#response-data-minimization-mandatory` |
| Realtime authorizer + channels | `api-client.mdc` · [ui-patterns.md](ui-patterns.md) |
| Tests | [testing.md](testing.md) — `client.test.ts`, `csrf.test.ts`, `netRetry.test.ts`, `baseUrl.test.ts`, `requestHeaders.test.ts` |

## Behavior worth knowing

- Query arrays serialize as repeated params (`{ 'ids[]': ids }`); a pre-joined comma string is rejected 422 by Laravel.
- Non-2xx → `ApiError`; a Laravel validation body keeps its `errors` bag (422), the canonical envelope contributes `message`, and fallbacks come from `src/i18n/fallbacks.ts` (never hardcoded English).
- 419 → `refreshCsrfOnce()` + retry, up to two rounds (a peer tab can rotate the shared nonce again); auth-session paths are excluded.
- A peer tab's `Set-Cookie` on the shared CSRF cookie surfaces as `TypeError: Failed to fetch` — indistinguishable from CORS. Read-only requests and `POST batch` / `POST broadcasting/auth` retry ungated; other mutations only inside the session-settle window.
- `POST /batch` always answers 200: inspect per-entry `status`. `bodyOf()` degrades a rejected entry to `null`; a hydrate that must distinguish "rejected" from "no value" pairs `bodyOfOrThrow()` with its own failed-key record.
- Downloads use `getBlob()`, which parses `Content-Disposition` (`filename*=` first) — cross-origin this works only because Laravel exposes the header.
- Echo authorizers go through `client.post('broadcasting/auth')` and are serialized (one in flight per socket); private channels are acquired through the channel registry, never `echo.private()`.
