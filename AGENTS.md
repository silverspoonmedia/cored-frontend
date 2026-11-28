# AI Agents — Cored Frontend (SPA boilerplate)

**Role:** Vue 3 + Vite + TypeScript SPA — the **sole browser UI** for the Cored backend. Deployed to Cloudflare Workers as static assets; the Worker is **not** an API or auth proxy. Browser requests go direct to the Laravel API origin.

## Workspace split

- This repo is the boilerplate frontend; `cored-backend` is its only backend; `gateway` is shared CF Workers infra (own `AGENTS.md`); the sibling `docs` repo is the user-facing Docusaurus site (own `AGENTS.md`).
- Open **this repo only** via [Cored-Frontend.code-workspace](Cored-Frontend.code-workspace) for UI work; sibling `Cored-Fullstack.code-workspace` only when the API↔SPA contract moves. Every workspace loads the `docs` repo as a peer root, so its rules inject on every turn.
- A **customer-visible** screen is not shipped until its page in `docs` says so; that page ships in the same task (see the `docs-sync` rule in that repo).
- Never add API endpoints, business logic, or persistence here. Contract doc: sibling `cored-backend/docs/integration/vue-workers-spa.md` — open only when headers, cookies/CSRF, envelopes, or route names change.
- **No product ships in this tree.** `src/features/registry.ts` is an empty list and every screen under `src/views/**` is a core domain; adding a product means creating `src/features/{name}/` and appending one line, nothing else. `scripts/check-features.mjs` fails the build when core copy names a product.

## Protocol

1. **Assess before changing** — open the owning rule for the area you touch (table below) and the file's nearest test. No blind edits.
2. **Update docs and rules with every task** — the owning brief in `docs/` and the rule file when an invariant moved. `wrap up the docs` = session-wide consolidation of code ↔ docs ↔ rules across both repos.
3. **Respect scope and context** — tag the task `[frontend]`/`[backend]`/`[fullstack]`, and follow the context budget. All user-facing copy follows the always-on i18n guardrail: every supported locale in the same change.
4. **Record product-domain files in the backend manifest** — anything added here for a product domain (view, composable, component, router entry, locale key, test) is listed in that domain's `uninstall.json` in the sibling `cored-backend` repo, in the same task. The backend drift guard (`DomainUninstallManifestTest`) fails on an unlisted reference, and the backend-scoped rule does not fire when you work only in this repo.

## Rule map (all `.cursor/rules/*.mdc`)

| Rule | Fires when |
|------|-----------|
| `docs-pakem.mdc` *(always-on)* | Writing or moving any doc or rule file, or running `wrap up the docs` — a checkpoint that merges, under the same test gate |
| `task-scope.mdc` *(always-on)* | Deciding which layers a task must touch |
| `context-budget.mdc` *(always-on)* | Choosing a workspace / what to open |
| `i18n-guardrail.mdc` *(always-on)* | Adding or editing user-facing copy |
| `working-branch.mdc` *(always-on)* | Before the first edit, or before any commit — protected branch, test evidence, commit approval |
| `i18n-locales.mdc` | `src/i18n/**`, any `.vue`/`.ts` with copy, locale guards |
| `api-client.mdc` | `src/api/**`, `src/composables/echo/**` — the only HTTP/Echo layer |
| `auth-session.mdc` | Session, CSRF, hydrate, logout, cross-tab sync |
| `worker-thin.mdc` | `server/**`, `wrangler.jsonc`, `public/_headers` |
| `ui-patterns.mdc` | Views, components, assets — AdminLTE namespace conventions |
| `routes-contract.mdc` | `src/router/**` — route names sync with `cored-backend/config/spa-routes.php` |
| `testing.mdc` | `tests/**` — which contracts must stay covered |
| `deployment.mdc` | Workflows, Wrangler envs, mode files, Vite config |

Doc map: [docs/README.md](docs/README.md). SPA-local docs first; the backend contract only when headers, cookies/CSRF, envelopes, or route names change.
