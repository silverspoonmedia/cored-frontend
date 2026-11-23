# Routes

Core route records live in `src/router/routes/*.ts` (one module per core domain). A product's records live in `src/features/{name}/routes/*.ts` and reach the router only through its `FeatureModule.routes` in `src/features/registry.ts`. `src/router/index.ts` spreads `featureRoutes()` in registry order, owns the `beforeEach` guard and `scrollBehavior`. Route names are a **cross-repo contract** with the backend menu registry — full rules in [.cursor/rules/routes-contract.mdc](../.cursor/rules/routes-contract.mdc).

| Need | Path |
|------|------|
| Backend route registry | `monolith/config/spa-routes.php` (`SpaRouteRegistry`) |
| Menu rows / visibility | `monolith/docs/domains/navigation/README.md` · `navigation-menus.mdc` |
| Guard + session behavior | [auth-session.md](auth-session.md) |
| Breadcrumb contract | `routes-contract.mdc` |
| Tests | `tests/breadcrumb.test.ts`, `tests/notificationTarget.test.ts` |

## Layout

- Authenticated app under **`/apps/*`**; guest/public at the site root (`/s/*`, payment bounce); auth pages at root.
- Module order in `index.ts` matters: the feature routes, the public share routes (`/s/*`, contributed by the Archivd feature) and the 404 catch-all are position-sensitive. Registry order is user-visible — keep it when adding a feature.
- A fork without a feature simply has no routes for it: the registry is the only place a product path appears.
- Meta flags: `requiresAuth`, `guestOnly`, `public`, `breadcrumb` (`titleKey`, `parent`, `labelKey`).
- Breadcrumbs are declared on the route records — there is no central label map, so a new route needs no registration. Entity titles come from `useBreadcrumbTitle()` reading the hydrated record's own name.

## Naming contract

Symbolic route names are stored in Monolith menu rows and validated against `monolith/config/spa-routes.php`; notification deep links resolve `${route}.view` via `src/utils/notificationTarget.ts`. Renaming or adding a named route updates `config/spa-routes.php` + `MenuSeeder` (when menu-bound) in the same change, plus both integration docs. The live count is the code — the registry is `src/router/routes/*.ts` plus every `src/features/*/routes/*.ts` and `index.ts` here, and `config/spa-routes.php` on the backend side; when in doubt, diff the two lists. `npm run check:features` catches a feature directory that is not registered or a registry entry whose `routes` file is missing.
