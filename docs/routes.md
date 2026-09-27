# Routes

Route records live in `src/router/routes/*.ts` (one module per domain); `src/router/index.ts` assembles them, owns the `beforeEach` guard and `scrollBehavior`. Route names are a **cross-repo contract** with the backend menu registry — full rules in [.cursor/rules/routes-contract.mdc](../.cursor/rules/routes-contract.mdc).

| Need | Path |
|------|------|
| Backend route registry | `monolith/config/spa-routes.php` (`SpaRouteRegistry`) |
| Menu rows / visibility | `monolith/docs/domains/navigation/README.md` · `navigation-menus.mdc` |
| Guard + session behavior | [auth-session.md](auth-session.md) |
| Breadcrumb contract | `routes-contract.mdc` |
| Tests | `tests/breadcrumb.test.ts`, `tests/notificationTarget.test.ts` |

## Layout

- Authenticated app under **`/apps/*`**; guest/public at the site root (`/vtual`, `/s/*`, payment bounce); auth pages at root.
- Module order in `index.ts` matters: vTual admin early/late routes and the 404 catch-all are position-sensitive.
- Meta flags: `requiresAuth`, `guestOnly`, `public`, `template: 'valkivid3'`, `breadcrumb` (`titleKey`, `parent`, `labelKey`).
- Breadcrumbs are declared on the route records — there is no central label map, so a new route needs no registration. Entity titles come from `useBreadcrumbTitle()` reading the hydrated record's own name.

## Naming contract

Symbolic route names are stored in Monolith menu rows and validated against `monolith/config/spa-routes.php`; notification deep links resolve `${route}.view` via `src/utils/notificationTarget.ts`. Renaming or adding a named route updates `config/spa-routes.php` + `MenuSeeder` (when menu-bound) in the same change, plus both integration docs. The live count is the code — the registry is `src/router/routes/*.ts` plus `index.ts` here, and `config/spa-routes.php` on the backend side; when in doubt, diff the two lists.
