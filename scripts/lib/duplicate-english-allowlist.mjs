// Locale-scoped duplicate-English allowlist.
//
// A locale value may stay identical to English only when the English word IS
// the accepted term in that locale. That is a per-locale property: Indonesian
// IT vocabulary keeps `Status`, `Folder` and `Settlement`, while Korean and
// Chinese translate the very same key. A flat key-only list silences every
// locale at once, which is how `ko.ui.copyright` and
// `zh-CN.web.archivd.title` stayed English while both were allowlisted.
//
// Add a key to `globalDuplicateEnglishKeys` only when it is machine-contract
// text or a brand; otherwise add it to the one locale that legitimately needs
// it. A key that belongs in neither list must be translated.

/**
 * Identical in every locale by design: brand and product names, platform type
 * names (LIVE/VOD), machine-contract text (enum values, probe method names,
 * hashes, format placeholders, date-format hints) and universal acronyms
 * (URL, UUID, N/A, OK, API).
 */
export const globalDuplicateEnglishKeys = new Set([
  'api.common.pong',
  'http-statuses.200',
  'product-activations.tier_n/a',
  'ui.swal.ok',
  'web.archivd.blocklist_sha256',
  'web.archivd.blocklist_sha256_col',
  'web.archivd.char_count',
  'web.archivd.title',
  'web.identity-connections.discord_heading',
  'web.identity-connections.provider_heading',
  'web.payments.channels.kinds.qris',
  'web.payments.income.filters.gateway_ipaymu',
  'web.payments.income.filters.gateway_midtrans',
  'web.payments.subscriptions.fields.date_hint',
  'web.services.show.stack_quantity_equation',
  'web.settings.groups.archivd',
])

/**
 * Keys whose accepted term in that locale is the English word. Indonesian
 * (bahasa gaul IT) is the only locale that needs this today: the loanword is
 * what a native user reads in a shipped product, and no native alternative
 * reads better. Prefer a native term whenever one exists.
 */
export const localeDuplicateEnglishKeys = {
  'id': new Set([
    'ui.labels.status',
    'validation.attributes.filter',
    'validation.attributes.h-captcha-response',
    // `login` is the accepted Indonesian IT term, and `nama pengguna` already
    // owns `validation.attributes.username`, so the native alternative would
    // collide with it.
    'validation.attributes.login',
    'validation.attributes.slug',
    'validation.attributes.status',
    'validation.attributes.tag',
    'web.ai-connections.columns.slug',
    'web.ai-connections.columns.status',
    'web.ai-connections.fields.slug',
    'web.archivd.lock_collection_folder',
    'web.archivd.public.folder',
    'web.archivd.type_audio',
    'web.archivd.type_folder',
    'web.archivd.type_video',
    'web.currencies.columns.settlement',
    'web.currencies.settlement_col',
    'web.error-log.columns.status',
    'web.error-log.fields.exception_class',
    'web.error-log.fields.status',
    'web.error-log.levels.error',
    'web.error-log.types.exception',
    'web.error-log.types.log',
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
    'web.settings.groups.platform',
    'web.users.datatable.columns.email',
    'web.users.form.email_label',
  ]),
}

/**
 * Whether `key` may keep the English value in `locale`.
 *
 * @param {string} key dotted translation key, e.g. `web.archivd.title`
 * @param {string} locale SPA locale code, e.g. `zh-CN`
 * @returns {boolean}
 */
export function isDuplicateEnglishAllowed(key, locale) {
  if (globalDuplicateEnglishKeys.has(key)) return true
  return localeDuplicateEnglishKeys[locale]?.has(key) ?? false
}

/**
 * Every allowlisted key, in any locale. Used for stale-entry detection: an
 * entry that no longer exists in `en.json` is dead and must be removed.
 *
 * @returns {string[]}
 */
export function allDuplicateEnglishKeys() {
  return [...new Set([
    ...globalDuplicateEnglishKeys,
    ...Object.values(localeDuplicateEnglishKeys).flatMap((keys) => [...keys]),
  ])].sort()
}
