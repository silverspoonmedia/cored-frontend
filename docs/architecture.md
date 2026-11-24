# Architecture

Direct-to-API SPA. The Worker serves static assets only; every `/api/v1/*` request goes from the browser straight to the Laravel origin. Invariants: `worker-thin.mdc`, `api-client.mdc`, `task-scope.mdc`.

```
Browser (SPA origin)
  static HTML/JS/CSS from the Worker
  /api/v1/*  -> direct cross-site to Laravel (VITE_API_BASE_URL)
                credentials:'include'  -> HttpOnly __Host-spa_jwt
                X-SPA-Origin: 1        -> Laravel anti-noise marker
                X-CSRF-Token           -> double-submit __Host-spa_csrf
```

`VITE_API_BASE_URL` must be the absolute Laravel API origin ending in `/api/v1` (`apiOrigin()` appends and DEV-warns when missing). Leave it empty only for local same-origin development. Cloudflare Tunnel is the API network perimeter; Cloudflare Access is optional for internal/admin hostnames and can never prove the JavaScript came from this SPA. Never put an Access service token in `VITE_*`.

`vue-i18n` and `@intlify/unplugin-vue-i18n` must share the same major version (both v11) — a major mismatch makes `t()` throw `SyntaxError: unhandled minifier node type`.

| Need | Path |
|------|------|
| API client contract | [api-client.md](api-client.md) · `api-client.mdc` |
| Session/cookie contract | [auth-session.md](auth-session.md) · `auth-session.mdc` |
| Worker shell | [worker.md](worker.md) · `worker-thin.mdc` |
| UI conventions | [ui-patterns.md](ui-patterns.md) · `ui-patterns.mdc` |
| Backend architecture | `cored-backend/docs/platform/architecture.md` |

## `src/` layer map

Two zones. **Core** is everything the shell needs on a product-free install (`api`, `stores`, `composables/echo`, `i18n`, `layouts`, shared `components`, `router`, `lib`, `utils`). **Features** are product modules under `src/features/{name}/` — views, components, composables, routes, types and utils for one product, plus its copy in `src/i18n/features/{name}/`. Core never imports a feature except through `src/features/registry.ts`; a fork deletes a feature directory and one registry line. `npm run check:features` enforces the boundary, registry parity (every directory registered, every registry entry has routes + 7 locale packs) and product-name neutrality in core.

| Layer | Contents | Notes |
|-------|----------|-------|
| `src/api/` | `client.ts`, `csrf.ts`, `netRetry.ts`, `batch.ts`, `baseUrl.ts`, `requestHeaders.ts`, `types.ts` | The only HTTP layer. `types.ts` mirrors Laravel API Resources exactly (snake_case, no transform layer) |
| `src/views/{domain}/` | Core Vue Router page components | One folder per core domain (17) |
| `src/features/{name}/` | Product module: `index.ts` (`FeatureModule`), `routes/`, `views/`, `components/`, `composables/`, `types.ts` | Registered in `registry.ts`; no core file imports it directly |
| `src/composables/` | Root composables (`useResource`, `useDetailLoader`, `useEcho`, `useAlert`) + `{domain}/` + `echo/` | `echo/` is the only place allowed to touch raw Echo APIs. `useEcho` registers its primitives into the leaf `echo/echoBindings.ts`, which the registry reads, so neither imports the other |
| `src/components/` | Shared chrome (`AppNavbar`, `DataTable`, `RowActions`, `ErrorState`, `EmptyState`, `SkeletonBlock`) | Cross-domain only; domain components live with their view |
| `src/lib/` | Side-effect vendor wrappers (`swal.ts`, `safeRedirect.ts`) | App-wide, not domain-scoped |
| `src/utils/` | Pure helpers + `utils/{domain}/` | No Vue lifecycle, no fetch. A presentation **decision** belongs here so node can unit-test it |
| `src/stores/` | Module-scope reactive state (`auth.ts`) | No Pinia — one plain module holding `ref`/`computed` state, read through an accessor (`useAuth()`). Add a store only for state shared across unrelated trees |
| `src/router/` | `index.ts` + `routes/*.ts` | [routes.md](routes.md) |
| `src/features/` | `types.ts` (`FeatureModule`), `registry.ts`, `messages.ts` (deep-merge helper) | The only core↔feature surface |
| `src/i18n/` | `locales/*.json` (core), `features/{name}/*.json` (product), `fallbacks.ts`, `featurePacks.ts` (lazy feature packs), shared instance | [i18n.md](i18n.md) |
| `src/layouts/` | `AppLayout`, `PublicLayout` | — |
| `src/assets/` | AdminLTE global CSS entries, overrides | — |

Placement rule of thumb: Vue-lifecycle logic → `composables/`; vendor wrapper → `lib/`; pure function → `utils/`; domain-scoped anything → the matching `{domain}/` subfolder, or inside the owning `src/features/{name}/`. Raw Echo channel management belongs to `composables/echo/` only.

A feature that needs a core signal (a realtime event, a shared list action) registers a handler from its `boot()` instead of the core importing the feature: `registerShellRealtime(handler)` in `composables/echo/` is the seam a product feature uses to ride a core signal.

Two dependency cycles are broken by a leaf module, not by looser imports: `composables/echo/echoBindings.ts` (useEcho → registry → useEcho) and `i18n/featurePacks.ts` (i18n → registry → feature → i18n). Both are `import`-only leaves; everything that reads them does so inside a call, after module evaluation. A feature composable takes copy from `useI18n()`, never from the `@/i18n` singleton. `vitest.config.ts` loads `@vitejs/plugin-vue`, because importing `@/api/client` now reaches route tables whose entries are `.vue` files.

## One route, two audiences

A product screen two permission levels share is the reference pattern: one route, tabs whose **visibility is gated on the same permission the endpoint and the realtime channel require** (`canViewPlatform` hides the platform tab *and* its panel). Every tab reads the same envelope and drives `RowActions` from the server's `actions[]` — the client routes the click, the server decides which keys are legal. Never clone the view into a staff copy, never let the client widen the action set.

## Env files

Vite stacks env files by mode: `.env` → `.env.local` → `.env.<mode>`; during `vite build --mode <env>` the tracked mode file wins over `.env.local`. Variable matrix and deploy pairing: [deployment.md](deployment.md). Discord OAuth return is `cored-backend` `SPA_URL` on the API host, not a Vite var.
