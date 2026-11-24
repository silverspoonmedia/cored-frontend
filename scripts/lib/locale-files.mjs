// Usage: import from scripts/lib/locale-files.mjs
//
// Shared discovery of SPA translation files.
//
// Translations live in two places:
//   - src/i18n/locales/{locale}.json         core (kernel + non-product domains)
//   - src/i18n/features/{name}/{locale}.json one file per product feature
//
// A feature's file only carries the namespaces that feature owns, so the guards
// flatten core + every feature into one message tree per locale before they
// compare locales with each other or resolve a `t()` key.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const LOCALES = ['en', 'id']

const root = fileURLToPath(new URL('../../', import.meta.url))
export const localeDir = join(root, 'src', 'i18n', 'locales')
export const featuresDir = join(root, 'src', 'i18n', 'features')

export function isContainer(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Deep merge, later values winning. */
export function mergeMessages(base, overlay) {
  const out = { ...base }

  for (const [key, value] of Object.entries(overlay)) {
    out[key] = isContainer(out[key]) && isContainer(value)
      ? mergeMessages(out[key], value)
      : value
  }

  return out
}

/** Feature names that ship a translation directory, sorted for stable output. */
export function featureNames() {
  if (!existsSync(featuresDir)) return []

  return readdirSync(featuresDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
}

/** Every JSON file that contributes to `locale`, core first, then features. */
export function localeFiles(locale) {
  const files = [join(localeDir, `${locale}.json`)]

  for (const feature of featureNames()) {
    const path = join(featuresDir, feature, `${locale}.json`)
    if (existsSync(path)) files.push(path)
  }

  return files
}

/** `{ path, messages }` for a locale, core first — for per-file checks. */
export function loadLocaleParts(locale) {
  return localeFiles(locale).map((path) => ({
    path,
    messages: JSON.parse(readFileSync(path, 'utf8')),
  }))
}

/** Full message tree for a locale: core JSON merged with every feature file. */
export function loadLocale(locale) {
  return loadLocaleParts(locale).reduce(
    (acc, part) => mergeMessages(acc, part.messages),
    {},
  )
}
