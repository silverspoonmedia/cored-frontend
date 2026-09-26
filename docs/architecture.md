# Architecture

## Direct-to-API model

The Worker serves static assets only. **All `/api/v1/*` traffic goes direct from the browser to the Laravel API origin** (`VITE_API_BASE_URL`) — this Worker is never in the request path:

```
Browser (SPA origin)
  - static HTML/JS/CSS from the Worker (API traffic does not target this Worker)
  - all /api/v1/* requests -> direct cross-site to Laravel (VITE_API_BASE_URL):
        credentials:'include' -> HttpOnly __Host-spa_jwt cookie
        X-SPA-Origin: 1       -> Laravel anti-noise request marker
        X-CSRF-Token header   -> double-submit __Host-spa_csrf nonce

Cloudflare Tunnel is the API network perimeter. It uses an outbound-only connector;
VM/OCI inbound web ports stay closed and tunnel ingress must end in a 404 catch-all.
```

`VITE_API_BASE_URL` **must be set** to the absolute Laravel API origin (e.g. `https://api.example.com/api/v1`). Leave it empty only for local same-origin development. The API hostname is reached through Cloudflare Tunnel; the VM/OCI origin should have inbound web ports closed and the tunnel should expose only explicit SPA/API hostnames. Direct versioned API calls carry public `X-SPA-Origin: 1` for Laravel's anti-noise gate; this is not a secret or authentication. CSP allows hCaptcha challenge resources and HTTPS API/CDN connections; external URLs are sanitized before use.

Cloudflare Access is optional for separate internal, admin, or debug surfaces. It authenticates users, devices, or server-side service tokens; it cannot prove that public JavaScript came from this SPA. Never put an Access service-token secret in `VITE_*`. Protecting this public cross-origin API with Access would require deliberate Access cookie/CORS/preflight handling; hiding a service token from the browser would require a Worker/BFF and change the current direct-API routing architecture.

`vue-i18n` and `@intlify/unplugin-vue-i18n` must share the same major version (currently both v11). The unplugin precompiles locale JSON into a minified AST read by the `vue-i18n` runtime formatter; a major mismatch (unplugin v11 emitting node type 9 + runtime v9) makes `t()` throw `SyntaxError: unhandled minifier node type` on those messages.

## `src/` layer map

Type-then-domain: screens live under `src/views/{domain}/`, with matching `src/composables/{domain}/` and `src/utils/{domain}/` folders. Shared chrome stays at the type root.

| Layer | Contents | Notes |
|-------|----------|-------|
| `src/api/` | `client.ts`, `csrf.ts`, `netRetry.ts`, `batch.ts`, `baseUrl.ts`, `requestHeaders.ts`, `types.ts` | The only HTTP layer — see [api-client.md](api-client.md). `netRetry.ts` is the shared cross-tab cookie-race retry policy. `types.ts` mirrors Laravel API Resources exactly (snake_case, no transform layer) |
| `src/views/{domain}/` | Vue Router page components | 19 domains (activity-log, ai, archivd, auth, blog, dashboard, domain-access, error-log, identity, inference, microstock, navigation, notification, payment-gateway, product-activations, public, service, settings, vtual) |
| `src/composables/` | Shared composables at root (`useResource`, `useDetailLoader`, `useEcho`, `useAlert`, …) + `composables/{domain}/` + `composables/echo/` (`channelRegistry.ts`, `realtimeChannel.ts`) | Stateful logic bound to component lifecycle. AI admin is `views/ai` + `composables/ai` (`useAiConnections` / `useAiConnectionsRealtime`). `composables/echo/` is the **only** place allowed to call `echo.private()` / `echo.leave()` / `subscribeWhenEchoReady()` — every private channel goes through it (rule 11, [api-client.md](api-client.md#channel-lifecycle-goes-through-the-registry)) |
| `src/components/` | Shared UI chrome (`AppNavbar`, `DataTable`, `RowActions`, `ErrorState`, `EmptyState`, `SkeletonBlock`, …) | Cross-domain only; domain-specific components live under the view domain |
| `src/lib/` | Side-effect wrappers around vendor libs (`swal.ts`, `safeRedirect.ts`) | Small, app-wide, not domain-scoped |
| `src/utils/` | Pure helpers (`safeUrl.ts`, `mapQueryRowActions.ts`, `statusBadge.ts`, `vtualJsonLd.ts`, `vtualPresentation.ts`, …) + `utils/{domain}/` | No Vue lifecycle, no fetch — pure functions. A presentation **decision** (region notice, freshness label, JSON-LD graph) belongs here so it is unit-testable in the node environment; the component only renders the result |
| `src/stores/` | Pinia stores | Shared client state (auth, shell, notifications) |
| `src/router/` | `index.ts` (guards + assembly) + `routes/*.ts` (20 modules) | See [routes.md](routes.md) |
| `src/i18n/` | `locales/*.json`, `fallbacks.ts`, shared `i18n` instance | See [i18n.md](i18n.md) |
| `src/layouts/` | `AppLayout` (AdminLTE shell), `PublicLayout` | — |
| `src/valkivid3/` | Self-contained Valkivid3 template tree (`layouts/components/composables/views/assets`) | Scoped CSS namespace — see [ui-patterns.md](ui-patterns.md) |
| `src/assets/` | AdminLTE global CSS entries (`main-ltr.css`, `main-rtl.css`, `vendor*.css`), overrides | — |

Placement rule of thumb: Vue-lifecycle logic → `composables/`; vendor wrapper → `lib/`; pure function → `utils/`; domain-scoped anything → the matching `{domain}/` subfolder. Raw Echo channel management is not a per-domain choice — it belongs to `composables/echo/` (rule 11).

## One route, two audiences

The vTual claims hub (`/apps/vtual/claims`, `VtualClaimsView.vue`) is the reference for a screen two permission levels share: one route, one view, tabs whose **visibility is gated on the same permission the endpoint and the realtime channel require** (`manage any vtual resource`). A tab that would only 403 is never rendered. Both tabs read the same envelope and both drive `RowActions` from the server's `actions[]` — the client routes the click, the server decides which keys are legal. Do not clone the view into a staff copy; do not let the client widen the action set.

## Env files

Vite stacks env files by mode: `.env` (baseline) → `.env.local` (dev) → `.env.<mode>` (build target). During `vite build --mode <env>` the tracked mode file (`.env.production` / `.env.sandbox` / `.env.staging`) **wins over `.env.local`** (verified on Vite 8). Variable matrix and deploy pairing: [deployment.md](deployment.md) + README Environment section.

Discord OAuth return is **not** a Vite var — it is Monolith `SPA_URL` on the API host.

## Related

- [worker.md](worker.md) — Worker shell invariants
- [auth-session.md](auth-session.md) — cookie/CSRF session contract
- Backend architecture: `monolith/docs/platform/architecture.md`
