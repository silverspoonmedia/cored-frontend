import { readFile } from 'node:fs/promises'
import { readdir } from 'node:fs/promises'
import { extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const localeDir = join(root, 'src', 'i18n', 'locales')
const locales = ['en', 'id', 'ja', 'ko', 'zh-CN', 'ar', 'ru']
const sourceDir = join(root, 'src')

const hardcodedPatterns = [
  /['"]Failed to [^'"\n]+['"]/g,
  /['"]Validation failed['"]/g,
  /['"]Request failed['"]/g,
  /['"]Session expired['"]/g,
  /['"]Are you sure\?['"]/g,
]
const allowlistedSourcePaths = new Set()

// These are identifiers or product names, not translatable prose. Keep this
// list key-specific so a translated sentence cannot hide behind a broad value
// or namespace allowlist.
const duplicateEnglishAllowlist = new Set([
  'api.common.pong',
  'ui.swal.ok',
  'ui.copyright',
  'ui.labels.status',
  'http-statuses.200',
  'validation.attributes.h-captcha-response',
  'web.auth.email_placeholder',
  'web.archivd.blocklist_sha256',
  'web.archivd.blocklist_sha256_col',
  'web.archivd.char_count',
  'web.archivd.microstock.name_placeholder',
  'web.archivd.microstock_title',
  'web.archivd.title',
  'web.identity-connections.discord_heading',
  'web.identity-connections.provider_heading',
  'web.microstock.menu',
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
  'web.payments.income.filters.gateway_ipaymu',
  'web.payments.income.filters.gateway_midtrans',
  'web.payments.subscriptions.fields.date_hint',
  'web.services.microstock.title',
  'web.settings.groups.archivd',
  'web.settings.groups.microstock',
  'web.settings.groups.platform',
  'web.settings.groups.vtual',
  'web.settings.options.platform.notifications.delivery.realtime',
  'web.users.datatable.columns.email',
  'web.users.form.email_label',
  'web.vtual-managements.invites.columns.email',
  'web.vtual-managements.invites.email',
  'web.vtual-managements.invites.email_placeholder',
  'web.vtual-events.datatable.columns.management',
  'web.vtual-events.datatable.columns.status',
  'web.vtual-events.form.management',
  'web.vtual-events.status.live',
  'web.vtual.url',
  'web.vtual.title',
  'web.vtual.admin.credentials.platform_card.vod',
  'web.vtual.credentials.client_id',
  'web.vtual.profile_placeholder_twitch',
  'web.vtual.profiles.uuid_placeholder',
  'web.vtual.profiles.fields.link_url',
  'web.vtual.probe.method_fetch_videos',
  'web.vtual.probe.method_fetch_videos_chunked',
  'web.vtual.probe.method_fetch_channels',
  'web.vtual.probe.method_resolve_channel',
  'web.vtual.public.hero.one.title_b',
  'web.vtual.public.nav.directory',
  'web.vtual.public.title',
  'web.vtual-orphans.channels.profile_placeholder_twitch',
  'web.vtual-platform-credentials.client_id_label',
  'web.vtual-platform-credentials.client_secret_label',
  'web.vtual-vtuber.content_type.vod',
  'web.vtual-vtuber.hub_title',
  'product-activations.tier_n/a',
  'web.vtual.public.directory.live',
  'web.vtual.public.live_now.badge',
  'web.vtual.public.profile.live',
  'web.vtual.public.profile.vod',
  'web.services.show.stack_quantity_equation',
  'web.vtual-orphans.form.avatar_url_placeholder',
  'web.vtual-orphans.channels.profile_placeholder_youtube',
  'web.vtual.profile_placeholder_youtube',
  // Indonesian / Chinese loanword & tech-identifier carryover. These keys are
  // user-visible but the accepted term in the locale is the English word
  // itself (bahasa gaul IT / Chinese tech convention). Keep key-specific.
  'validation.attributes.filter',
  'validation.attributes.slug',
  'validation.attributes.status',
  'validation.attributes.tag',
  'web.currencies.columns.settlement',
  'web.currencies.settlement_col',
  'web.error-log.columns.status',
  'web.error-log.fields.exception_class',
  'web.error-log.fields.status',
  'web.error-log.levels.error',
  'web.error-log.types.exception',
  'web.error-log.types.log',
  'web.archivd.type_audio',
  'web.archivd.type_video',
  'web.inference.model_cards.datatable.columns.slug',
  'web.inference.model_cards.fields.slug',
  'web.inference.model_cards.status_label',
  'web.inference.providers.datatable.columns.slug',
  'web.inference.providers.fields.slug',
  'web.inference.usage.columns.model',
  'web.inference.usage.columns.provider',
  'web.inference.usage.columns.provider_cost',
  'web.inference.usage.filter_button',
  'web.inference.usage.filters.model',
  'web.inference.usage.filters.provider',
  'web.inference.usage.totals.margin',
  'web.menus.form.layouts.navbar',
  'web.menus.form.layouts.sidebar',
  'web.microstock.usage.col_file',
  'web.microstock.usage.col_margin',
  'web.microstock.usage.col_model',
  'web.microstock.usage.tabs.platform',
  'web.microstock-credentials.columns.label',
  'web.microstock-credentials.columns.marketplace',
  'web.microstock-credentials.form.host',
  'web.microstock-credentials.form.label',
  'web.microstock-credentials.form.marketplace',
  'web.notifications.columns.status',
  'web.payments.bank_label',
  'web.payments.channels.route_columns.gateway',
  'web.payments.channels.route_columns.settlement',
  'web.payments.income.breakdown.label',
  'web.payments.income.filters.gateway',
  'web.payments.income.table.status',
  'web.payments.income.table.subtotal',
  'web.payments.income.table.total',
  'web.payments.instructions.bank',
  'web.payments.invoices.datatable.columns.status',
  'web.payments.invoices.fields.gateway',
  'web.payments.invoices.fields.status',
  'web.payments.subscriptions.datatable.columns.status',
  'web.payments.subscriptions.fields.status',
  'web.payments.subscriptions.status',
  'web.payments.subtotal_label',
  'web.services.change_type.downgrade',
  'web.services.change_type.upgrade',
  'web.services.checkout',
  'web.services.columns.status',
  'web.services.form.plan_kind_addon',
  'web.services.form.status',
  'web.services.show.settlement_amount',
  'web.services.show.status',
  'web.settings.groups.identity',
  'web.vtual.admin.registry.columns.channel',
  'web.vtual.credentials.access_token',
  'web.vtual.credentials.api_key',
  'web.vtual.credentials.client_secret',
  'web.vtual.credentials.refresh_token',
  'web.vtual.credentials.type_api_key',
  'web.vtual.platform',
  'web.vtual.platform_col',
  'web.vtual.platform_label',
  'web.vtual.probe_button',
  'web.vtual.profiles.channels.avatar',
  'web.vtual.profiles.channels.platform',
  'web.vtual.profiles.channels.status',
  'web.vtual.profiles.fields.link_label',
  'web.vtual.profiles.fields.platform',
  'web.vtual.profiles.fields.slug',
  'web.vtual.profiles.link_label',
  'web.vtual.profiles.token_label',
  'web.vtual.public.profile.details.status',
  'web.vtual.public.schedule.platform',
  'web.vtual.slug_col',
  'web.vtual.status',
  'web.vtual-managements.datatable.columns.slug',
  'web.vtual-managements.datatable.columns.status',
  'web.vtual-managements.form.slug',
  'web.vtual-managements.form.status',
  'web.vtual-orphans.channels.avatar',
  'web.vtual-orphans.channels.platform',
  'web.vtual-orphans.channels.status',
  'web.vtual-orphans.datatable.columns.slug',
  'web.vtual-orphans.form.slug',
  'web.vtual-platform-credentials.columns.platform',
  'web.vtual-profiles.columns.avatar',
  'web.vtual-profiles.columns.slug',
  'web.vtual-vtuber.columns.avatar',
  'web.vtual-vtuber.columns.platform',
  'web.vtual-vtuber.columns.status',
  'web.vtual-vtuber.columns.thumbnail',
  'web.vtual-vtuber.slug_label',
])

function isDuplicateEnglishAllowed(key) {
  return duplicateEnglishAllowlist.has(key)
}

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
    if (messages[locale].get(key) !== messages.en.get(key) || !/[A-Za-z]/.test(String(messages.en.get(key)))) {
      continue
    }

    const duplicate = {
      locale,
      key,
      namespace: namespaceFor(key),
      value: messages.en.get(key),
      allowed: isDuplicateEnglishAllowed(key),
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
console.log(`Duplicate-English allowlist entries: ${duplicateEnglishAllowlist.size}.`)
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
