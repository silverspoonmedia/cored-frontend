# monolith-vue-workers

Leading Vue 3 SPA for the Monolith `/api/v1/*` API — the **sole browser UI**. Deployed to Cloudflare Workers as static assets; the Worker is not an API or auth proxy. Browser requests go directly to the Laravel API origin, authenticated by the cross-site HttpOnly `__Host-spa_jwt` cookie (`credentials: 'include'`) plus public `X-SPA-Origin: 1` marker and double-submit `X-CSRF-Token` on mutations.

Do not store JWTs in JavaScript. Integration contract: Monolith `docs/integration/vue-workers-spa.md` (open only when headers, cookies/CSRF, envelopes, or route names change).

**Docs:** agent pakem map in [AGENTS.md](AGENTS.md) · the always-on rules in [.cursor/rules/](.cursor/rules/) · human doc map in [docs/README.md](docs/README.md) — architecture, auth/session, API client, i18n, UI patterns, routes, testing, worker, deployment. IDE: open [Monolith-SPA.code-workspace](Monolith-SPA.code-workspace) for UI-only work; sibling fullstack workspace only when the API contract moves.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Vite development server (`http://localhost:5173`) |
| `npm run type-check` | `vue-tsc --build` |
| `npm run check:i18n` | Locale parity + placeholders + duplicate-English + hardcoded-copy heuristics, code-vs-locale key usage, curation-log integrity |
| `npm run check:docs` | Doc index parity, brief line budgets, rule glob targets, relative-link integrity (see [docs-pakem.mdc](.cursor/rules/docs-pakem.mdc)) |
| `npm test` | Vitest (client/session/CSRF/echo/headers/i18n contracts) |
| `npm run build` | Type-check + production build |
| `npm run build-only` | Vite production build |
| `npm run preview` | Build + `wrangler dev` |
| `npm run deploy` | Alias for `deploy:production` |
| `npm run deploy:production` | `cross-env CLOUDFLARE_ENV=production` + `vite build --mode production` + `wrangler deploy --env production` (worker `monolith-spa-prod`) |
| `npm run deploy:sandbox` | `cross-env CLOUDFLARE_ENV=sandbox` + `vite build --mode sandbox` + `wrangler deploy --env sandbox` (worker `monolith-spa-sandbox`) |
| `npm run deploy:staging` | `cross-env CLOUDFLARE_ENV=staging` + `vite build --mode staging` + `wrangler deploy --env staging` (worker `monolith-spa-staging`) |

CI (GitHub Actions): `type-check` → `check:i18n` → `check:docs` → `test` → `build-only`. The backend's cross-repo guards are not part of it — run `php artisan test --filter=Locale` from the Monolith checkout when a batch touches a mirrored pack or a glossary term. The backend workflow does run the full `php artisan test` suite in its own `backend` job (SQLite `:memory:`, no services), so a `tests/Domain/**` regression is caught on push to Monolith. Cross-repo guards and the readability checklist: [docs/i18n.md](docs/i18n.md).

## Setup

```sh
npm install
cp .env.example .env
cp .dev.vars.example .dev.vars
```

Set `VITE_API_BASE_URL` to the Laravel API origin (e.g. `http://localhost:8000/api/v1`) so all API calls go direct. Set Monolith `SPA_URL="http://localhost:5173"`.

## Deployment environments

One codebase deploys as **three separate Workers**, split at the Wrangler environment level. Each deploy script pairs a Vite mode (which env file gets baked into the browser bundle) with the same-named Wrangler env (which Worker receives the deploy) — the two names must stay aligned or the bundle would bake the wrong API origin:

| Wrangler env (`-e`) | Vite mode (`--mode`) | Env file baked | Worker name | Deploy branch |
|---------------------|----------------------|----------------|-------------|---------------|
| `production` | `production` | `.env.production` | `monolith-spa-prod` | `main` |
| `sandbox` | `sandbox` | `.env.sandbox` | `monolith-spa-sandbox` | `main-sandbox` |
| `staging` | `staging` | `.env.staging` | `monolith-spa-staging` | `main-staging` |

Both the npm scripts and the CI workflow set `CLOUDFLARE_ENV=<env>` during the build — `@cloudflare/vite-plugin` bakes the environment's worker name into the redirected deploy config, and wrangler hard-fails a `deploy --env` that mismatches it. Never run a bare `vite build` + `wrangler deploy` pair without it; a sandbox build without `CLOUDFLARE_ENV` would deploy onto the production Worker.

Pushes to `main` / `main-sandbox` / `main-staging` also auto-deploy through GitHub Actions. Full operational guide (required secrets, workflow reference, day-to-day flow, troubleshooting): [docs/deployment.md](docs/deployment.md).

The tables above are topology only. `.env.production` and `.env.staging` still carry provisional API origins/credentials (inline `TODO`s in each file) — [docs/deployment.md — Pending environment values](docs/deployment.md#pending-environment-values).

## Environment

Vite stacks env files by mode: `.env` (baseline) → `.env.local` (dev) → `.env.<mode>` (build target). During `vite build --mode <env>` the tracked mode file (`.env.production` / `.env.sandbox` / `.env.staging`) **wins over `.env.local`** (verified on Vite 8 — a stray absolute `VITE_API_BASE_URL` in `.env.local` does not leak into deploy builds).

| Var | Where | Bundled? | Notes |
|-----|--------|----------|--------|
| `VITE_API_BASE_URL` | `.env` (baseline), `.env.local` (dev override), `.env.production` / `.env.sandbox` / `.env.staging` (tracked, per-environment deploy) | Yes | Absolute Laravel API origin (incl. `/api/v1`). Production builds require credential-free HTTPS; dev builds also allow HTTP. Drives all direct API calls; empty = same-origin only. `apiOrigin()` appends `/api/v1` when the value omits it and warns in DEV, so a hand-written base cannot silently land on the backend's web twin (`POST /broadcasting/auth`). Do not place secrets here. |
| `VITE_HCAPTCHA_SITE_KEY` | Same file matrix as above | Yes | Public sitekey; empty = no widget. Pair with Monolith `platform.hcaptcha.enabled` |
| `VITE_PUSHER_*` | Same file matrix as above | Yes | Echo; empty key = realtime disabled (no polling fallback). Mirror Monolith `PUSHER_*` literals |

Discord return is **not** a Vite var. Set Monolith `SPA_URL` to this SPA’s public origin.

## Production checklist

On **Monolith** (`APP_ENV=production`):

1. `SPA_URL` = public Vue-Workers origin (no trailing slash). Empty falls back to Monolith `APP_URL` + surviving server endpoints (public share, iPaymu return, OAuth callback).
2. `APP_URL` = public Laravel API origin; `VITE_API_BASE_URL` uses same origin with `/api/v1`.
3. hCaptcha: Settings on **and** `VITE_HCAPTCHA_SITE_KEY` set, or both off.
4. Archivd bucket / Gateway CORS includes the SPA origin and **exposes `ETag`**.
5. Pusher or Sockudo: `PUSHER_*` on Laravel + matching `VITE_PUSHER_*` in the SPA build.

The same five points apply to the **staging** and **sandbox** Monolith instances, each with its own `SPA_URL` (the `monolith-spa-staging` / `monolith-spa-sandbox` origin) and its own credential sets.

On **Vue-Workers**:

1. Custom domain on each Worker (or the default `<name>.<account>.workers.dev`); deploy per environment: `npm run deploy:production` (worker `monolith-spa-prod`), `npm run deploy:sandbox` (worker `monolith-spa-sandbox`), or `npm run deploy:staging` (worker `monolith-spa-staging`). Each script pairs `vite build --mode <env>` with `wrangler deploy --env <env>` and sets `CLOUDFLARE_ENV=<env>` on the build — wrangler **hard-fails** any `deploy --env` that mismatches the built `targetEnvironment`, so a mode/env mixup cannot deploy at all.
2. `VITE_API_BASE_URL` set to that environment's API origin over HTTPS via the **tracked** `.env.production` / `.env.sandbox` / `.env.staging`. Never rely on `wrangler.jsonc` `vars` for `VITE_*` — those are runtime isolate env and never reach the browser bundle; a build without the env file bakes an empty base and every API call 404s on the SPA origin. During builds the mode file wins over `.env.local` (verified on Vite 8), so deploy builds stay reproducible on any machine.
3. Monolith `SPA_URL` and CORS allowlist include the Worker origin of the matching environment; CORS must allow `X-SPA-Origin` for cross-origin preflights and expose `Content-Disposition` for CSV/file downloads. Provider webhook paths do not use this browser marker.
4. Static security headers live in `public/_headers` (CSP, frame deny, HSTS). Worker-generated JSON/404 responses also stamp `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy`. **Do not add API proxy paths to the Worker.** The marker is browser metadata; adding it does not invoke or bill the Worker.

When `SPA_URL` is set, Laravel mints password-reset, email-verify, public share, and iPaymu hosted return/cancel URLs onto the SPA. Email verify signs the **API** route (HMAC on `APP_URL`); the browser lands on `/verify-email/{id}/{hash}?expires=&signature=` and the SPA GETs the API directly (cross-site cookie).
