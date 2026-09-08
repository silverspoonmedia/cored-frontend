# Core rules — Monolith-Vue-Workers (SPA)

Mandatory rules for every task in this repo. Each rule has a summary + a link to the owning doc. Root protocol: [../../AGENTS.md](../../AGENTS.md).

## Rules

| # | Rule | Owning doc |
|---|------|-----------|
| 1 | **Sole UI, thin Worker.** All browser UI lives here; the Worker serves static assets and is never an API/auth proxy. | [../worker.md](../worker.md) |
| 2 | **Living docs.** Update the related doc with every task; `wrap up the docs` triggers session-wide consolidation (including Monolith integration docs when the contract moved). | [../README.md](../README.md) |
| 3 | **Localization is mandatory.** Every user-facing copy change ships all supported locales in the same task/PR; `npm run check:i18n` must pass. Translate contextually, never literally; use `i18n.global.t` outside component `setup()`. | [../i18n.md](../i18n.md) |
| 4 | **Auth/session contract.** Never store JWTs in JS; respect the logout barrier/epoch, cross-tab `BroadcastChannel` sync, and post-login cookie-settle order. | [../auth-session.md](../auth-session.md) |
| 5 | **API goes direct.** All data calls go cross-site to `VITE_API_BASE_URL` with `credentials: 'include'` + `X-CSRF-Token` on mutations + `X-SPA-Origin: 1`; CSRF/419/settle behavior is owned by `client.ts` — never hand-roll fetches around it. | [../api-client.md](../api-client.md) |
| 6 | **Dual templates stay separate.** AdminLTE4 (Bootstrap 5) and Valkivid3 (Tailwind 4, `.vk3-root`-scoped) never cross-import CSS. vTual landing HomeView + exclusive components are FROZEN — edits need explicit user permission + baseline diff. | [../ui-patterns.md](../ui-patterns.md) |
| 7 | **Loading states are mandatory.** Every data view renders skeleton → error-with-retry → empty/data, via the shared primitives — no blank views on fetch failure. | [../ui-patterns.md](../ui-patterns.md) |
| 8 | **Swal only.** Notifications/confirmations go through `src/lib/swal.ts` (`useAlert`, `confirmDialog`, `inputDialog`) — never native `alert/confirm/prompt` or ad-hoc alert blocks. | [../ui-patterns.md](../ui-patterns.md) |
| 9 | **Route names are a cross-repo contract.** Symbolic route names sync with `monolith/config/spa-routes.php` (backend menus consume them). Rename = update both repos + both integration docs. | [../routes.md](../routes.md) |
| 10 | **Tests with behavior changes.** Auth client, CSRF, shell hydration, realtime authorizers, and route-name contracts have Vitest coverage — extend it when changing them. | [../testing.md](../testing.md) |

## Workflow checklist

1. Read the owning doc for the area you touch (see [../README.md](../README.md) doc map).
2. Check the backend contract (`monolith/docs/integration/vue-workers-spa.md`) before touching API calls, headers, auth, realtime, or route names.
3. Implement; keep type alignment with Laravel API Resources (snake_case, no transform layer — `src/api/types.ts`).
4. Run the gates: `npm run type-check` → `npm run check:i18n` → `npm test` → `npm run build-only` (CI order).
5. Update docs in the same task.

## What not to do

- No API proxy paths in `server/` (rule 1).
- No JWT in `localStorage`/JS memory (rule 4).
- No hardcoded user-facing strings; no new locale keys in one locale only (rule 3).
- No Tailwind classes in the AdminLTE namespace, no Bootstrap reliance inside Valkivid3 (rule 6).
- No edits to the FROZEN vTual landing files without explicit user permission (rule 6).
- No new Wrangler environments unless another API origin exists; never mix Vite `--mode` with a different `--env` ([../deployment.md](../deployment.md)).
- No `VITE_*` secrets; `wrangler.jsonc` `vars` never reach the browser bundle (rule 1, [../deployment.md](../deployment.md)).
