import { readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const locales = ['en', 'id', 'ja', 'ko', 'zh-CN', 'ar', 'ru']
const nonEnglishLocales = locales.slice(1)
const allowlist = new Set([
  'api.common.pong',
  'ui.swal.ok',
  'validation.attributes.h-captcha-response',
  'web.archivd.blocklist_sha256',
  'web.archivd.blocklist_sha256_col',
  'web.archivd.microstock_title',
  'web.identity-connections.discord_heading',
  'web.identity-connections.provider_heading',
  'web.microstock-credentials.marketplaces.123rf',
  'web.microstock-credentials.marketplaces.adobe_stock',
  'web.microstock-credentials.marketplaces.depositphotos',
  'web.microstock-credentials.marketplaces.dreamstime',
  'web.microstock-credentials.marketplaces.freepik',
  'web.microstock-credentials.marketplaces.getty_images',
  'web.microstock-credentials.marketplaces.istock',
  'web.microstock-credentials.marketplaces.shutterstock',
  'web.microstock-credentials.marketplaces.vecteezy',
  'web.payments.channels.kinds.qris',
  'web.payments.subscriptions.fields.date_hint',
  'web.vtual.url',
  'web.vtual.profiles.uuid_placeholder',
  'web.vtual.profiles.fields.link_url',
  'web.vtual.probe.method_fetch_videos',
  'web.vtual.probe.method_fetch_videos_chunked',
  'web.vtual.probe.method_fetch_channels',
  'web.vtual.probe.method_resolve_channel',
  'web.vtual-vtuber.content_type.vod',
  'product-activations.tier_n/a',
  'web.vtual.public.directory.live',
  'web.vtual.public.live_now.badge',
  'web.vtual.public.profile.live',
  'web.vtual.public.profile.vod',
  'web.services.show.stack_quantity_equation',
  'web.vtual-orphans.form.avatar_url_placeholder',
  'web.vtual-orphans.channels.profile_placeholder_youtube',
  'web.vtual.profile_placeholder_youtube',
])

function flatten(value, prefix = '', output = {}) {
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      flatten(child, prefix ? `${prefix}.${key}` : key, output)
    }
    return output
  }

  output[prefix] = value
  return output
}

function tokens(value) {
  if (typeof value !== 'string') return []
  return [...value.matchAll(/\{(?:'([^']+)'|([^}]+))\}/g)]
    .map((match) => match[1] ?? match[2])
    .sort()
}

function classify(key, value) {
  if (allowlist.has(key)) {
    if (/marketplaces|discord_heading|microstock_title/.test(key)) return 'brand'
    if (/placeholder|equation|provider_heading/.test(key)) return 'format'
    return 'identifier'
  }
  if (key.startsWith('validation.')) return 'validation'
  if (key.startsWith('http-statuses.')) return 'http-status'
  if (/^(?:[A-Z0-9]+(?:[._:/+-][A-Z0-9]+)*)$/.test(String(value))) return 'identifier'
  return 'user-facing'
}

function namespaceFor(key) {
  const parts = key.split('.')
  return parts.length > 1 ? parts.slice(0, 2).join('.') : '(root)'
}

const messages = Object.fromEntries(await Promise.all(
  locales.map(async (locale) => [
    locale,
    flatten(JSON.parse(await readFile(join(root, 'src', 'i18n', 'locales', `${locale}.json`), 'utf8'))),
  ]),
))

const englishKeys = Object.keys(messages.en).sort()
const staleAllowlist = [...allowlist].filter((key) => !Object.hasOwn(messages.en, key)).sort()
const emptyTranslations = {}
const byLocale = {}
let duplicatePairs = 0
const duplicateKeys = new Set()

for (const locale of nonEnglishLocales) {
  const byNamespace = {}
  const emptyKeys = []
  for (const key of englishKeys) {
    const english = messages.en[key]
    const value = messages[locale][key]
    if (typeof english === 'string' && english.trim() !== '' && (typeof value !== 'string' || value.trim() === '')) {
      emptyKeys.push(key)
    }
    if (value !== english || !/[A-Za-z]/.test(String(english))) continue

    const allowed = allowlist.has(key)
    const namespace = namespaceFor(key)
    byNamespace[namespace] ??= { count: 0, keys: [] }
    byNamespace[namespace].count += 1
    byNamespace[namespace].keys.push({
      key,
      english,
      classification: classify(key, english),
      allowed,
      placeholders: tokens(english),
    })
    duplicatePairs += 1
    duplicateKeys.add(key)
  }

  emptyTranslations[locale] = emptyKeys.sort()
  byLocale[locale] = {
    total: Object.values(byNamespace).reduce((sum, group) => sum + group.count, 0),
    allowlisted_count: Object.values(byNamespace)
      .flatMap((group) => group.keys)
      .filter((entry) => entry.allowed).length,
    actionable_count: Object.values(byNamespace)
      .flatMap((group) => group.keys)
      .filter((entry) => !entry.allowed).length,
    by_namespace: Object.fromEntries(
      Object.entries(byNamespace)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([namespace, group]) => [namespace, {
          ...group,
          keys: group.keys.sort((left, right) => left.key.localeCompare(right.key)),
        }]),
    ),
  }
}

const report = {
  generated_at: new Date().toISOString(),
  reference_locale: 'en',
  locales: nonEnglishLocales,
  allowlist: {
    entries: allowlist.size,
    stale: staleAllowlist,
  },
  summary: {
    duplicate_pairs: duplicatePairs,
    unique_duplicate_keys: duplicateKeys.size,
    allowlisted_pairs: Object.values(byLocale).reduce((sum, locale) => sum + locale.allowlisted_count, 0),
    actionable_pairs: Object.values(byLocale).reduce((sum, locale) => sum + locale.actionable_count, 0),
    empty_translation_values: Object.values(emptyTranslations).reduce((sum, keys) => sum + keys.length, 0),
  },
  empty_translations: emptyTranslations,
  by_locale: byLocale,
}

await writeFile(
  join(root, 'i18n-duplicate-report.json'),
  `${JSON.stringify(report, null, 2)}\n`,
  'utf8',
)

console.log(JSON.stringify(report.summary))
for (const locale of nonEnglishLocales) {
  console.log(`${locale}: ${byLocale[locale].total} (${byLocale[locale].actionable_count} actionable)`)
}
if (staleAllowlist.length) {
  console.error(`Stale allowlist entries: ${staleAllowlist.join(', ')}`)
  process.exitCode = 1
}
if (Object.values(emptyTranslations).some((keys) => keys.length > 0)) {
  console.error(`Empty translation values: ${JSON.stringify(emptyTranslations)}`)
  process.exitCode = 1
}
