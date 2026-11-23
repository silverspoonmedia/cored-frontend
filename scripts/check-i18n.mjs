import { readFile } from 'node:fs/promises'
import { readdir } from 'node:fs/promises'
import { extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { allDuplicateEnglishKeys, isDuplicateEnglishAllowed } from './lib/duplicate-english-allowlist.mjs'
import { LOCALES as locales, loadLocale } from './lib/locale-files.mjs'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const sourceDir = join(root, 'src')

const hardcodedPatterns = [
  /['"]Failed to [^'"\n]+['"]/g,
  /['"]Validation failed['"]/g,
  /['"]Request failed['"]/g,
  /['"]Session expired['"]/g,
  /['"]Are you sure\?['"]/g,
]
const allowlistedSourcePaths = new Set()

function namespaceFor(key) {
  const parts = key.split('.')
  return parts.length > 1 ? parts.slice(0, 2).join('.') : (parts[0] || '(root)')
}

function flatten(value, prefix = '', output = new Map()) {
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      flatten(child, prefix ? `${prefix}.${key}` : key, output)
    }
    return output
  }

  output.set(prefix, value)
  return output
}

// Flattening hides structure, so a locale that groups `microstock.ai.vision.connection`
// as nested objects looks identical to one that stores it as the single literal key
// `fields['microstock.ai.vision.connection']`. Settings labels are read through
// lookupDotted(), which accepts both, but a divergent shape breaks any tooling that
// addresses the literal key (and silently mis-places newly added settings). Track
// containers so the shapes have to match en.
function containerPaths(value, prefix = '', output = new Set()) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) {
      const path = prefix ? `${prefix}.${key}` : key
      if (child && typeof child === 'object' && !Array.isArray(child)) {
        output.add(path)
        containerPaths(child, path, output)
      }
    }
  }
  return output
}

function tokens(value) {
  if (typeof value !== 'string') return []

  return [...value.matchAll(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g)]
    .map((match) => match[1])
    .sort()
}

function malformedPlaceholders(value) {
  if (typeof value !== 'string') return false

  let depth = 0
  for (const character of value) {
    if (character === '{') depth += 1
    if (character === '}') depth -= 1
    if (depth < 0) return true
  }
  return depth !== 0
}

/**
 * A placeholder glued to a preceding letter or digit is never a valid vue-i18n
 * message: interpolation is `{name}` after whitespace or punctuation. It means a
 * literal colon in the source was rewritten to the placeholder sigil — the way
 * `php artisan payments:sync-routing-policy` became `payments{sync}-routing-policy`
 * in all seven locales. Balanced braces and matching token sets cannot see it,
 * because the token is not part of the intended message at all.
 */
function gluedPlaceholder(value) {
  if (typeof value !== 'string') return false

  return /[A-Za-z0-9]\{[A-Za-z_][A-Za-z0-9_]*\}/.test(value)
}

async function listSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    if (entry.name === 'i18n' || entry.name === 'node_modules') continue
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...await listSourceFiles(path))
    } else if (['.ts', '.vue'].includes(extname(entry.name))) {
      files.push(path)
    }
  }
  return files
}

const rawMessages = Object.fromEntries(
  locales.map((locale) => [locale, loadLocale(locale)]),
)
const messages = Object.fromEntries(
  locales.map((locale) => [locale, flatten(rawMessages[locale])]),
)
const referenceKeys = [...messages.en.keys()].sort()
const enContainers = containerPaths(rawMessages.en)
const failures = []
const duplicates = []
const duplicateReport = new Map()

for (const key of referenceKeys) {
  const referenceValue = messages.en.get(key)
  if (typeof referenceValue !== 'string' || referenceValue.trim() === '') continue

  for (const locale of locales.slice(1)) {
    const value = messages[locale].get(key)
    if (typeof value !== 'string' || value.trim() === '') {
      failures.push(`${locale}.${key}: empty translation`)
    }
  }
}

for (const locale of locales.slice(1)) {
  const keys = [...messages[locale].keys()].sort()
  const missing = referenceKeys.filter((key) => !messages[locale].has(key))
  const extra = keys.filter((key) => !messages.en.has(key))
  if (missing.length || extra.length) {
    failures.push(`${locale}: key parity failed (missing ${missing.length}, extra ${extra.length})`)
    if (missing.length) failures.push(`  missing: ${missing.slice(0, 20).join(', ')}`)
    if (extra.length) failures.push(`  extra: ${extra.slice(0, 20).join(', ')}`)
  }

  const extraContainers = [...containerPaths(rawMessages[locale])]
    .filter((path) => !enContainers.has(path))
  if (extraContainers.length) {
    failures.push(`${locale}: nested container structure differs from en (${extraContainers.length} container(s) en keeps as flat literal keys)`)
    failures.push(`  extra containers: ${extraContainers.slice(0, 20).join(', ')}`)
  }
}

for (const key of referenceKeys) {
  for (const locale of locales) {
    const value = messages[locale].get(key)
    if (malformedPlaceholders(value)) {
      failures.push(`${locale}.${key}: malformed placeholder braces`)
    }

    if (gluedPlaceholder(value)) {
      failures.push(`${locale}.${key}: placeholder glued to a preceding character — a literal colon was probably rewritten to the placeholder sigil`)
    }
  }

  const referenceTokens = tokens(messages.en.get(key)).join('|')
  for (const locale of locales.slice(1)) {
    const localeTokens = tokens(messages[locale].get(key)).join('|')
    if (referenceTokens !== localeTokens && !key.startsWith('validation.')) {
      failures.push(`${locale}.${key}: placeholder mismatch (${referenceTokens || 'none'} vs ${localeTokens || 'none'})`)
    }
  }

  for (const locale of locales.slice(1)) {
    if (messages[locale].get(key) !== messages.en.get(key) || !/[A-Za-z]/.test(String(messages.en.get(key)))) {
      continue
    }

    const duplicate = {
      locale,
      key,
      namespace: namespaceFor(key),
      value: messages.en.get(key),
      allowed: isDuplicateEnglishAllowed(key, locale),
    }
    duplicates.push(duplicate)

    const reportKey = `${locale}.${duplicate.namespace}`
    duplicateReport.set(reportKey, (duplicateReport.get(reportKey) ?? 0) + 1)

    if (!duplicate.allowed) {
      failures.push(`${locale}.${key}: same as English outside duplicate-English allowlist: ${JSON.stringify(messages.en.get(key))}`)
    }
  }
}

const sourceFiles = await listSourceFiles(sourceDir)
const hardcoded = []
for (const path of sourceFiles) {
  const contents = await readFile(path, 'utf8')
  const relativePath = relative(root, path).replaceAll('\\', '/')
  if (allowlistedSourcePaths.has(relativePath)) continue
  for (const pattern of hardcodedPatterns) {
    for (const match of contents.matchAll(pattern)) {
      const line = contents.slice(0, match.index).split('\n').length
      hardcoded.push(`${relative(root, path).replaceAll('\\', '/')}:${line}: ${match[0]}`)
    }
  }
}
if (hardcoded.length) {
  failures.push(`hardcoded user-facing fallback copy found (${hardcoded.length})`)
  failures.push(...hardcoded.slice(0, 30).map((entry) => `  ${entry}`))
}

console.log(`Checked ${referenceKeys.length} translation keys across ${locales.join(', ')}.`)
console.log(`Duplicate-English allowlist entries: ${allDuplicateEnglishKeys().length}.`)
console.log(`Duplicate-English values: ${duplicates.length} (${duplicates.filter(({ allowed }) => allowed).length} allowlisted, ${duplicates.filter(({ allowed }) => !allowed).length} failures).`)
for (const [reportKey, count] of [...duplicateReport.entries()].sort()) {
  console.log(`DUPLICATES ${reportKey}: ${count}`)
}

if (failures.length) {
  console.error(failures.join('\n'))
  process.exitCode = 1
} else {
  console.log('Localization structure, placeholders, duplicate-English policy, and hardcoded-copy policy passed.')
}
