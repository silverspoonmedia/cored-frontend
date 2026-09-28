// Usage: node scripts/check-mode-env.mjs
//
// Gate for the tracked Vite mode files (`.env.production`, `.env.staging`,
// `.env.sandbox`). Those values are baked into the browser bundle, and the
// branch -> mode -> Wrangler mapping is already enforced by `deploy.yml`. What
// nothing enforced until now was the *content*: a production build pointing at
// the sandbox API origin, a mode file that lost a required key, or a value left
// as a placeholder all built and deployed green.
//
// The failure modes this catches:
//
//   - a deployed environment calls the wrong Laravel origin (wrong data, or a
//     production UI writing into sandbox);
//   - a required `VITE_*` key is missing or empty, so the feature silently
//     turns off (realtime, captcha) instead of failing the build;
//   - a placeholder (`example.com`, `localhost`, `CHANGEME`) shipped as a real
//     origin;
//   - an unresolved `TODO` marker left in a file that is supposed to be final.
//
// Sharing a non-origin credential between environments is reported as a warning
// rather than a failure: it is drift worth surfacing, but it does not send
// traffic to the wrong backend.
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** Mode file -> the environment it bakes. `sandbox` is the sandbox worker. */
const MODES = {
  production: '.env.production',
  staging: '.env.staging',
  sandbox: '.env.sandbox',
}

/**
 * Keys every mode file must define with a non-empty value.
 *
 * `VITE_PUSHER_HOST` is deliberately absent: an empty host is the documented
 * default (the Pusher SDK then uses the cluster endpoint).
 */
const REQUIRED_KEYS = [
  'VITE_API_BASE_URL',
  'VITE_HCAPTCHA_SITE_KEY',
  'VITE_PUSHER_APP_KEY',
  'VITE_PUSHER_PORT',
  'VITE_PUSHER_SCHEME',
  'VITE_PUSHER_APP_CLUSTER',
]

/** Credentials that should be per-environment but are not origin-critical. */
const SHARED_CREDENTIAL_KEYS = ['VITE_HCAPTCHA_SITE_KEY', 'VITE_PUSHER_APP_KEY']

const PLACEHOLDER_PATTERNS = [
  /example\.com/i,
  /localhost/i,
  /127\.0\.0\.1/,
  /CHANGEME/i,
  /^x+$/i,
  /<[^>]+>/,
]

const failures = []
const warnings = []
const fail = (message) => failures.push(message)
const warn = (message) => warnings.push(message)

/**
 * Parse a dotenv-style file into `{ KEY: value }`, unquoting the value and
 * dropping a trailing inline comment. Deliberately minimal — these files are
 * tracked templates, not user-authored dotenv.
 *
 * @param {string} contents
 * @returns {Record<string, string>}
 */
function parseEnv(contents) {
  const out = {}

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (line === '' || line.startsWith('#')) continue

    const eq = line.indexOf('=')
    if (eq === -1) continue

    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()

    const quoted = /^(['"])(.*)\1$/.exec(value)
    if (quoted) {
      value = quoted[2]
    } else {
      value = value.replace(/\s+#.*$/, '').trim()
    }

    out[key] = value
  }

  return out
}

/** The bare host of an absolute URL, or `null` when it cannot be parsed. */
function hostOf(url) {
  try {
    return new URL(url).host.toLowerCase()
  } catch {
    return null
  }
}

const parsed = {}
const raw = {}

for (const [mode, file] of Object.entries(MODES)) {
  const path = join(ROOT, file)

  if (!existsSync(path)) {
    fail(`${file}: missing — every deploy mode needs a tracked mode file`)
    continue
  }

  const contents = readFileSync(path, 'utf8')
  raw[mode] = contents
  parsed[mode] = parseEnv(contents)

  if (/^\s*#.*\bTODO\b/m.test(contents)) {
    fail(`${file}: unresolved TODO marker — a tracked mode file must be final`)
  }

  for (const key of REQUIRED_KEYS) {
    const value = parsed[mode][key]
    if (value === undefined) {
      fail(`${file}: required key ${key} is missing`)
      continue
    }
    if (value === '') {
      fail(`${file}: required key ${key} is empty`)
      continue
    }
    const placeholder = PLACEHOLDER_PATTERNS.find((pattern) => pattern.test(value))
    if (placeholder) {
      fail(`${file}: ${key} looks like a placeholder (${value})`)
    }
  }

  const apiBase = parsed[mode].VITE_API_BASE_URL ?? ''
  if (apiBase !== '' && !apiBase.replace(/\/$/, '').endsWith('/api/v1')) {
    fail(`${file}: VITE_API_BASE_URL must end with /api/v1 (got ${apiBase})`)
  }

  if (hostOf(apiBase) === null && apiBase !== '') {
    fail(`${file}: VITE_API_BASE_URL is not an absolute URL (got ${apiBase})`)
  }
}

// Production and staging must never point at the sandbox backend. This is the
// exact drift the file carried before the guard existed.
for (const mode of ['production', 'staging']) {
  const host = hostOf(parsed[mode]?.VITE_API_BASE_URL ?? '')
  if (host !== null && /sandbox/.test(host)) {
    fail(
      `.env.${mode}: VITE_API_BASE_URL points at a sandbox host (${host}) — ` +
        'a deployed environment must call its own API origin',
    )
  }
}

// Two environments sharing an origin means one of them is misconfigured: the
// bundle cannot tell them apart, so the wrong database gets the writes.
const hostsByMode = Object.fromEntries(
  Object.entries(parsed).map(([mode, values]) => [mode, hostOf(values.VITE_API_BASE_URL ?? '')]),
)

const reportedClashes = new Set()
for (const [mode, host] of Object.entries(hostsByMode)) {
  if (host === null) continue
  for (const [other, otherHost] of Object.entries(hostsByMode)) {
    if (other === mode || otherHost !== host) continue
    const pair = [mode, other].sort().join('|')
    if (reportedClashes.has(pair)) continue
    reportedClashes.add(pair)
    fail(`${MODES[mode]} and ${MODES[other]} share the API origin ${host}`)
  }
}

// Non-origin credentials: surfaced, not fatal.
for (const key of SHARED_CREDENTIAL_KEYS) {
  const byValue = new Map()
  for (const [mode, values] of Object.entries(parsed)) {
    const value = values[key]
    if (!value) continue
    byValue.set(value, [...(byValue.get(value) ?? []), mode])
  }
  for (const [value, modes] of byValue) {
    if (modes.length > 1) {
      warn(`${key} is shared by ${modes.join(', ')} (${value}) — use per-environment credentials`)
    }
  }
}

for (const message of warnings) {
  console.warn(`warn  ${message}`)
}

if (failures.length > 0) {
  console.error(`\nmode env guard: ${failures.length} problem(s)\n`)
  for (const message of failures) {
    console.error(`fail  ${message}`)
  }
  process.exit(1)
}

const checked = Object.keys(parsed).length
console.log(
  `mode env guard OK — ${checked} mode file(s) checked, ` +
    `${REQUIRED_KEYS.length} required key(s) each` +
    (warnings.length > 0 ? `, ${warnings.length} warning(s)` : ''),
)
