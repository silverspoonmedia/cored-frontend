# Testing

Vitest (`npm test`), tests in `tests/*.test.ts`, network stubbed — no live API. Conventions and the must-stay-covered contract list: [.cursor/rules/testing.mdc](../.cursor/rules/testing.mdc).

CI order in [.github/workflows/ci.yml](../.github/workflows/ci.yml): `type-check` → `check:i18n` → `check:docs` → `test` → `build-only`.

| Need | Path |
|------|------|
| i18n guards | [i18n.md](i18n.md) · `i18n-locales.mdc` |
| Client/session contracts under test | [api-client.md](api-client.md) · [auth-session.md](auth-session.md) |
| Route/breadcrumb contracts | [routes.md](routes.md) |
| Real-time channel contracts | `ui-patterns.mdc` |

## Conventions

- Add a test file per **contract surface** (`tests/<area>.test.ts`), not per component.
- Behavior changes to the API client, CSRF, shell hydration, realtime authorizers, redirects, or i18n plumbing **must** extend the matching test file.
- Component rendering tests are not the norm. The one exception is a genuine DOM contract, which opts into jsdom per file (`// @vitest-environment jsdom`); the suite default stays `node`. A pure decision belongs in `src/utils/*` where node can test it.
- Verifying vendor-widget CSS means measuring against a **vendor-built** DOM (real jQuery + select2 in headless Chrome) — a hand-written harness measures a DOM the library never creates.
- Run `npm run type-check` and `npm run check:i18n` locally before pushing; CI runs both plus `npm test`.
