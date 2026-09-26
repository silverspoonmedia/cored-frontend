# Routes

## Layout

- Route records live in `src/router/routes/*.ts` — one module per domain (20 modules: activity-log, ai, archivd, auth, blog, dashboard, domain-access, error-log, identity, inference, legacy, microstock, navigation, notification, payment-gateway, product-activations, public, service, settings, vtual).
- `src/router/index.ts` assembles them (order matters — vTual admin early/late and the 404 catch-all are position-sensitive), keeps the `beforeEach` guard, and owns `scrollBehavior` (`top: 96` hash offset for `/vtual` anchors).
- URL layout: authenticated app under **`/apps/*`**, guest/public at the site root (`/vtual`, `/s/*`, payment bounce), auth pages at root. URLs and route names do not change without a cross-repo contract update.

## Naming contract (cross-repo)

Symbolic route names (e.g. `dashboard`, `users.index`, `archivd.microstock-usage`) are consumed by the **backend**: Monolith menu rows store these names and validate them against `monolith/config/spa-routes.php` (`SpaRouteRegistry`). Notification deep links (`action_route` + `action_params`) resolve `${route}.view` via `src/utils/notificationTarget.ts`.

Rules:

1. Renaming or adding a named route = update `monolith/config/spa-routes.php` + `MenuSeeder` (when menu-bound) in the same change, and keep both integration docs in sync.
2. Guard order in `index.ts` must not regress: one-shot `hydrateShell()` per cold boot (`resetRouterHydration` on logout), `fetchMe()` re-probe only when the cookie may have appeared from another tab, `guestOnly` redirect to `dashboard.view`. Details: [auth-session.md](auth-session.md).
3. `revokeCurrentProtectedRoute()` (logout teardown) replaces the current `requiresAuth` route with `login.view?redirect=<fullPath>` — preserve this behavior.

## Registry

~190 named routes across the 20 modules (the live count is the code — this figure drifts; the registry itself is `src/router/routes/*.ts` plus `src/router/index.ts` on this side, `monolith/config/spa-routes.php` on the backend side). When in doubt, diff the two lists; they must agree on every menu-consumed name. Recent additions: the `ai.connections.index/create/edit` trio under `/apps/ai/connections` (central AI transport + credentials, Administration sidebar sibling of Inference); `vtual.claims.index` under `/apps/vtual/claims` (claims hub — one screen for own claims + the staff queue, registered in `vtualAdminEarlyRoutes` and bound to two menu nodes); the `vtual.events.index/create/edit` trio under `/apps/vtual/events`; the blog module (`blog.posts.index/create/edit/trashed`, `blog.categories.index`, `blog.tags.index`, each with a `.view` child) under `/apps/blog/*`.

## Meta flags

| Flag | Meaning |
|------|---------|
| `meta.requiresAuth` | Guard redirects guests to `login.view` (with `redirect` query) |
| `meta.guestOnly` | Authenticated users redirect to `dashboard.view` |
| `meta.public` | Public surface (`PublicLayout`, no auth probe requirement) |
| `meta.template: 'valkivid3'` | `App.vue` sets `body.vk3-page` instead of AdminLTE classes — see [ui-patterns.md](ui-patterns.md) |
| `meta.breadcrumb` | Breadcrumb placement (`parent`, `labelKey`) — see below |

## Breadcrumbs

`AppLayout` renders one trail per authenticated page. Definitions live **on the route records**; there is no central label map, so a new route needs no registration.

| Piece | Where | Meaning |
|-------|-------|---------|
| `meta.titleKey` | route record | Page title (`<h3>`, `document.title`) **and** the default crumb label |
| `meta.breadcrumb.parent` | route record | Route name of the crumb directly above it (e.g. `users.index.view`) |
| `meta.breadcrumb.labelKey` | route record | Label override when the crumb text must differ from `titleKey` (`ui.breadcrumb.add`, `web.users.breadcrumb`) |
| `useBreadcrumbTitle(() => …)` | view | Publishes the loaded record's title as the trailing crumb |

Rules:

1. Declare `breadcrumb` on the **family record** (the one holding `titleKey`); the `.view` child inherits it through the merged `meta` that `route.meta` exposes.
2. The chain runs self → `parent` → … → root, capped at 10 hops with a cycle guard. A parent that cannot be resolved (missing param) simply ends the chain instead of throwing.
3. A route with only `titleKey` renders a single crumb; a route with neither key (e.g. the `public.*` share screens) renders no trail. Pages outside `AppLayout` (auth, public share, `payment.return`, Valkivid3) never show this trail regardless of meta.
4. Crumb links carry only the params their own path declares, taken from the current route — `vtual.vtuber.claim.view` → `vtual.vtuber.show.view` keeps `slug`; the child's unrelated params are never forwarded.
5. Entity title: `useBreadcrumbTitle()` publishes the hydrated record's name, never the route param, so `users.edit.view` renders `Users / Edit / Andi Wijaya`. The crumb appears only after the record loads (no uuid flash) and is discarded when the path changes.
6. `settings.*` (except `settings.index.view`) keeps its dedicated two-crumb branch (`web.settings.title` → group label) inside `useBreadcrumbs()`.
7. Domain-local trails are **not** part of this mechanism: Archivd folder browsing (`ar-breadcrumb`, path from the API), the public share screens, and the FROZEN vTual Valkivid3 surfaces render their own.

### Entity title rollout

One `useBreadcrumbTitle()` call per detail screen, right after the ref it reads.

- **Source.** The hydrated record's own name field — `() => service.value?.name ?? null`. Never `route.params.id`, and never a translated string: entity names are record data, not locale keys.
- **Form-only edit views.** When a screen hydrates straight into a `reactive` form and keeps no record ref (`ServiceEditView`, `SubscriptionEditView`, `PaymentGatewayEditView`, `InferenceModelCardEditView`, `InferenceProviderEditView`, `VtualEventEditView`, `VtualManagementEditView`, `VtualOrphanEditView`, `VtualPlatformCredentialCreateView`, `AiConnectionEditView`), read the bound field and gate it on `isEdit` so the create screen keeps its static trail: `() => (isEdit.value ? form.name : null)` (`AiConnectionEditView` reads `form.label`). Trade-off: the crumb tracks that field while the user types.
- **Self-navigation.** `useBreadcrumbTitle()` watches `[path, source]` and re-reads the source on either change. A view that replaces its own route (e.g. `VtualVtuberShowView` canonicalizing `:slug`) therefore keeps its title instead of blanking it.
- **Normalization.** `normalizeEntityLabel()` trims the title and maps blank/non-string to `null`, so a loading record or a whitespace-only name can never render as a crumb.
- **Intentional blanks.** Screens with no human title publish nothing and keep their static trail: `activity-log.show`, `error-log.show` (nullable diagnostics, not names), `product-activations.show` (only `summary.product_key`, which is already the route param), `vtual.platform-credentials.platform` (list wrapper, no single record). Index/list screens, `settings.*`, `domain-access` and `vtual.platform-credentials.probe` likewise publish nothing.

Enforcement: `tests/breadcrumb.test.ts` (chain order, label fallback, param forwarding, cycle guard, entity-label normalization, entity crumb).

