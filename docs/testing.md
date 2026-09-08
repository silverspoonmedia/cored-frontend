# Testing

Vitest (`vitest run`), tests in `tests/*.test.ts`. CI runs `type-check` → `check:i18n` → `test` → `build-only` (`.github/workflows/ci.yml`).

## What is covered (and must stay covered)

| Area | Test file(s) | Locks |
|------|--------------|-------|
| API client | `client.test.ts` | Auth-session POSTs skip the nonce fetch; `POST /batch` and `POST /broadcasting/auth` 419 refresh + retry; `GET auth/me` / `GET navigation/menus` 401 do not `POST /auth/refresh`; settle-window 401 and `TypeError` retry the original URI; CSRF cookie-write gate |
| CSRF | `csrf.test.ts` | fetch+broadcast, cross-tab adoption, malformed-message guard, single-flight, header application, `whenCsrfCookieQuiet` |
| Shell hydrate | `shellHydrate.test.ts` | settle batch retry, terminal sub-entry blocks GET fallback, revoked-session stale-response discard |
| Cross-tab logout | `authCrossTabLogout.test.ts` | `BroadcastChannel` + `localStorage` fallback receiver teardown |
| Echo | `echo.test.ts` | authorizer calls `client.post('broadcasting/auth')` |
| Headers/base URL | `requestHeaders.test.ts`, `baseUrl.test.ts` | `X-SPA-Origin`/`X-SPA-Locale` application, URL resolution |
| i18n | `i18n.test.ts`, `settingsI18n.test.ts` | locale mapping, settings label lookup (`tm()`/`rt()`) |
| URL safety | `safeUrl.test.ts`, `safeRedirect.test.ts` | scheme/credential rejection, internal-redirect rules |
| Misc contracts | `notificationTarget.test.ts`, `providerByKey.test.ts`, `vkStr1Theme.test.ts`, `vtualCredentialTestUnwrap.test.ts` | deep-link resolver, provider map, Valkivid3 theme, credential unwrap |

## Conventions

- Behavior changes to the API client, CSRF, shell hydration, realtime authorizers, redirects, or i18n plumbing **must** extend the matching test file (core rule 10).
- Tests stub network (`fetch`) — no live API. Keep them deterministic and offline.
- Component-level rendering tests are not the norm; coverage concentrates on the client/session/composable contracts where regressions are silent and expensive.
- Add a test file per contract surface (`tests/<area>.test.ts`), not per component.
