# Auth & session lifecycle

How the SPA keeps a logged-in session without ever exposing the JWT to JavaScript. Invariants and the full rule set: [.cursor/rules/auth-session.mdc](../.cursor/rules/auth-session.mdc). Backend minting/blacklist behavior: `monolith/docs/domains/identity/README.md`; cross-repo contract: `monolith/docs/integration/vue-workers-spa.md`.

| Need | Path |
|------|------|
| Session mechanics (`client.ts`) | [api-client.md](api-client.md) · `api-client.mdc` |
| Cross-tab cookie race + retry policy | `src/api/netRetry.ts` · `api-client.mdc` |
| Realtime channel lifecycle | `src/composables/echo/channelRegistry.ts` · `api-client.mdc` |
| Backend side | `monolith/docs/domains/identity/README.md` |
| Tests | [testing.md](testing.md) — `client.test.ts`, `csrf.test.ts`, `netRetry.test.ts`, `shellHydrate.test.ts`, `authCrossTabLogout.test.ts` |

## Shape in one screen

- Session token: HttpOnly `__Host-spa_jwt` cookie on the API origin (`SameSite=None; Secure`). The API strips `data.token` from login/register/refresh/2FA bodies; leftover `mw_auth` keys are cleared on hydrate.
- CSRF: `__Host-spa_csrf` cookie + `X-CSRF-Token` header, single-flighted through `src/api/csrf.ts`. Auth-session POSTs skip the nonce.
- Cold boot: one `hydrateShell()` per boot, one guest `GET auth/me`; re-probe only when the cookie may have arrived from another tab.
- Post-login: settle window → `refreshCsrf()` → `confirmSession()` must succeed **before** navigating.
- Cross-tab: `BroadcastChannel('monolith-auth')` elects one tab to refresh (messages carry no JWT); `BroadcastChannel('monolith-csrf')` keeps every tab on one nonce.
- Logout: persistent barrier set before the API call, epoch broadcast, receiver tabs tear down local state and revoke the current protected route; only `applyAuth()` clears the barrier. Logout is idempotent.
- Guest 401 is not session death: `clearAuth()` only when in-memory `user` was set and the session is not settling; `auth/me` and `navigation/menus` 401s never refresh.
- Chrome order after navigate: one `POST /batch` → seed stores → fallback GET only if unseeded and not terminal → **then** Echo.
