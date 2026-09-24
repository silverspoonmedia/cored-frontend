// Usage: node scripts/i18n-pair-dump.mjs <locale> [options]
//
// Read-only review dump for one SPA locale. Prints TAB-separated rows so a
// translation wave can be reviewed key by key against the English source:
//
//   <key>\t<en>\t<locale>
//
// Options:
//   --ns=<prefix>   only keys under this dotted prefix (e.g. web.payments)
//   --identical     only keys whose locale value is exactly the English value
//   --missing       only keys absent (or empty) in the locale
//   --count         print per-namespace counts instead of rows
//   --limit=<n>     cap the number of rows
//
// Non-string leaves (option maps, nested groups) are skipped; read those through
// the parent key with tm() in the app.
import { readFileSync } from 'node:fs'

const LOCALE_DIR = new URL('../src/i18n/locales/', import.meta.url)
const args = process.argv.slice(2)
const locale = args.find((a) => !a.startsWith('--'))

if (!locale) {
  console.error('usage: node scripts/i18n-pair-dump.mjs <locale> [--ns=<prefix>] [--identical] [--missing] [--count] [--limit=<n>]')
  process.exit(1)
}

const nsFilter = args.find((a) => a.startsWith('--ns='))?.slice(5) ?? null
const onlyIdentical = args.includes('--identical')
const onlyMissing = args.includes('--missing')
const countMode = args.includes('--count')
const limit = Number(args.find((a) => a.startsWith('--limit='))?.slice(8) ?? '0')

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

const load = (name) => flatten(JSON.parse(readFileSync(new URL(`${name}.json`, LOCALE_DIR), 'utf8')))
const en = load('en')

let target
try {
  target = load(locale)
} catch {
  console.error(`unknown locale file: ${locale}.json`)
  process.exit(1)
}

const rows = []
const counts = new Map()
let total = 0

for (const [key, english] of en) {
  if (typeof english !== 'string' || english.trim() === '') continue
  if (nsFilter && !(key === nsFilter || key.startsWith(`${nsFilter}.`))) continue

  const value = target.get(key)
  const missing = typeof value !== 'string' || value.trim() === ''
  const identical = !missing && value === english

  if (onlyMissing && !missing) continue
  if (onlyIdentical && !identical) continue

  total += 1
  const namespace = key.split('.').slice(0, 2).join('.')
  counts.set(namespace, (counts.get(namespace) ?? 0) + 1)

  if (!countMode) rows.push(`${key}\t${english}\t${missing ? '<MISSING>' : value}`)
}

if (countMode) {
  for (const [namespace, count] of [...counts.entries()].sort()) {
    console.log(`${namespace}\t${count}`)
  }
  console.log(`TOTAL\t${total}`)
} else {
  const capped = limit > 0 ? rows.slice(0, limit) : rows
  console.log(capped.join('\n'))
  console.error(`rows=${rows.length} shown=${capped.length} locale=${locale}`)
}
