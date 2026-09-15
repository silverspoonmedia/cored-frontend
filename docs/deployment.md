# Deployment — GitHub Actions → Cloudflare Workers

One codebase, three Workers. Pushes to specific branches auto-deploy via GitHub Actions; the same environments can also be deployed manually from any machine with `wrangler` credentials. This guide is the operational reference — the integration contract with the Laravel backend lives in Monolith `docs/integration/vue-workers-spa.md`.

## Deploy map

| Git branch | Vite mode (`--mode`) | Env file baked | Wrangler env (`--env`) | Worker name | Default URL |
|------------|----------------------|----------------|------------------------|-------------|-------------|
| `main` | `production` | `.env.production` | `production` | `monolith-spa-prod` | `https://monolith-spa-prod.<account>.workers.dev` |
| `main-sandbox` | `sandbox` | `.env.sandbox` | `sandbox` | `monolith-spa-sandbox` | `https://monolith-spa-sandbox.<account>.workers.dev` |
| `main-staging` | `staging` | `.env.staging` | `staging` | `monolith-spa-staging` | `https://monolith-spa-staging.<account>.workers.dev` |

The branch name is deliberately decoupled from the environment name: `main-sandbox` / `main-staging` are long-lived integration branches cut from `main`, while the Vite mode and Wrangler env stay `sandbox` / `staging` (so `.env.sandbox`, `npm run deploy:sandbox`, and the `monolith-spa-sandbox` Worker are unchanged by the branch rename).

Contract reminders:

- `VITE_*` values are baked into the browser bundle from the tracked mode file (`.env.production` / `.env.sandbox` / `.env.staging`). During `vite build --mode <env>` the mode file wins over `.env.local` (verified on Vite 8), so CI and local builds are reproducible.
- `wrangler.jsonc` `vars` are runtime isolate env and never reach the browser bundle — never put `VITE_*` there.
- Vite mode and Wrangler env must stay aligned (`production`, `sandbox`, or `staging` on both sides). The npm scripts and the workflow below enforce the pairing; never mix them by hand.

## Pending environment values

The deploy map above describes **topology only** — which branch bakes which env file into which Worker. Two tracked mode files still carry provisional values (each marked with an inline `TODO` in the file):

- `.env.production` — `VITE_API_BASE_URL` still points at the **sandbox** API host, so the production Worker currently talks to the sandbox Laravel instance. Pre-existing; must be swapped to the production API origin before launch.
- `.env.staging` — `VITE_API_BASE_URL` uses the mirrored staging host pattern, but the staging Laravel instance is not provisioned yet.
- `.env.staging` — `VITE_HCAPTCHA_SITE_KEY` and `VITE_PUSHER_APP_KEY` are copies of the sandbox values until a dedicated staging hCaptcha pair / Pusher app exists.

Swap these per environment; do not move the values into the docs.

## One-time prerequisites

### Cloudflare API token

1. Cloudflare dashboard → **My Profile → API Tokens → Create Token**.
2. Use the **Edit Cloudflare Workers** template, or custom permissions:
   - `Account → Workers Scripts → Edit`
   - `Account → Account Settings → Read`
3. Scope it to the account (all zones optional — Workers deploys do not need zone permissions until custom domains are managed via API).

### GitHub secrets/variables

Repo **Settings → Secrets and variables → Actions**:

| Name | Kind | Value |
|------|------|-------|
| `CLOUDFLARE_API_TOKEN` | Secret | Token from above |
| `CLOUDFLARE_ACCOUNT_ID` | Secret | Dashboard → Workers & Pages → right rail "Account ID" |

### Branches

- `main` exists and deploys production.
- `main-sandbox` and `main-staging` are cut from `main` once (`git checkout -b main-sandbox main && git push -u origin main-sandbox`, same for `main-staging`); keep them merge-synchronized with `main` afterwards. Gotcha: if the first push only creates the branch from a commit that was already pushed elsewhere, the Actions tab may stay empty for the new branch — push a fresh commit to trigger the deploy (`git commit --allow-empty -m "trigger main-sandbox deploy" && git push`).
- The former `sandbox` branch is retired (`git push origin --delete sandbox`); it is superseded by `main-sandbox`. Deleting the branch does **not** delete the `monolith-spa-sandbox` Worker — the Worker is fed by `main-sandbox` now.
- The Workers themselves do not need to exist in advance — the first CI deploy creates `monolith-spa-prod` / `monolith-spa-sandbox` / `monolith-spa-staging` (a local `npm run deploy:<env>` works too).

### Adding another environment

Adding an environment (new branch + new Worker) touches six files plus the docs. Miss the resolver arm in `deploy.yml` and the deploy hard-fails with `Unmapped deploy branch <name>`; miss the Vite mode or the Wrangler env and the bundle bakes the wrong API origin.

| File | Change |
|------|--------|
| `wrangler.jsonc` | Add `env.<env>` with the Worker `name` |
| `.env.<env>` | New tracked mode file (mirror an existing one) |
| `.gitignore` | Add `!.env.<env>` to the allowlist — `.env*` is ignored by default |
| `package.json` | Add `deploy:<env>` = `cross-env CLOUDFLARE_ENV=<env>` + `vite build --mode <env>` + `wrangler deploy --env <env>` |
| `.github/workflows/deploy.yml` | Add the branch to `on.push.branches` **and** a `case` arm in the resolver step |
| `.github/workflows/ci.yml` | Add the branch to `on.push.branches` so direct pushes still run CI |
| Docs | `README.md` deployment table, the deploy map here, Monolith `docs/integration/project-overview.md` Deploy row |

Then create the branch from `main`, push, and confirm the first run logs `Uploaded <worker-name>` for that environment.

## Workflow

`.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main, main-sandbox, main-staging]

concurrency:
  group: deploy-${{ github.ref_name }}
  cancel-in-progress: false

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      # Branch → Vite mode + Wrangler env. The two names must stay identical
      # (the same-named `.env.<env>` file is baked and `--env` selects the
      # Worker); an unmapped branch fails loudly instead of defaulting to
      # production.
      - name: Resolve deploy environment
        run: |
          case "${GITHUB_REF_NAME}" in
            main)         ENV_NAME=production ;;
            main-sandbox) ENV_NAME=sandbox ;;
            main-staging) ENV_NAME=staging ;;
            *) echo "::error::Unmapped deploy branch ${GITHUB_REF_NAME}"; exit 1 ;;
          esac
          {
            echo "DEPLOY_ENV=${ENV_NAME}"
            echo "CLOUDFLARE_ENV=${ENV_NAME}"
          } >> "$GITHUB_ENV"
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run type-check
      - run: npm run check:i18n
      - run: npm test
      # CLOUDFLARE_ENV is already exported: @cloudflare/vite-plugin bakes the
      # environment's worker name into the redirected deploy config.
      - run: npx vite build --mode ${{ env.DEPLOY_ENV }}
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: deploy --env ${{ env.DEPLOY_ENV }}
```

The YAML above must always match the file. Design decisions:

- Quality gates (`type-check`, `check:i18n`, `test`) re-run inside the deploy job — a deploy never bypasses the CI gate.
- **The branch → env mapping is an explicit `case` that fails on an unmapped branch.** A branch that slips past `on.push.branches` (e.g. a wildcard added later) can never fall through to a production deploy; the job errors out with `Unmapped deploy branch <name>`.
- **`CLOUDFLARE_ENV` must be set on the build step.** `@cloudflare/vite-plugin` resolves the Wrangler environment at build time and writes a redirected config (`dist/<top-level-name>/wrangler.json` — the directory is keyed by the top-level worker name, so it stays `dist/monolith_spa_prod/` for every environment) carrying `targetEnvironment` and the environment's worker `name`. Without `CLOUDFLARE_ENV` the output config falls back to the top-level name (`monolith-spa-prod`) regardless of `--mode`/`--env`, so a sandbox or staging deploy would silently **overwrite the production Worker**. With `CLOUDFLARE_ENV` set, wrangler additionally hard-fails any `deploy --env` that mismatches the built `targetEnvironment`, so a mode/env mixup can no longer deploy at all.
- `cloudflare/wrangler-action@v3` is the official action; it reads `wrangler.jsonc` at the repo root and follows the plugin's redirected config automatically (the `--env` flag must still be passed so wrangler can verify it against the built `targetEnvironment`).
- `concurrency` is per-branch so a production, sandbox, and staging deploy may run in parallel, but two pushes to the same branch queue instead of overwriting each other.
- CI calls `vite build` and `wrangler deploy` as separate steps (not `npm run deploy:*`) so a failure is attributable to exactly one stage in the Actions log.

## Day-to-day flow

1. Work on `feat/*` branches.
2. Merge into `main-sandbox` → Actions auto-deploys the sandbox Worker.
3. Verify at the sandbox URL: API calls in the network tab target the sandbox API origin, login sets the `__Host-spa_jwt` cookie.
4. Merge into `main-staging` → Actions auto-deploys the staging Worker; verify there the same way (staging API origin).
5. Merge `main-staging` (or `main-sandbox`) into `main` — or PR `feat/*` directly to `main` after staging verification → Actions auto-deploys production.
6. Post-deploy verification (each environment):
   - Network tab: `/api/v1/*` requests go to the correct API origin for that environment.
   - Login works; cookie `__Host-spa_jwt` is set (`SameSite=None; Secure`).
   - Realtime (if enabled) connects with that environment's Pusher credentials.

Rollback: `npx wrangler rollback --env <env>` (picks a previous version), or revert the commit and push again.

## Backend coupling (Monolith)

The backend is deployed manually on the VPS and is out of scope here. Each backend environment must set `SPA_URL` to the matching SPA origin so CORS and SPA-minted URLs (password reset, email verify, iPaymu return) point at the right Worker:

| Monolith environment | `SPA_URL` |
|----------------------|-----------|
| production | `https://monolith-spa-prod.<account>.workers.dev` (or its custom domain) |
| staging | `https://monolith-spa-staging.<account>.workers.dev` (or its custom domain) |
| sandbox | `https://monolith-spa-sandbox.<account>.workers.dev` (or its custom domain) |

A Monolith instance only accepts origins in its CORS allowlist (`APP_URL` + `SPA_URL` + `CORS_EXTRA_ORIGINS`). Point each instance at its own Worker origin; add another Worker origin to `CORS_EXTRA_ORIGINS` only if that instance should accept it.

## Troubleshooting

| Symptom | Likely cause |
|---------|--------------|
| Sandbox deploy overwrote production (log shows `Uploaded monolith-spa-prod` on a sandbox run) | `CLOUDFLARE_ENV` missing on the build step — the plugin baked the top-level worker name into the redirected config |
| Deploy fails with `Unmapped deploy branch <name>` | The pushed branch is not in the workflow's `case` resolver — add the branch → env mapping (and the branch to `on.push.branches`) before deploying it |
| Deploy fails with `does not match the target environment ... used when building` | `--env` mismatches the `CLOUDFLARE_ENV` used at build — rebuild with the matching `CLOUDFLARE_ENV` (this guard is intentional; never bypass it) |
| Every API call 404s on the SPA origin | `VITE_API_BASE_URL` empty/placeholder in the baked env file, or the build ran without `--mode` |
| Bundle points at the wrong API origin | Build/deploy pairing broken (`--mode` ≠ `--env`), or the wrong branch deployed |
| Actions fails with auth error code 10000 | `CLOUDFLARE_API_TOKEN` missing/expired or lacks `Workers Scripts:Edit` |
| Login works locally but cookie never set on the deployed origin | Monolith `SPA_URL` does not match the SPA origin (CORS/cookie origin mismatch) |
| Random "CORS error" / `TypeError: Failed to fetch` on an arbitrary endpoint, clears on retry | Not a CORS misconfiguration. Another tab rotated the shared `__Host-spa_csrf` cookie mid-request; the client retries via [api-client.md](api-client.md#cross-tab-cookie-race-retry). If it persists, check `SPA_URL`/`CORS_EXTRA_ORIGINS` and that preflights allow `X-SPA-Origin` |
| "CORS error" **only** on `POST …/broadcasting/auth`, every time, never clears | Two causes, distinguishable in DevTools → Network. (1) The request URL is **not** `/api/v1/…`: the SPA hit the backend's web twin, which is CSRF-guarded and answers 403 — check `VITE_API_BASE_URL` ends with `/api/v1` (`apiOrigin()` now normalizes it, and warns in DEV). (2) The URL is right but the first authorize overlapped the `__Host-spa_csrf` write from `POST /batch` — the settle gate in `csrf.ts`/`useEcho.ts` prevents this, so a repeat means the gate was bypassed. Verify the backend side with `curl -i -X POST …/api/v1/broadcasting/auth -H "Origin: <spa-origin>"`: a 401 **with** `Access-Control-Allow-Origin` is healthy |
| CSV/file download saves with a generic name | API `config/cors.php` `exposed_headers` missing `Content-Disposition` — the browser hides the header cross-origin |
| Realtime silent | `VITE_PUSHER_APP_KEY` empty in that environment's tracked env file |
| Two deploys racing on one branch | Should not happen — `concurrency` queues per branch; check the group key if edited |
