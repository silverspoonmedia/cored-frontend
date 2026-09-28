// Locale-scoped duplicate-English allowlist.
//
// A locale value may stay identical to English only when the English word IS
// the accepted term in that locale. That is a per-locale property: Indonesian
// IT vocabulary keeps `Status`, `Folder` and `Settlement`, while Korean and
// Chinese translate the very same key. A flat key-only list silences every
// locale at once, which is how `ko.ui.copyright` and
// `zh-CN.web.vtual.public.title` stayed English while both were allowlisted.
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
  'web.archivd.microstock.name_placeholder',
  'web.archivd.microstock_title',
  'web.archivd.title',
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
  'web.microstock.menu',
  'web.payments.channels.kinds.qris',
  'web.payments.income.filters.gateway_ipaymu',
  'web.payments.income.filters.gateway_midtrans',
  'web.payments.subscriptions.fields.date_hint',
  'web.services.microstock.title',
  'web.services.show.stack_quantity_equation',
  'web.settings.groups.archivd',
  'web.settings.groups.microstock',
  'web.settings.groups.vtual',
  'web.vtual-orphans.channels.profile_placeholder_twitch',
  'web.vtual-orphans.channels.profile_placeholder_youtube',
  'web.vtual-vtuber.hub_title',
  'web.vtual.probe.method_fetch_channels',
  'web.vtual.probe.method_fetch_videos',
  'web.vtual.probe.method_fetch_videos_chunked',
  'web.vtual.probe.method_resolve_channel',
  'web.vtual.profile_placeholder_twitch',
  'web.vtual.profile_placeholder_youtube',
  'web.vtual.profiles.fields.link_url',
  'web.vtual.profiles.uuid_placeholder',
  // Platform product names, not translated terms — the backend keeps the same
  // two values in `lang/*/api/vtual.php` `incident.kinds`.
  'web.vtual.incidents.kind.websub',
  'web.vtual.incidents.kind.eventsub',
  'web.vtual.public.directory.live',
  'web.vtual.public.profile.filter_type_live',
  'web.vtual.public.profile.filter_type_vod',
  'web.vtual.public.profile.live',
  'web.vtual.public.profile.vod',
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
    'web.blog.categories.columns.slug',
    'web.blog.categories.form.slug',
    'web.blog.posts.columns.status',
    'web.blog.posts.form.slug',
    'web.blog.posts.form.status',
    'web.blog.tags.columns.slug',
    'web.blog.tags.form.slug',
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
    'web.microstock-credentials.columns.label',
    'web.microstock-credentials.columns.marketplace',
    'web.microstock-credentials.form.host',
    'web.microstock-credentials.form.label',
    'web.microstock-credentials.form.marketplace',
    'web.microstock.usage.col_margin',
    'web.microstock.usage.col_model',
    'web.microstock.usage.tabs.platform',
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
    'web.vtual-events.datatable.columns.status',
    'web.vtual-events.status.live',
    'web.vtual-managements.datatable.columns.slug',
    'web.vtual-managements.datatable.columns.status',
    'web.vtual-managements.form.slug',
    'web.vtual-managements.form.status',
    'web.vtual-managements.invites.columns.email',
    'web.vtual-managements.invites.email',
    'web.vtual-orphans.channels.avatar',
    'web.vtual-orphans.channels.platform',
    'web.vtual-orphans.channels.status',
    'web.vtual-orphans.datatable.columns.slug',
    'web.vtual-orphans.form.slug',
    'web.vtual-platform-credentials.client_id_label',
    // Same loanword rule as every other vTual status column above: Indonesian
    // product UI ships `Status`, and no native alternative is in use.
    'web.vtual.claims.columns.status',
    'web.vtual.incidents.columns.status',
    // Matches `lang/id/api/vtual.php` `incident.severities.info` = `Info`.
    'web.vtual.incidents.severity.info',
    'web.vtual.platform_col',
    'web.vtual.platform_label',
    'web.vtual.probe_button',
    'web.vtual.profiles.channels.avatar',
    'web.vtual.profiles.channels.platform',
    'web.vtual.profiles.channels.status',
    'web.vtual.profiles.fields.link_label',
    'web.vtual.profiles.fields.platform',
    'web.vtual.profiles.fields.slug',
    'web.vtual.profiles.token_label',
    'web.vtual.public.profile.details.status',
    'web.vtual.public.profile.filters_label',
    'web.vtual.public.schedule.platform',
    'web.vtual.slug_col',
  ]),
  'ja': new Set([
  ]),
  'ko': new Set([
  ]),
  'zh-CN': new Set([
  ]),
  'ar': new Set([
  ]),
  'ru': new Set([
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
