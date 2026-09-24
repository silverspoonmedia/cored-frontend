// Usage: node scripts/check-i18n-usage.mjs
//
// Guards the "raw key rendered to the user" failure mode: a `t()` call whose
// literal key exists in NO locale file falls through to the fallback locale and
// still prints the dotted key. check-i18n.mjs only compares locale files with
// each other, so it cannot see this class of bug.
//
// Scans src/**/*.{ts,vue} for literal t()/tm()/te()/rt()/$t() keys and asserts
// each one resolves in en.json — either as a leaf value or as an object prefix
// (option maps and grouped subtrees are addressed by their parent key).
//
// Keys built from a template literal (e.g. `web.x.status.${row.status}`) are
// reported as informational: the checker resolves the static prefix when one
// exists and only warns when nothing matches.
//
// Wired into `npm run check:i18n`.
import { readFileSync, readdirSync } from 'node:fs'
import { extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const localeDir = join(root, 'src', 'i18n', 'locales')
const sourceDir = join(root, 'src')

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

const en = flatten(JSON.parse(readFileSync(join(localeDir, 'en.json'), 'utf8')))
const prefixes = new Set()
for (const key of en.keys()) {
  const parts = key.split('.')
  for (let i = 1; i < parts.length; i += 1) prefixes.add(parts.slice(0, i).join('.'))
}
const resolves = (key) => en.has(key) || prefixes.has(key)

/** Any en key that continues the literal, e.g. `web.x.status_` -> `status_active`. */
const hasFamily = (literal) => {
  for (const key of en.keys()) {
    if (key.startsWith(literal)) return true
  }
  return false
}

async function listSourceFiles(directory) {
  const files = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'i18n') continue
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...await listSourceFiles(path))
    } else if (['.ts', '.vue'].includes(extname(entry.name))) {
      files.push(path)
    }
  }
  return files
}

const CALL = /(?:^|[^\w$])(?:t|tm|te|rt|\$t)\(\s*(["'`])([^"'`]*)\1/g

/**
 * True when the literal is only part of the key — i.e. the call's first argument
 * is a concatenation such as `t('web.x.roles.' + role)`. Such keys are dynamic,
 * so only their static prefix can be verified.
 */
function isConcatenated(contents, openParenIndex) {
  let depth = 0
  let quote = null
  for (let i = openParenIndex; i < contents.length; i += 1) {
    const char = contents[i]
    if (quote) {
      if (char === '\\') i += 1
      else if (char === quote) quote = null
      continue
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char
      continue
    }
    if (char === '(' || char === '[' || char === '{') depth += 1
    else if (char === ')' || char === ']' || char === '}') {
      depth -= 1
      if (depth === 0) return false
    } else if (char === '+' && depth === 1) return true
    else if (char === '\n' && depth === 0) return false
  }
  return false
}

const failures = []
const warnings = []
let checked = 0

for (const path of await listSourceFiles(sourceDir)) {
  const contents = readFileSync(path, 'utf8')
  const relativePath = relative(root, path).replaceAll('\\', '/')

  for (const match of contents.matchAll(CALL)) {
    const raw = match[2]
    const line = contents.slice(0, match.index).split('\n').length

    if (raw === '') continue

    const openParenIndex = match.index + match[0].indexOf('(')
    const concatenated = isConcatenated(contents, openParenIndex)

    if (raw.includes('${') || concatenated) {
      const staticPrefix = (raw.includes('${') ? raw.slice(0, raw.indexOf('${')) : raw)
        .replace(/[.]+$/, '')
      if (staticPrefix && !resolves(staticPrefix) && !hasFamily(staticPrefix)) {
        warnings.push(`${relativePath}:${line}: dynamic key with unresolved prefix ${JSON.stringify(raw)}`)
      }
      continue
    }

    checked += 1
    if (!resolves(raw)) {
      failures.push(`${relativePath}:${line}: key not found in en.json: ${JSON.stringify(raw)}`)
    }
  }
}

console.log(`Checked ${checked} literal translation key(s) in src/**/*.{ts,vue} against en.json.`)
if (warnings.length) {
  console.log(`Dynamic keys with an unresolved static prefix: ${warnings.length}`)
  for (const warning of warnings.slice(0, 20)) console.log(`  ${warning}`)
}

if (failures.length) {
  console.error(`Unresolved translation keys: ${failures.length}`)
  console.error(failures.slice(0, 60).join('\n'))
  if (failures.length > 60) console.error(`  ... and ${failures.length - 60} more`)
  process.exitCode = 1
} else {
  console.log('Every literal translation key resolves in en.json.')
}
