# Deployment — GitHub Actions → Cloudflare Workers

One codebase, three Workers. Pushes to specific branches auto-deploy via GitHub Actions; the same environments can be deployed manually with `wrangler`. Invariants: [.cursor/rules/deployment.mdc](../.cursor/rules/deployment.mdc). Integration contract with the Laravel backend: `monolith/docs/integration/vue-workers-spa.md`.

## Deploy map

| Git branch | Vite mode | Env file baked | Wrangler env | Worker name |
|------------|-----------|----------------|--------------|-------------|
| `main` | `production` | `.env.production` | `production` | `monolith-spa-prod` |
| `main-sandbox` | `sandbox` | `.env.sandbox` | `sandbox` | `monolith-spa-sandbox` |
| `main-staging` | `staging` | `.env.staging` | `staging` | `monolith-spa-staging` |

The branch name is decoupled from the environment name: `main-sandbox` / `main-staging` are long-lived integration branches cut from `main`, while the Vite mode and Wrangler env stay `sandbox` / `staging`. `VITE_*` values are baked from the tracked mode file (the mode file wins over `.env.local`); `wrangler.jsonc` `vars` never reach the bundle.

## Mode file values

The three tracked mode files (`.env.production`, `.env.sandbox`, `.env.staging`) hold the values baked into each bundle. They are guarded by `npm run check:env` (wired into CI and into the deploy job), which fails a build when:

- a required `VITE_*` key is missing or empty;
- a value is a placeholder (`example.com`, `localhost`, `CHANGEME`, `<...>`);
- production or staging points at a host containing `sandbox`;
- two environments share the same API origin;
- an unresolved `TODO` remains in the file.

A non-origin credential shared between environments (hCaptcha sitekey, Pusher app key) is reported as a warning, not a failure — it is drift worth fixing, but it does not send traffic to the wrong backend. Swap values per environment; do not move them into the docs.

## One-time prerequisites

1. Cloudflare API token from the **Edit Cloudflare Workers** template (or `Account → Workers Scripts → Edit` + `Account → Account Settings → Read`), scoped to the account.
2. GitHub **Settings → Secrets and variables → Actions**: `CLOUDFLARE_API_TOKEN` (secret), `CLOUDFLARE_ACCOUNT_ID` (secret).
3. Branches: `main` deploys production; cut `main-sandbox` and `main-staging` from `main` once and keep them merge-synchronized. If the Actions tab stays empty after creating a branch, push a fresh commit to trigger the first deploy. The Workers need not exist in advance — the first deploy creates them. Rollback: `npx wrangler rollback --env <env>`, or revert and push.

## Adding another environment

Adding an environment (new branch + Worker) touches seven files. Miss the resolver arm and the deploy hard-fails with `Unmapped deploy branch <name>`; miss the Vite mode or Wrangler env and the bundle bakes the wrong API origin.

| File | Change |
|------|--------|
| `wrangler.jsonc` | `env.<env>` with the Worker `name` |
| `.env.<env>` | New tracked mode file (mirror an existing one) |
| `scripts/check-mode-env.mjs` | Add the mode to `MODES` so `check:env` guards it |
| `.gitignore` | `!.env.<env>` allowlist entry (`.env*` is ignored by default) |
| `package.json` | `deploy:<env>` = `cross-env CLOUDFLARE_ENV=<env>` + `vite build --mode <env>` + `wrangler deploy --env <env>` |
| `.github/workflows/deploy.yml` | Branch in `on.push.branches` **and** a `case` arm in the resolver step |
| `.github/workflows/ci.yml` | Branch in `on.push.branches` so direct pushes still run CI |

## Workflow

[.github/workflows/deploy.yml](../.github/workflows/deploy.yml) resolves the branch to `DEPLOY_ENV` + `CLOUDFLARE_ENV` (explicit `case`, unmapped branch fails loudly), runs `type-check` → `check:i18n` → `check:env` → `test`, builds with `npx vite build --mode $DEPLOY_ENV`, then deploys with `cloudflare/wrangler-action@v3`. Quality gates re-run inside the deploy job — a deploy never bypasses CI.

**`CLOUDFLARE_ENV` must be set on the build step.** `@cloudflare/vite-plugin` bakes the environment's worker name into the redirected config; without it the output falls back to the top-level name and a sandbox/staging deploy would silently overwrite the **production** Worker. With it set, wrangler also hard-fails a `deploy --env` that mismatches the built `targetEnvironment`.

## Day-to-day flow

1. Work on `feat/*` branches.
2. Merge into `main-sandbox` → sandbox deploy → verify the API origin in the network tab and that login sets `__Host-spa_jwt`.
3. Merge into `main-staging` → staging deploy → same verification.
4. Merge to `main` → production deploy.

## Backend coupling

Each backend environment sets `SPA_URL` to the matching SPA origin, so CORS and SPA-minted URLs (password reset, email verify, iPaymu return) point at the right Worker. A Monolith instance accepts only origins in its allowlist (`APP_URL` + `SPA_URL` + `CORS_EXTRA_ORIGINS`).

## Troubleshooting

| Symptom | Likely cause |
|---------|--------------|
| Sandbox deploy overwrote production | `CLOUDFLARE_ENV` missing on the build step |
| `Unmapped deploy branch <name>` | Branch missing from the workflow `case` resolver (and `on.push.branches`) |
| `does not match the target environment … used when building` | `--env` mismatches the `CLOUDFLARE_ENV` used at build — rebuild with the matching value; never bypass |
| Every API call 404s on the SPA origin | `VITE_API_BASE_URL` empty/placeholder, or the build ran without `--mode` |
| Bundle points at the wrong API origin | Build/deploy pairing broken (`--mode` ≠ `--env`), or the wrong branch deployed — `npm run check:env` catches a wrong origin before the build |
| `check:env` fails with "points at a sandbox host" | `.env.production` / `.env.staging` `VITE_API_BASE_URL` still names the sandbox API; set that environment's own origin |
| Actions auth error code 10000 | `CLOUDFLARE_API_TOKEN` missing/expired or lacking `Workers Scripts:Edit` |
| Login works locally but no cookie on the deployed origin | Monolith `SPA_URL` does not match the SPA origin |
| Random "CORS error" / `TypeError: Failed to fetch`, clears on retry | Another tab rotated the shared CSRF cookie mid-request — `src/api/netRetry.ts`, invariants in `api-client.mdc` |
| "CORS error" only on `POST …/broadcasting/auth`, never clears | URL is not `/api/v1/…` (hit the backend web twin) or the CSRF settle gate was bypassed |
| CSV/file download saves with a generic name | Monolith `config/cors.php` `exposed_headers` missing `Content-Disposition` |
| Realtime silent | `VITE_PUSHER_APP_KEY` empty in that environment's tracked env file |
