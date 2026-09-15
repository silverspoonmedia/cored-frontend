# Auth & session lifecycle

How the SPA keeps a logged-in session without ever exposing the JWT to JavaScript. Backend-side minting/blacklist behavior: `monolith/docs/domains/identity/README.md`. Contract: `monolith/docs/integration/vue-workers-spa.md#cross-tab-auth-multi-tab-session-sync` (implementation details in this file).

## Core invariants

- **Never store JWTs in JavaScript.** The session token lives in the HttpOnly `__Host-spa_jwt` cookie on the API origin (`SameSite=None; Secure`). The API strips `data.token` from login/register/refresh/2FA JSON responses. Leftover `mw_auth` keys are cleared on hydrate.
- Mutations carry a double-submit CSRF nonce: `__Host-spa_csrf` cookie + `X-CSRF-Token` header ([api-client.md](api-client.md)).

## Cold boot / hydrate

1. `beforeEach` guard runs `hydrateShell()` once per cold boot (`useShellHydrate.ts`).
2. Guest cold boot is a **single** `GET auth/me`; the guard does not `fetchMe()` again on that same navigation (prevents double 401 before the login redirect).
3. Re-probe with `fetchMe()` only on a later `requiresAuth` navigation where in-memory `user` is still null (e.g. cookie set by another tab).
4. Each tab learns `user` from the cookie probe, never from `localStorage`.

## Post-login cookie settle

After successful login / register / 2FA verify:

1. `applyAuth()` → `markSessionIssued()` opens a short settle window in `client.ts`: a 401 **or** fetch `TypeError` in that window retries the original URI with backoff and waits for any CSRF `Set-Cookie` (`whenCsrfCookieQuiet`) — never `POST /auth/refresh` and never `clearAuth()`.
2. `refreshCsrf()` mints a fresh nonce now that `__Host-spa_jwt` is in the jar.
3. `confirmSession()` (`GET auth/me`, retry once) must succeed **before** navigating. A failed confirm does not navigate.

The settle window is **not** the only trigger for the `TypeError` retry. A peer tab rotating the shared `__Host-spa_csrf` cookie aborts an in-flight request at any time and Chromium reports that as `TypeError: Failed to fetch` (which the user sees as a CORS error). Read-only requests therefore retry unconditionally; mutations keep the settle-window gate because a replayed write could be applied twice. Full policy: [api-client.md — Cross-tab cookie-race retry](api-client.md#cross-tab-cookie-race-retry).

Auth-session POSTs (`login` / `register` / `refresh` / `logout` / forgot-reset / 2FA login) skip `ensureCsrf()` — the server skips CSRF there, and pre-fetching a nonce before the JWT exists creates a duplicate `__Host-spa_csrf` that races the first authenticated `POST /batch` and `POST /broadcasting/auth`.

Canonical chrome order after navigate: one `POST /batch` (Navbar starts / Layout joins) → seed stores → fallback GET only if unseeded **and** not terminal → **then** Echo. `AppLayout` must not `GET navigation/menus` or start nav realtime in parallel with that batch. `AppNavbar` also awaits `whenCsrfCookieQuiet()` right before `initEcho()`, because pusher-js authorizes every subscribed channel on connect — overlapping the nonce write would fail the first authorize before any retry policy applies.

Private channels are owned by `src/composables/echo/channelRegistry.ts`: acquire through `acquireChannel()` (or the declarative `createRealtimeChannel` / `createKeyedRealtimeChannel`), never `echo.private()` directly. Ref-counting is per channel name, so the bell and auth-self can share `App.Models.User.{id}` without either leaving it for the other. Detail: [api-client.md — Channel lifecycle goes through the registry](api-client.md#channel-lifecycle-goes-through-the-registry).

A guest 401 is not session death: `unauthorizedHandler` only `clearAuth()` when in-memory `user` was set **and** the session is not settling. `GET auth/me` and `GET navigation/menus` 401s never trigger refresh.

## Cross-tab sync

- `BroadcastChannel('monolith-auth')` coordinates refresh: only one tab performs `POST auth/refresh`; others wait for `refresh-done` (prevents the blacklist race where two refreshes invalidate each other). Messages: `refresh-request`, `refresh-response`, `refresh-done`, `logout` — **none carry the JWT**.
- CSRF nonce has the same shared-cookie/per-tab-memory split and its own channel: `BroadcastChannel('monolith-csrf')` broadcasts each fresh nonce; all consumers read through `src/api/csrf.ts` so every tab stays on the same nonce.
- The 419-retry path uses `refreshCsrfOnce()` — single-flighted across concurrent callers (one nonce mint per 419 burst), so a burst of parallel mutations (Echo channel auth after connect) cannot rotate the shared cookie against each other's retries. Detail: [api-client.md](api-client.md#419-csrf-mismatch).
- A peer tab's rotation can still abort an in-flight request (the browser hides it as a CORS error); every credentialed request recovers through the shared retry policy in [netRetry.ts](../src/api/netRetry.ts). Detail: [api-client.md](api-client.md#cross-tab-cookie-race-retry).

## Logout (barrier + epoch)

`clearAuth()`:

1. Sets a **persistent logout barrier** before the API call, so a delayed hydrate/refresh/shell-batch response cannot restore access after logout.
2. Broadcasts token-free `{ type: 'logout', epoch }`; `localStorage` emits the same epoch as a `storage`-event fallback when `BroadcastChannel` is unavailable.
3. Receiver tabs preserve the barrier, advance the session epoch, null reactive `user`, cancel refresh waiters/timers, reset CSRF/shell/menu/notification state, revoke the current `requiresAuth` route to `login.view`, and never rebroadcast.
4. Every teardown runs `resetShellHydration()` + `resetRouterHydration()` so a new login cold-boots instead of reusing stale `hydrated` state.

Only `applyAuth()` (successful login / registration / 2FA session) clears the barrier. SPA sends `POST auth/logout` direct to Laravel; Laravel blacklists the JWT and expires the cookie. The Worker never receives or expires the cookie. Logout is idempotent — local teardown completes even if the request fails.

Backend `remember` preservation across refresh (`rm` claim via `jwt.persistent_claims`): `monolith/docs/domains/identity/README.md#remember-flag-preservation-across-refresh`.

## Related

- [api-client.md](api-client.md) — `client.ts` CSRF/419/cookie-race mechanics
- [worker.md](worker.md) — why no auth logic lives in the Worker
- Tests: [testing.md](testing.md) (`client.test.ts`, `csrf.test.ts`, `netRetry.test.ts`, `shellHydrate.test.ts`, `authCrossTabLogout.test.ts`)
