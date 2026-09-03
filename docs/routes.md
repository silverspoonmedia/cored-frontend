# Routes

## Layout

- Route records live in `src/router/routes/*.ts` — one module per domain (18 modules: activity-log, auth, dashboard, domain-access, error-log, file-hosting, identity, inference, legacy, microstock, navigation, notification, payment-gateway, product-activations, public, service, settings, vtual).
- `src/router/index.ts` assembles them (order matters — vTual admin early/late and the 404 catch-all are position-sensitive), keeps the `beforeEach` guard, and owns `scrollBehavior` (`top: 96` hash offset for `/vtual` anchors).
- URL layout: authenticated app under **`/apps/*`**, guest/public at the site root (`/vtual`, `/s/*`, payment bounce), auth pages at root. URLs and route names do not change without a cross-repo contract update.

## Naming contract (cross-repo)

Symbolic route names (e.g. `dashboard`, `users.index`, `file-hosting.microstock-usage`) are consumed by the **backend**: Monolith menu rows store these names and validate them against `monolith/config/spa-routes.php` (`SpaRouteRegistry`). Notification deep links (`action_route` + `action_params`) resolve `${route}.view` via `src/utils/notificationTarget.ts`.

Rules:

1. Renaming or adding a named route = update `monolith/config/spa-routes.php` + `MenuSeeder` (when menu-bound) in the same change, and keep both integration docs in sync.
2. Guard order in `index.ts` must not regress: one-shot `hydrateShell()` per cold boot (`resetRouterHydration` on logout), `fetchMe()` re-probe only when the cookie may have appeared from another tab, `guestOnly` redirect to `dashboard.view`. Details: [auth-session.md](auth-session.md).
3. `revokeCurrentProtectedRoute()` (logout teardown) replaces the current `requiresAuth` route with `login.view?redirect=<fullPath>` — preserve this behavior.

## Registry

~172 named routes across the 18 modules. The live registry is the code — `src/router/routes/*.ts` on this side, `monolith/config/spa-routes.php` on the backend side. When in doubt, diff the two lists; they must agree on every menu-consumed name.

## Meta flags

| Flag | Meaning |
|------|---------|
| `meta.requiresAuth` | Guard redirects guests to `login.view` (with `redirect` query) |
| `meta.guestOnly` | Authenticated users redirect to `dashboard.view` |
| `meta.public` | Public surface (`PublicLayout`, no auth probe requirement) |
| `meta.template: 'valkivid3'` | `App.vue` sets `body.vk3-page` instead of AdminLTE classes — see [ui-patterns.md](ui-patterns.md) |
