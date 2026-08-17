import { readFile } from 'node:fs/promises'
import { readdir } from 'node:fs/promises'
import { extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const localeDir = join(root, 'src', 'i18n', 'locales')
const locales = ['en', 'id', 'ja']
const sourceDir = join(root, 'src')

const hardcodedPatterns = [
  /['"]Failed to [^'"\n]+['"]/g,
  /['"]Validation failed['"]/g,
  /['"]Request failed['"]/g,
  /['"]Session expired['"]/g,
  /['"]Are you sure\?['"]/g,
]
const allowlistedSourcePaths = new Set()

function flatten(value, prefix = '', output = new Map()) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) {
      flatten(child, prefix ? `${prefix}.${key}` : key, output)
    }
    return output
  }

  output.set(prefix, value)
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

async function loadLocale(locale) {
  const path = join(localeDir, `${locale}.json`)
  return JSON.parse(await readFile(path, 'utf8'))
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

const messages = Object.fromEntries(await Promise.all(
  locales.map(async (locale) => [locale, flatten(await loadLocale(locale))]),
))
const referenceKeys = [...messages.en.keys()].sort()
const failures = []
const warnings = []

for (const locale of locales.slice(1)) {
  const keys = [...messages[locale].keys()].sort()
  const missing = referenceKeys.filter((key) => !messages[locale].has(key))
  const extra = keys.filter((key) => !messages.en.has(key))
  if (missing.length || extra.length) {
    failures.push(`${locale}: key parity failed (missing ${missing.length}, extra ${extra.length})`)
    if (missing.length) failures.push(`  missing: ${missing.slice(0, 20).join(', ')}`)
    if (extra.length) failures.push(`  extra: ${extra.slice(0, 20).join(', ')}`)
  }
}

for (const key of referenceKeys) {
  for (const locale of locales) {
    const value = messages[locale].get(key)
    if (malformedPlaceholders(value)) {
      failures.push(`${locale}.${key}: malformed placeholder braces`)
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
    if (messages[locale].get(key) === messages.en.get(key) && /[A-Za-z]/.test(String(messages.en.get(key)))) {
      warnings.push(`${locale}.${key}: same as English: ${JSON.stringify(messages.en.get(key))}`)
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
console.log(`Suspicious English duplicates: ${warnings.length} (report only; allow technical terms and product names).`)
for (const warning of warnings.slice(0, 80)) console.log(`WARN ${warning}`)
if (warnings.length > 80) console.log(`WARN ... ${warnings.length - 80} more duplicates`)

if (failures.length) {
  console.error(failures.join('\n'))
  process.exitCode = 1
} else {
  console.log('Localization structure, placeholders, and hardcoded-copy policy passed.')
}
