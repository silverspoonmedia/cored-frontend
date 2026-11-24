// Usage: node scripts/check-curation-log.mjs
//
// Validates src/i18n/curation-log.json — the sidecar that records the
// "curated at <timestamp>" flag for every SPA translation a translation wave
// touched (JSON cannot carry comments). Fails when:
//
//   - version is missing or unknown
//   - a locale is not one of the seven supported codes
//   - a logged key no longer exists in en.json (stale entry)
//   - curated_at is not an ISO-8601 timestamp with a numeric offset
//   - a locale object is empty (log exists but records nothing)
//
// Wired into `npm run check:i18n` so a curation wave cannot silently drop its
// own provenance record.
import { readFileSync, existsSync } from 'node:fs'
import { loadLocale } from './lib/locale-files.mjs'

const LOG = new URL('../src/i18n/curation-log.json', import.meta.url)
const LOCALES = ['en', 'id']
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/

const failures = []

if (!existsSync(LOG)) {
  console.error('curation-log.json is missing; run a translation wave through scripts/apply-translations.mjs.')
  process.exit(1)
}

function flatten(value, prefix = '', out = new Map()) {
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      flatten(child, prefix ? `${prefix}.${key}` : key, out)
    }
    return out
  }
  out.set(prefix, value)
  return out
}

const log = JSON.parse(readFileSync(LOG, 'utf8'))
const en = flatten(loadLocale('en'))
const prefixes = new Set()
for (const key of en.keys()) {
  const parts = key.split('.')
  for (let i = 1; i < parts.length; i += 1) prefixes.add(parts.slice(0, i).join('.'))
}
const resolves = (key) => en.has(key) || prefixes.has(key)

if (log.version !== 1) failures.push(`unsupported log version: ${JSON.stringify(log.version)}`)
if (typeof log.updated_at !== 'string' || !ISO.test(log.updated_at)) {
  failures.push(`updated_at is not an ISO-8601 timestamp with offset: ${JSON.stringify(log.updated_at)}`)
}

let entries = 0
for (const [locale, keys] of Object.entries(log.locales ?? {})) {
  if (!LOCALES.includes(locale)) {
    failures.push(`unknown locale in curation log: ${locale}`)
    continue
  }

  const names = Object.keys(keys ?? {})
  if (names.length === 0) failures.push(`${locale}: curation log entry is empty`)

  for (const key of names) {
    entries += 1
    const record = keys[key] ?? {}

    if (!resolves(key)) failures.push(`${locale}.${key}: stale entry (key not found in en.json)`)
    if (typeof record.curated_at !== 'string' || !ISO.test(record.curated_at)) {
      failures.push(`${locale}.${key}: curated_at is not an ISO-8601 timestamp with offset`)
    }
    if (typeof record.surface !== 'string') failures.push(`${locale}.${key}: surface must be a string`)
    if (typeof record.source !== 'string') failures.push(`${locale}.${key}: source must be a string`)
  }
}

const summary = Object.entries(log.locales ?? {})
  .map(([locale, keys]) => `${locale}=${Object.keys(keys ?? {}).length}`)
  .join(' ')

console.log(`Curation log: ${entries} flagged key(s) across ${Object.keys(log.locales ?? {}).length} locale(s) — ${summary}`)

if (failures.length) {
  console.error(failures.join('\n'))
  process.exitCode = 1
} else {
  console.log('Curation log structure and provenance passed.')
}
