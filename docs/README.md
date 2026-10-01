# Documentation index — Monolith-Vue-Workers

Two surfaces, one owner per topic (see [.cursor/rules/docs-pakem.mdc](../.cursor/rules/docs-pakem.mdc)):

- **Human briefs** live here in `docs/` — one paragraph of orientation plus a pointer table.
- **Agent pakem** lives in [`.cursor/rules/*.mdc`](../.cursor/rules/) — imperative rules, glob-scoped, self-sufficient. [`AGENTS.md`](../AGENTS.md) is the always-on map.

Backend-side contract docs live in the sibling Monolith repo (`monolith/docs/`). **Language: English only.**

## Start here

| Need | Open |
|------|------|
| Agent pakem map | [AGENTS.md](../AGENTS.md) · rules in [.cursor/rules/](../.cursor/rules/) |
| User-facing docs site | [help.silverspoon.me](https://help.silverspoon.me) — sibling `docs` repo (Docusaurus, customer manual); agent pakem in that repo's `AGENTS.md` + `.cursor/rules/` |
| Scope tags, context budget, docs ownership | `task-scope.mdc` · `context-budget.mdc` · `docs-pakem.mdc` |
| IDE workspace | [Monolith-SPA.code-workspace](../Monolith-SPA.code-workspace) (this repo) · sibling `Monolith-Fullstack.code-workspace` only when the API contract moves; all three load the `docs` repo as a peer root |
| Project layout, `src/` layers, direct-to-API routing | [architecture.md](architecture.md) |
| Auth/session lifecycle | [auth-session.md](auth-session.md) |
| API client conventions | [api-client.md](api-client.md) |
| Runtime OG/SEO meta for public pages | [head-meta.md](head-meta.md) |
| Localization workflow + guards | [i18n.md](i18n.md) |
| UI conventions (templates, states, buttons, Swal) | [ui-patterns.md](ui-patterns.md) |
| Route registry + backend sync contract | [routes.md](routes.md) |
| Testing conventions | [testing.md](testing.md) |
| Worker shell invariants | [worker.md](worker.md) |
| Deploy (envs, CI, rollback, troubleshooting) | [deployment.md](deployment.md) |
| Backend integration contract | `monolith/docs/integration/vue-workers-spa.md` |

## Documents

| Document | Pakem rule | Topic |
|----------|-----------|-------|
| [architecture.md](architecture.md) | `task-scope.mdc`, `worker-thin.mdc` | Direct-to-API model, `VITE_API_BASE_URL`, `src/` layer map, type-then-domain rule |
| [auth-session.md](auth-session.md) | `auth-session.mdc` | `__Host-spa_jwt` cookie, CSRF double-submit, hydrate, logout barrier/epoch, cross-tab sync |
| [api-client.md](api-client.md) | `api-client.mdc` | `client.ts` behavior, headers, query serialization, error normalization, batch, Echo auth + channel registry |
| [head-meta.md](head-meta.md) | `valkivid3.mdc` | Client-side OG/SEO meta for public surfaces (`useHeadMeta`), JSON-LD builders |
| [i18n.md](i18n.md) | `i18n-locales.mdc`, `i18n-guardrail.mdc` | Seven locales, lazy chunks, `zh-CN`↔`zh_CN`, RTL reload, `check:i18n` chain, curation log |
| [ui-patterns.md](ui-patterns.md) | `ui-patterns.mdc`, `valkivid3.mdc` | Template scoping, loading/error states, RowActions, Swal-only, selects, safe URLs |
| [routes.md](routes.md) | `routes-contract.mdc` | Route modules, naming contract, sync with `monolith/config/spa-routes.php`, breadcrumbs |
| [testing.md](testing.md) | `testing.mdc` | Vitest setup, which contracts must stay covered, adding tests |
| [worker.md](worker.md) | `worker-thin.mdc` | `server/index.ts` guard-only stub, never-re-add-proxy invariant, security headers |
| [deployment.md](deployment.md) | `deployment.mdc` | Branch → mode → Wrangler env map, `CLOUDFLARE_ENV`, secrets, rollback |

## Writing docs

1. Read [.cursor/rules/docs-pakem.mdc](../.cursor/rules/docs-pakem.mdc) — it owns the brief template, the size budgets, and the placement rules.
2. Prefer editing an existing brief. One concern per file; add a row here in the same task.
3. Contract changes (API shapes, headers, route names, cookie/CSRF) update **both** this tree and `monolith/docs/integration/vue-workers-spa.md`.
4. Historical one-shot notes do not belong in this tree — write them in the commit message or the Monolith `docs/archive/`.
5. Run `npm run check:docs` after any docs change.
