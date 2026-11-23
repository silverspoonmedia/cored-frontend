// Usage: node scripts/check-features.mjs
//
// Guards the core/features split that makes this SPA fork-ready.
//
// A feature is one optional product capability under `src/features/{name}/`
// with its translations under `src/i18n/features/{name}/`. The core shell must
// not know which features exist: it sees them only through the three seam
// modules `src/features/{registry,messages,types}.ts`. Without this guard the
// split rots silently — one convenience import from a core view re-couples the
// shell to a product, and a fork that deletes the feature no longer builds.
//
// Checks:
//   1. Imports: outside `src/features/**`, only the seam modules may be
//      imported from `@/features/*`. A core file importing a feature's view,
//      composable, route module or type is a coupling bug.
//   2. Registry: every directory in `src/features/` is imported by
//      `src/features/registry.ts` and listed in its `features` array, and every
//      entry there resolves to an existing directory with an `index.ts`.
//   3. Translations: every registered feature has `src/i18n/features/{name}/`
//      with one file per supported locale, and no other feature directory
//      exists under `src/i18n/features/`.
//   4. Neutrality: product names do not appear in core code or core copy —
//      comments and docblocks are ignored, `tests/**` is out of scope (a
//      feature's tests are deleted with the feature), and files under
//      `src/features/**` / `src/i18n/features/**` are the only place a product
//      name belongs.
//
// Wired into `npm run check:features`.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { LOCALES } from './lib/locale-files.mjs'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const srcDir = join(root, 'src')
const featuresDir = join(srcDir, 'features')
const registryFile = join(featuresDir, 'registry.ts')
const featureMessagesDir = join(srcDir, 'i18n', 'features')

/** The only modules core may import from `@/features/*`. */
const SEAM_MODULES = new Set(['registry', 'messages', 'types'])

/** Files scanned for product names; tests and features are excluded below. */
const NEUTRALITY_DIRS = ['api', 'assets', 'components', 'composables', 'i18n', 'layouts', 'lib', 'router', 'stores', 'utils', 'views']

/**
 * Provenance and guard machinery legitimately names the product it documents:
 * the curation log records the consuming file, and the locale/feature packs are
 * their own surfaces. Neutrality applies to what renders, not to metadata.
 */
const NEUTRALITY_EXEMPT = new Set([join(srcDir, 'i18n', 'curation-log.json')])

const failures = []
const toPosix = (path) => path.split(sep).join('/')
const rel = (path) => toPosix(relative(root, path))

function walk(directory, filter, out = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue
    const path = join(directory, entry.name)
    if (entry.isDirectory()) walk(path, filter, out)
    else if (filter(path)) out.push(path)
  }
  return out
}

const isCode = (path) => ['.ts', '.vue'].includes(extname(path))
const isLocaleJson = (path) => extname(path) === '.json'

// ---------------------------------------------------------------- directories

function featureDirs() {
  if (!existsSync(featuresDir)) return []

  return readdirSync(featuresDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
}

// ------------------------------------------------------------------ 1. imports

const PRODUCT_IMPORT = /(?:from\s+|import\s*\(\s*)['"]@\/features\/([^'"/]+)(\/[^'"]*)?['"]/g

for (const path of walk(srcDir, isCode)) {
  if (path.startsWith(featuresDir + sep)) continue

  const contents = readFileSync(path, 'utf8')
  for (const match of contents.matchAll(PRODUCT_IMPORT)) {
    const [, target, rest] = match
    if (SEAM_MODULES.has(target) && !rest) continue
    failures.push(
      `${rel(path)}: core file imports ${match[0].trim()} — only @/features/{${[...SEAM_MODULES].join(',')}} may be imported outside src/features/**`,
    )
  }
}

// ----------------------------------------------------------------- 2. registry

const registry = existsSync(registryFile) ? readFileSync(registryFile, 'utf8') : ''
if (!registry) failures.push('src/features/registry.ts is missing — the shell has no feature seam')

/** `identifier -> '@/features/name'` from the registry's imports. */
const registryImports = new Map()
for (const match of registry.matchAll(/import\s*\{\s*(\w+)\s*\}\s*from\s*['"]@\/features\/([^'"/]+)['"]/g)) {
  registryImports.set(match[1], match[2])
}

const arrayMatch = registry.match(/features\s*:\s*FeatureModule\[\]\s*=\s*\[([^\]]*)\]/)
if (!arrayMatch) {
  failures.push('src/features/registry.ts: no `features: FeatureModule[] = [...]` array found')
}
const registered = (arrayMatch?.[1] ?? '')
  .split(',')
  .map((entry) => entry.trim())
  .filter(Boolean)

for (const identifier of registered) {
  const name = registryImports.get(identifier)
  if (!name) {
    failures.push(`src/features/registry.ts: ${identifier} is listed but not imported from @/features/<name>`)
    continue
  }
  if (!existsSync(join(featuresDir, name, 'index.ts'))) {
    failures.push(`src/features/registry.ts: @/features/${name} has no index.ts`)
  }
}

const registeredNames = new Set(registered.map((identifier) => registryImports.get(identifier)).filter(Boolean))
for (const name of featureDirs()) {
  if (!registeredNames.has(name)) {
    failures.push(`src/features/${name}/ is not in the registry's features array — a fork would ship it silently or never boot it`)
  }
}
for (const name of registeredNames) {
  if (!featureDirs().includes(name)) {
    failures.push(`src/features/registry.ts: @/features/${name} does not exist`)
  }
}

// ------------------------------------------------------------- 3. translations

function featureLocaleDirs() {
  if (!existsSync(featureMessagesDir)) return []

  return readdirSync(featureMessagesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
}

for (const name of registeredNames) {
  const directory = join(featureMessagesDir, name)
  if (!existsSync(directory)) {
    failures.push(`src/features/${name}/ is registered but src/i18n/features/${name}/ does not exist`)
    continue
  }
  for (const locale of LOCALES) {
    if (!existsSync(join(directory, `${locale}.json`))) {
      failures.push(`src/i18n/features/${name}/${locale}.json is missing — every locale ships in the same change`)
    }
  }
}

for (const name of featureLocaleDirs()) {
  if (!registeredNames.has(name)) {
    failures.push(`src/i18n/features/${name}/ has no matching feature in src/features/ — dead translation pack`)
  }
}

// -------------------------------------------------------------- 4. neutrality

/** Strip comments so a docblock may still explain the seam in prose. */
function stripComments(contents) {
  return contents
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
}

const productNames = [...new Set([...featureDirs(), ...featureLocaleDirs()])].filter((name) => name.length > 2)

for (const directory of NEUTRALITY_DIRS) {
  const absolute = join(srcDir, directory)
  if (!existsSync(absolute) || !statSync(absolute).isDirectory()) continue

  for (const path of walk(absolute, (entry) => isCode(entry) || isLocaleJson(entry))) {
    if (path.startsWith(featureMessagesDir + sep) || NEUTRALITY_EXEMPT.has(path)) continue

    const contents = stripComments(readFileSync(path, 'utf8'))
    for (const name of productNames) {
      const pattern = new RegExp(`\\b${name}\\b`, 'i')
      if (!pattern.test(contents)) continue
      const line = contents.split(/\r?\n/).findIndex((text) => pattern.test(text)) + 1
      failures.push(
        `${rel(path)}:${line}: product name "${name}" in core — keep product names under src/features/** or src/i18n/features/**`,
      )
    }
  }
}

// ---------------------------------------------------------------------- report

console.log(
  `Features: ${registeredNames.size} registered (${[...registeredNames].join(', ') || 'none'}) across ${LOCALES.length} locale(s).`,
)

if (failures.length) {
  console.error(failures.join('\n'))
  process.exitCode = 1
} else {
  console.log('Core/features split, registry, translation packs and neutrality passed.')
}
