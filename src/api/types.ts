import type { NavNode } from '@/types'

export interface ApiResponse<T = unknown> {
  status: 'success' | 'error'
  message: string | null
  data?: T
}

export interface ListPagination {
  current_page: number
  last_page: number
  per_page: number
  total: number
  has_more: boolean
}

export interface PagedList<T> {
  items: T[]
  pagination: ListPagination
}

export interface QueryRowActionConfirm {
  title: string
  text: string
}

/** Query-mode list row action emitted by Monolith. Views must not invent keys. */
export interface QueryRowAction {
  key: string
  label: string
  icon: string
  variant: string
  route?: string
  params?: Record<string, string | number>
  query?: Record<string, string | number>
  href?: string
  target?: string
  method?: string
  path?: string
  confirm?: QueryRowActionConfirm
}

export interface ValidationErrors {
  [field: string]: string[]
}

export class ApiError extends Error {
  readonly status: number
  readonly errors: ValidationErrors | null

  constructor(message: string, status: number, errors: ValidationErrors | null = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }

  get isAuth(): boolean {
    return this.status === 401
  }

  get isForbidden(): boolean {
    return this.status === 403
  }

  get isValidation(): boolean {
    return this.status === 422
  }
}

export interface User {
  id: string | number
  name: string
  email: string
  email_verified_at: string | null
  email_verified_at_formatted?: string | null
  email_verified_at_human?: string | null
  two_factor_enabled: boolean
  roles: string[]
  permissions: string[]
}

export interface AuthPayload {
  user: User
  token?: string
  token_type: string
  expires_in: number
  remember: boolean
}

export interface TwoFactorChallengePayload {
  user: User
  two_factor_required: true
  two_factor_token: string
  two_factor_token_expires_in: number
  remember: boolean
}

export interface TwoFactorSetupPayload {
  secret: string
  qr_code_url: string
  qr_code_svg: string
}

export interface TwoFactorConfirmPayload {
  confirmed_at: string
}

export type LoginResult =
  | { type: 'authenticated'; user: User }
  | { type: 'two_factor_challenge'; token: string; expiresInSeconds: number }

export interface Currency {
  actions?: QueryRowAction[]
  code: string
  name: string
  symbol: string | null
  decimal_places: number
  is_active: boolean
  is_settlement: boolean
}

export interface NotificationAudience {
  actions?: QueryRowAction[]
  type: string
  label: string
  icon: string
  notify_subject_user: boolean
  roles: string[]
  users: string[]
}

export interface AssignableRole {
  id: string
  name: string
}

export interface NotificationAudienceListPayload {
  items: NotificationAudience[]
  assignable_roles: AssignableRole[]
}

export type NavigationTreeNode = NavNode

// --- Activity Log ---
export interface ActivityLogCauser {
  id: number | string
  name: string
  email: string
}

export interface ActivityLog {
  actions?: QueryRowAction[]
  id: number
  log_name: string | null
  description: string | null
  event: string | null
  event_label: string
  subject_type: string | null
  subject_id: number | string | null
  subject_label: string | null
  causer: ActivityLogCauser | null
  attribute_changes: {
    attributes?: Record<string, unknown>
    old?: Record<string, unknown>
  }
  properties: Record<string, unknown>
  created_at: string | null
  created_at_formatted: string | null
  created_at_human: string | null
}

// --- Error Log ---
export interface ErrorLogResolver {
  id: number | string
  name: string
  email: string
}

export interface ErrorLog {
  actions?: QueryRowAction[]
  id: number
  fingerprint: string | null
  type: string | null
  level: string | null
  exception_class: string | null
  message: string | null
  file: string | null
  line: number | null
  trace: string | null
  context: Record<string, unknown>
  occurrence_count: number
  first_seen_at: string | null
  first_seen_at_formatted: string | null
  first_seen_at_human: string | null
  last_seen_at: string | null
  last_seen_at_formatted: string | null
  last_seen_at_human: string | null
  status: string
  status_label: string
  resolved_at: string | null
  resolved_at_formatted: string | null
  resolved_at_human: string | null
  resolved_by: ErrorLogResolver | null
  created_at: string | null
  created_at_formatted: string | null
  created_at_human: string | null
  updated_at: string | null
  updated_at_formatted: string | null
  updated_at_human: string | null
}

// --- Notification ---
export interface AppNotification {
  id: number
  type: string
  message: string
  icon: string
  action_route: string | null
  action_params: Record<string, unknown>
  is_read: boolean
  created_at: string | null
  created_at_formatted: string | null
  created_at_human: string | null
}

export interface UnreadCountPayload {
  unread: number
}

// --- Settings ---
export type SettingType = 'bool' | 'int' | 'float' | 'string' | 'array'

export interface SettingEntry {
  value: unknown
  source: 'database' | 'config'
  type: SettingType
  options?: string[]
}

export type SettingGroup = Record<string, SettingEntry>

export interface SettingsGroupsPayload {
  groups: string[]
}

export interface SettingsShowPayload {
  group: string
  settings: SettingGroup
}

// --- Domain Access ---
export interface DomainAccess {
  key: string
  label: string
  visibility: 'public' | 'private'
  beta_role: string
}

// --- Users ---
export interface UserRoleSummary {
  name: string
  level: number
  domain_kind: string
}

export interface UserAssignableRole {
  name: string
  level: number
  domain_kind: string
}

export interface UserManagement {
  actions?: QueryRowAction[]
  id: string
  name: string
  email: string
  email_verified_at: string | null
  email_verified_at_formatted: string | null
  email_verified_at_human: string | null
  roles: UserRoleSummary[]
  created_at: string | null
  created_at_formatted: string | null
  created_at_human: string | null
  updated_at: string | null
  updated_at_formatted: string | null
  updated_at_human: string | null
}

export interface DiscordConnection {
  type: string
  id: string | null
  name: string | null
  verified: boolean
  revoked: boolean
}

export interface OAuthProviderConnection {
  key: string
  connected: boolean
  oauth_configured: boolean
  supports_sync: boolean
  synced_at: string | null
  synced_at_formatted: string | null
  synced_at_human: string | null
  connections: DiscordConnection[]
}

export interface ProfileConnections {
  providers: OAuthProviderConnection[]
}

export interface DiscordAuthorizeUrl {
  url: string
}

// --- Navigation/Menus ---
export interface MenuListItem {
  actions?: QueryRowAction[]
  id: string
  parent_id: string | null
  layout: string
  name: string
  description: string | null
  name_translations: Record<string, string>
  description_translations: Record<string, string>
  icon: string | null
  route: string | null
  hash: string | null
  type: string
  order: number | null
  is_authenticate: boolean
  is_guest_only: boolean
  role_ids: string[]
  user_include_ids: string[]
  user_exclude_ids: string[]
  children_count?: number
  created_at?: string | null
  created_at_formatted?: string | null
  created_at_human?: string | null
  updated_at?: string | null
  updated_at_formatted?: string | null
  updated_at_human?: string | null
}

export interface MenuAncestor {
  id: string
  name: string
  type: string
  is_trashed: boolean
}

export interface MenuTrashedItem extends MenuListItem {
  deleted_at: string | null
  deleted_at_formatted: string | null
  deleted_at_human: string | null
  ancestor_chain: MenuAncestor[]
  ancestor_path: string
}

// --- Inference Model Cards ---
export interface AiModelCard {
  actions?: QueryRowAction[]
  id: string
  slug: string
  display_name: string | null
  is_active: boolean
  needs_rate_classification: boolean
  created_at: string | null
  created_at_formatted: string | null
  created_at_human: string | null
  updated_at: string | null
  updated_at_formatted: string | null
  updated_at_human: string | null
}

export interface AiModelCardProviderRate {
  input_per_million_usd: number
  output_per_million_usd: number
  model_card_id: string | null
  inference_provider_id: string | null
  provider_slug: string | null
  from_default: boolean
  rate_source: string
}

export interface AiModelCardUsageSummary {
  period: {
    from: string | null
    to: string | null
  }
  event_count: number
  total_tokens: number
  provider_cost_usd: string
  billable_usd: string
  margin_usd: string
}

export interface AiModelCardDetail extends AiModelCard {
  provider_rate: AiModelCardProviderRate
  usage_summary: AiModelCardUsageSummary
}

export interface InferenceUsageEventRateSnapshot {
  input_per_million_usd: number
  output_per_million_usd: number
  captured_at: string | null
}

export interface InferenceUsageEvent {
  id: string
  created_at: string | null
  stage: string | null
  alias_model: string | null
  resolved_model: string | null
  rate_snapshot?: InferenceUsageEventRateSnapshot | null
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  provider_cost_usd: string
  billable_usd: string
  billing_source: string | null
  file_id: string | null
  file_name: string | null
  folder_id: string | null
  folder_name: string | null
  analysis_run_id: string | null
  billed_at: string | null
  user_id: string | null
  user?: { id: string; name: string; email?: string } | null
  inference_provider?: { id: string; slug: string; name: string } | null
}

export interface InferenceUsageEventListPayload {
  items: InferenceUsageEvent[]
  pagination: {
    current_page: number
    last_page: number
    per_page: number
    total: number
    has_more: boolean
  }
}

// --- Inference Usage Overview ---
export interface InferenceUsageOverview {
  period: { from: string | null; to: string | null }
  totals: {
    event_count: number
    unique_users: number
    total_tokens: number
    provider_cost_micro_usd: number
    provider_cost_usd: string
    billable_micro_usd: number
    billable_usd: string
    margin_micro_usd: number
    margin_usd: string
  }
  by_billing_source: Record<string, {
    event_count: number
    provider_cost_usd: string
    billable_usd: string
  }>
  by_stage: Array<{
    stage: string
    event_count: number
    provider_cost_usd: string
    billable_usd: string
  }>
  by_model: Array<{
    resolved_model: string
    event_count: number
    total_tokens: number
    provider_cost_usd: string
    billable_usd: string
  }>
  by_provider: Array<{
    inference_provider_id: string | null
    provider_slug: string | null
    event_count: number
    total_tokens: number
    provider_cost_usd: string
    billable_usd: string
  }>
}

// --- Payments Income ---
export interface PaymentIncomeFilters {
  from: string | null
  to: string | null
  basis: string
  gateway: string | null
}

export interface PaymentIncomeSummary {
  invoice_count: number
  service_revenue: number
  service_revenue_formatted: string
  buyer_fees: number
  buyer_fees_formatted: string
  cash_collected: number
  cash_collected_formatted: string
  avg_order_value: number
  avg_order_value_formatted: string
  currency: string
}

export interface PaymentIncomePipelineBucket {
  invoice_count: number
  service_revenue: number
  service_revenue_formatted: string
}

export interface PaymentIncomeBreakdownRow {
  label: string
  invoice_count: number
  service_revenue: number
  service_revenue_formatted: string
  buyer_fees: number
  buyer_fees_formatted: string
  cash_collected: number
  cash_collected_formatted: string
}

export interface PaymentIncomeDailyRow {
  day: string
  invoice_count: number
  service_revenue: number
  service_revenue_formatted: string
  cash_collected: number
  cash_collected_formatted: string
}

export interface PaymentIncomeOverview {
  filters: PaymentIncomeFilters
  summary: PaymentIncomeSummary
  pipeline: Record<string, PaymentIncomePipelineBucket>
  by_gateway: PaymentIncomeBreakdownRow[]
  by_channel: PaymentIncomeBreakdownRow[]
  by_invoiceable_type: PaymentIncomeBreakdownRow[]
  daily: PaymentIncomeDailyRow[]
}

export interface PaymentIncomeInvoicesPayload {
  items: Invoice[]
  pagination: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

// --- Microstock Usage ---
export interface MicrostockCredential {
  actions?: QueryRowAction[]
  id: string
  marketplace: string
  label: string
  created_at: string | null
}

export interface MicrostockBillingSummary {
  balance_micro_usd: number
  balance_usd: string
  estimated_per_analysis_micro_usd: number
  estimated_per_analysis_usd: string
  daily_free?: {
    enabled: boolean
    limit: number
    used: number
    remaining: number
    resets_at: string | null
  }
}

export interface MicrostockLedgerEntry {
  id: string
  created_at: string | null
  created_at_formatted: string | null
  description: string
  amount: number
  amount_formatted: string
  balance: number
  balance_formatted: string
}

export interface MicrostockUsageEvent {
  id: string
  created_at: string | null
  created_at_formatted: string | null
  file_name: string | null
  stage: string | null
  resolved_model: string | null
  total_tokens: number
  billable_usd: string
  billing_source: string | null
}

export interface MicrostockPlatformOverview {
  period: { from: string | null; to: string | null }
  totals: {
    event_count: number
    unique_users: number
    total_tokens: number
    provider_cost_micro_usd: number
    provider_cost_usd: string
    billable_micro_usd: number
    billable_usd: string
    margin_micro_usd: number
    margin_usd: string
  }
  by_billing_source: Record<string, {
    event_count: number
    provider_cost_usd: string
    billable_usd: string
  }>
  by_stage: Array<{
    stage: string
    event_count: number
    provider_cost_usd: string
    billable_usd: string
  }>
  by_model: Array<{
    resolved_model: string
    event_count: number
    total_tokens: number
    provider_cost_usd: string
    billable_usd: string
  }>
  credits: {
    outstanding_balance_micro_usd: number
    outstanding_balance_usd: string
    purchase_volume_micro_usd: number
    purchase_volume_usd: string
    debit_volume_micro_usd: number
    debit_volume_usd: string
  }
  daily_free: {
    enabled: boolean
    users_active_today: number
    slots_consumed_today: number
    subsidized_provider_cost_usd: string
  }
}

// --- Payment Channels ---
export interface PaymentChannelRoute {
  id: string
  gateway: { id: string; name: string; display_name: string } | null
  provider_payment_type: string | null
  provider_payment_channel: string | null
  priority: number
  route_role: string | null
  settlement_days: number | null
  settlement_label: string | null
  fee_flat: number | null
  fee_percent: number | null
  fee_label: string
  fee_vat_inclusive: boolean
  policy_tag: string | null
  is_policy_managed: boolean
  is_active: boolean
}

export interface PaymentChannel {
  code: string
  display_name: string
  kind: string
  is_active: boolean
  sort_order: number
  cheap_alt_code: string | null
  routing_type: string | null
  policy_key: string | null
  routes?: PaymentChannelRoute[]
  estimated_channel_fee?: number
  estimated_channel_fee_formatted?: string | null
  estimated_customer_total?: number
  estimated_customer_total_formatted?: string | null
  fee_label?: string
  fee_type?: string | null
  fee_basis?: string | null
  gateway_name?: string | null
  route_role?: string | null
}

// --- Checkout ---
export interface CheckoutInstructions {
  type: 'qris' | 'va' | 'ewallet'
  qr_string?: string
  qr_url?: string
  bank_name?: string
  va_number?: string
  payment_name?: string
  deeplink_url?: string
}

export interface CheckoutResult {
  channel_code: string
  kind: string
  gateway: string
  invoice_id: string
  amount: number
  currency: string
  expires_at: string | null
  external_transaction_id: string | null
  instructions: CheckoutInstructions
  subtotal: number
  subtotal_formatted: string
  payment_channel_fee: number
  payment_channel_fee_formatted: string
  customer_gross_total: number
  customer_gross_total_formatted: string
  payment_channel_fee_type: string | null
  payment_channel_fee_label: string | null
  payment_channel_fee_basis: string | null
}

export interface SyncStatusResult {
  invoice: {
    id: string
    invoice_number: string
    status: string
    external_transaction_id: string | null
    paid_at: string | null
    expired_at: string | null
    invoiceable_status: string | null
  }
}

// --- Inference Providers ---
export interface InferenceProvider {
  actions?: QueryRowAction[]
  id: string
  slug: string
  name: string
  is_active: boolean
  model_rates_count?: number
  model_rates?: ProviderModelRate[]
  created_at: string | null
  created_at_formatted: string | null
  created_at_human: string | null
  updated_at: string | null
  updated_at_formatted: string | null
  updated_at_human: string | null
}

export interface ProviderModelRate {
  id: string
  model_card_id: string
  input_per_million_usd: number
  output_per_million_usd: number
  model_card?: {
    id: string
    slug: string
    display_name: string | null
    is_active: boolean
  } | null
}

// --- Payment Gateways ---
export interface PaymentGateway {
  actions?: QueryRowAction[]
  id: string
  name: string
  display_name: string
  is_active: boolean
  priority: number
  created_at: string | null
  created_at_formatted: string | null
  created_at_human: string | null
  updated_at: string | null
  updated_at_formatted: string | null
  updated_at_human: string | null
}

// --- Invoices ---
export interface InvoicePaymentGateway {
  id: string
  name: string
  display_name: string
}

export interface Invoice {
  actions?: QueryRowAction[]
  id: string
  invoiceable_id: string | null
  invoiceable_type?: string | null
  invoiceable_status: string | null
  payment_gateway_id?: string | null
  payment_gateway?: InvoicePaymentGateway | null
  invoice_number: string
  external_transaction_id?: string | null
  payment_method: string | null
  payment_channel_code: string | null
  payment_channel_route_id?: string | null
  payment_channel_route_snapshot_id?: string | null
  payment_channel_route?: Record<string, unknown> | null
  subtotal: number
  subtotal_formatted?: string
  payment_channel_fee: number
  payment_channel_fee_formatted?: string
  payment_channel_fee_type?: string | null
  payment_channel_fee_label?: string | null
  payment_channel_fee_basis?: string | null
  customer_gross_total: number
  customer_gross_total_formatted?: string
  currency: string
  status: string
  paid_at: string | null
  paid_at_formatted: string | null
  paid_at_human: string | null
  expired_at: string | null
  expired_at_formatted: string | null
  expired_at_human: string | null
  withdrawable_at?: string | null
  withdrawable_at_formatted?: string | null
  withdrawable_at_human?: string | null
  disbursement_status?: string | null
  disbursed_at?: string | null
  disbursed_at_formatted?: string | null
  disbursed_at_human?: string | null
  created_at: string | null
  created_at_formatted: string | null
  created_at_human: string | null
  updated_at: string | null
  updated_at_formatted: string | null
  updated_at_human: string | null
  checkout_session?: CheckoutResult | null
}

export interface InvoiceStatusPayload {
  invoice_id: string
  status: string
  previous_status: string | null
  paid_at: string | null
  expired_at: string | null
  invoiceable_type: string | null
  invoiceable_id: string | null
  invoiceable_status: string | null
}

// --- Service Purchases ---
export interface ServicePurchaseFxRate {
  fx_rate: number | null
  fx_rate_formatted: string | null
  fx_rate_label: string | null
  fx_provider: string | null
  fx_fetched_at: string | null
  fx_fetched_at_formatted: string | null
  fx_fetched_at_human: string | null
  fx_rate_snapshot_id: string | null
}

export interface ServicePurchaseEntitlement {
  id: string
  status: string | null
  is_permanent: boolean
  quantity: number
  ends_at: string | null
  ends_at_formatted: string | null
  grace_ends_at: string | null
  grace_ends_at_formatted: string | null
  [key: string]: unknown
}

export interface ServicePurchase {
  id: string
  user_id: string
  service_id: string
  quantity: number
  display_currency: string
  display_amount: number
  display_amount_formatted?: string
  list_amount: number | null
  list_amount_formatted?: string
  unit_list_amount: number | null
  unit_list_amount_formatted?: string
  unit_charge_amount: number | null
  unit_charge_amount_formatted?: string
  storage_gain_human: string | null
  credit_amount: number
  credit_amount_formatted?: string
  charge_amount: number
  charge_amount_formatted?: string
  surplus_days: number
  change_type: string | null
  previous_entitlement_id: string | null
  settlement_currency?: string
  settlement_amount?: number
  settlement_amount_formatted?: string
  fx_rate?: number | null
  fx_rate_formatted?: string | null
  fx_rate_label?: string | null
  fx_provider?: string | null
  fx_fetched_at?: string | null
  fx_fetched_at_formatted?: string | null
  fx_fetched_at_human?: string | null
  fx_rate_snapshot_id?: string | null
  period_start: string | null
  period_start_formatted: string | null
  period_start_human: string | null
  period_end: string | null
  period_end_formatted: string | null
  period_end_human: string | null
  status: string
  service?: Service | null
  invoice?: Invoice | null
  entitlement?: ServicePurchaseEntitlement | null
  created_at: string | null
  created_at_formatted: string | null
  created_at_human: string | null
  updated_at: string | null
  updated_at_formatted: string | null
  updated_at_human: string | null
}

// --- Product Activations ---
export interface ProductActivationUser {
  id: string
  name: string
  email: string
}

export interface ProductActivation {
  id: string
  user_id: string
  product_key: string
  activation_type: string | null
  state: string
  provisioning_payload: Record<string, unknown> | null
  activated_at: string | null
  activated_at_formatted: string | null
  activated_at_human: string | null
  suspended_at: string | null
  suspended_at_formatted: string | null
  suspended_at_human: string | null
  expired_at: string | null
  expired_at_formatted: string | null
  expired_at_human: string | null
  source: string | null
  updated_at: string | null
  updated_at_formatted: string | null
  updated_at_human: string | null
  created_at: string | null
  created_at_formatted: string | null
  created_at_human: string | null
  user?: ProductActivationUser | null
}

export interface ProductActivationSummary {
  product_key: string
  activation_type: string | null
  fulfillment_target: string | null
  counts: {
    active: number
    pending: number
    suspended: number
    expired: number
    total?: number
  }
  product_metrics: Record<string, unknown>
}

export interface ProductActivationShowPayload {
  summary: ProductActivationSummary
  activations: ProductActivation[]
  pagination: {
    current_page: number
    last_page: number
    per_page: number
    total: number
    has_more?: boolean
  }
}

// --- Vtual ---
export interface VtualCreatorMember {
  id: string
  creator_id: string
  user_id: string
  role: string
  user?: { id: string; name: string; email?: string } | null
}

export interface VtualExternalLink {
  id: string
  label: string
  url: string
  kind: string
  sort_order: number
  created_at: string | null
  created_at_formatted: string | null
  created_at_human: string | null
  updated_at: string | null
  updated_at_formatted: string | null
  updated_at_human: string | null
}

export interface VtualPlatform {
  actions?: QueryRowAction[]
  id: string
  key: string
  name: string
  enabled: boolean
  supports_live: boolean
  supports_vod: boolean
}

export interface VtualCreator {
  actions?: QueryRowAction[]
  id: string
  slug: string
  display_name: string
  profile_url: string
  bio: string | null
  avatar_url: string | null
  status: string
  my_role: string | null
  channels_count?: number
  members?: VtualCreatorMember[]
  channels?: unknown[]
  external_links?: VtualExternalLink[]
  created_at: string | null
  created_at_formatted: string | null
  created_at_human: string | null
  updated_at: string | null
  updated_at_formatted: string | null
  updated_at_human: string | null
}

export interface VtualPlatformCredential {
  actions?: QueryRowAction[]
  id: string
  platform_id: string
  platform_key?: string
  platform_name?: string
  label: string
  type: 'api_key' | 'oauth_app' | 'bearer'
  status: string
  priority: number | null
  secret_hint: string | null
  has_secret: boolean
  has_runtime: boolean
  runtime_expires_at: string | null
  runtime_expires_at_formatted: string | null
  runtime_expires_at_human: string | null
  verified_at: string | null
  verified_at_formatted: string | null
  verified_at_human: string | null
  last_used_at: string | null
  last_used_at_formatted: string | null
  last_used_at_human: string | null
  last_error_at: string | null
  last_error_at_formatted: string | null
  last_error_at_human: string | null
  last_error_message: string | null
  consecutive_auth_failures: number
  failover_skip_until: string | null
  failover_skip_until_formatted: string | null
  failover_skip_until_human: string | null
  created_by: string | null
  created_at: string | null
  created_at_formatted: string | null
  created_at_human: string | null
  updated_at: string | null
  updated_at_formatted: string | null
  updated_at_human: string | null
}

export interface VtualPlatformCredentialTestPayload {
  credential: VtualPlatformCredential
  test: { ok: boolean; message: string; platform: string }
}

// --- Subscriptions ---
export interface Subscription {
  actions?: QueryRowAction[]
  id: string
  subscription_number: string
  subscriber_name: string
  subscriber_email: string
  subscriber_phone: string | null
  plan_name: string
  plan_description: string | null
  billing_cycle: string
  amount: number
  amount_formatted?: string
  currency: string
  status: string
  trial_ends_at: string | null
  trial_ends_at_formatted: string | null
  trial_ends_at_human: string | null
  started_at: string | null
  started_at_formatted: string | null
  started_at_human: string | null
  expires_at: string | null
  expires_at_formatted: string | null
  expires_at_human: string | null
  auto_renew: boolean
  cancelled_at: string | null
  cancelled_at_formatted: string | null
  cancelled_at_human: string | null
  created_at: string | null
  created_at_formatted: string | null
  created_at_human: string | null
  updated_at: string | null
  updated_at_formatted: string | null
  updated_at_human: string | null
}

// --- Services ---
export interface ServicePrice {
  id?: string
  currency: string
  amount: number
  amount_formatted?: string
}

export interface Service {
  actions?: QueryRowAction[]
  id: string
  code: string
  name: string
  description: string | null
  billing_interval: string
  fulfillment_target: string | null
  entitlement: string | null
  plan_kind: string | null
  storage_bytes: number | null
  storage_bytes_human?: string | null
  status: string
  prices?: ServicePrice[]
  created_at: string | null
  created_at_formatted: string | null
  created_at_human: string | null
  updated_at: string | null
  updated_at_formatted: string | null
  updated_at_human: string | null
}

export interface ServiceOptions {
  billing_intervals: string[]
  plan_kinds: string[]
  statuses: string[]
  purchase_max_quantity: number
}

// --- File Hosting ---

export interface FhMicrostock {
  title: string | null
  keywords: string[]
  status: string | null
  stages: unknown
  phase: string | null
}

export interface HostedFile {
  id: string
  user_id: string | null
  workspace_id: string | null
  created_by: string | null
  folder_id: string | null
  name: string
  disk?: string
  region?: string
  path?: string
  size: number
  size_human?: string
  mime: string
  checksum?: string | null
  is_hash_blocked: boolean
  visibility: string
  share_url: string | null
  microstock?: FhMicrostock | null
  workspace?: { id: string; kind: string; name: string } | null
  download_count: number
  view_count: number
  last_downloaded_at: string | null
  last_downloaded_at_formatted?: string | null
  last_downloaded_at_human?: string | null
  last_viewed_at: string | null
  last_viewed_at_formatted?: string | null
  last_viewed_at_human?: string | null
  deleted_at: string | null
  deleted_at_formatted?: string | null
  deleted_at_human?: string | null
  created_at: string | null
  created_at_formatted?: string | null
  created_at_human?: string | null
  updated_at: string | null
  updated_at_formatted?: string | null
  updated_at_human?: string | null
}

export interface FhFolder {
  id: string
  user_id: string | null
  workspace_id: string | null
  parent_id: string | null
  name: string
  order: number | null
  visibility: string
  share_url: string | null
  collection_status: string | null
  collection_hint: string | null
  collection_locked: boolean
  deleted_at: string | null
  deleted_at_formatted?: string | null
  deleted_at_human?: string | null
  created_at: string | null
  created_at_formatted?: string | null
  created_at_human?: string | null
  updated_at: string | null
  updated_at_formatted?: string | null
  updated_at_human?: string | null
}

export interface FhBreadcrumbItem {
  id: string
  name: string
  parent_id: string | null
}

export interface FhWorkspace {
  id: string
  owner_user_id: string
  name: string
  kind: string
  status: string
  is_owner: boolean
  my_role: string | null
  created_at: string | null
  created_at_formatted?: string | null
  created_at_human?: string | null
  updated_at: string | null
  updated_at_formatted?: string | null
  updated_at_human?: string | null
}

export interface FhBrowsePayload {
  owner_id: string
  workspace_id: string | null
  workspace: { id: string; kind: string; name: string } | null
  folder: FhFolder | null
  breadcrumb: FhBreadcrumbItem[]
  folders: FhFolder[]
  files: HostedFile[]
}

export interface FhTrashPayload {
  folders: FhFolder[]
  files: HostedFile[]
}

export interface FhQuota {
  used_bytes: number
  used_bytes_human: string | null
  pending_bytes: number
  pending_bytes_human: string | null
  reserved_bytes: number
  reserved_bytes_human: string | null
  quota_bytes: number
  quota_bytes_human: string | null
  remaining_bytes: number | null
  remaining_bytes_human: string | null
  state: string
  collaborative_works: boolean
  can_create_workspace: boolean
  owned_workspace_used: number
  owned_workspace_limit: number
}

export interface FhPublicFile {
  id: string
  name: string
  mime: string
  size: number
  size_human: string
}

export interface FhPublicFolder {
  id: string
  name: string
}

export interface FhPublicBrowsePayload {
  owner_id?: string
  folder: FhPublicFolder
  breadcrumb: FhBreadcrumbItem[]
  folders: FhPublicFolder[]
  files: FhPublicFile[]
}

export interface FhHashBlocklistEntry {
  actions?: QueryRowAction[]
  id: string
  sha256: string
  reason: string | null
  created_by: string | null
  creator?: { id: string; name: string; email: string } | null
  created_at: string | null
  created_at_formatted?: string | null
  created_at_human?: string | null
  updated_at: string | null
  updated_at_formatted?: string | null
  updated_at_human?: string | null
}

// --- Vtual Complex ---

export interface VtualChannel {
  id: string
  creator_id: string
  platform_id: string
  external_id: string
  handle: string | null
  display_name: string | null
  description: string | null
  avatar_url: string | null
  banner_url: string | null
  url: string | null
  platform_created_at: string | null
  platform_created_at_formatted?: string | null
  platform_created_at_human?: string | null
  subscriber_count: number | null
  subscriber_count_formatted?: string | null
  status: string
  visibility: string
  discovery_source: string | null
  profile_input?: string | null
  resolve_error?: string | null
  last_synced_at: string | null
  last_synced_at_formatted?: string | null
  last_synced_at_human?: string | null
  platform?: VtualPlatform | null
  created_at: string | null
  created_at_formatted?: string | null
  created_at_human?: string | null
  updated_at: string | null
  updated_at_formatted?: string | null
  updated_at_human?: string | null
}

export interface VtualContent {
  id: string
  external_id: string | null
  type: string
  status: string
  title: string | null
  thumbnail_url: string | null
  url: string | null
  published_at: string | null
  published_at_formatted?: string | null
  published_at_human?: string | null
  platform?: VtualPlatform | null
  channel?: { id: string; handle: string | null; display_name: string | null } | null
}

export interface VtualVtuberProfile {
  id: string
  slug: string
  profile_url: string
  is_claimable: boolean
  claim_process_url: string | null
  claim_blocked_until: string | null
  claim_blocked_until_formatted?: string | null
  claim_blocked_until_human?: string | null
  display_name: string
  bio: string | null
  avatar_url: string | null
  channels?: VtualChannel[]
  contents?: VtualContent[]
}

export interface VtualManagementMember {
  id: string
  management_id: string
  user_id: string
  role: string
  user?: { id: string; name: string; email?: string } | null
}

export interface VtualManagementCreatorAssignment {
  assignment_id: string
  joined_at: string | null
  joined_at_formatted?: string | null
  joined_at_human?: string | null
  creator: VtualCreator
}

export interface VtualManagement {
  actions?: QueryRowAction[]
  id: string
  slug: string
  name: string
  description: string | null
  logo_url: string | null
  status: string
  my_role: string | null
  members?: VtualManagementMember[]
  creators?: VtualManagementCreatorAssignment[]
  created_at: string | null
  created_at_formatted?: string | null
  created_at_human?: string | null
  updated_at: string | null
  updated_at_formatted?: string | null
  updated_at_human?: string | null
}

// --- Vtual public (guest-safe, slug-addressed — no UUID, no claim URLs) ---

export interface VtualPublicChannel {
  platform_key: string | null
  platform_name?: string | null
  handle: string | null
  display_name?: string | null
  avatar_url?: string | null
  banner_url?: string | null
  url: string | null
  subscriber_count: number | null
  subscriber_count_formatted?: string | null
}

export interface VtualPublicVtuber {
  slug: string
  display_name: string
  avatar_url: string | null
  bio_snippet: string | null
  is_live: boolean
  channels: VtualPublicChannel[]
  total_subscribers: number | null
  total_subscribers_formatted: string | null
}

export interface VtualPublicDirectoryPagination {
  current_page: number
  last_page: number
  per_page: number
  total: number
  has_more: boolean
}

export interface VtualPublicDirectory {
  items: VtualPublicVtuber[]
  pagination: VtualPublicDirectoryPagination
}

export interface VtualPublicContentCreator {
  slug: string
  display_name: string
  avatar_url: string | null
}

export interface VtualPublicContentChannel {
  display_name: string | null
  avatar_url: string | null
}

export interface VtualPublicContent {
  type: string | null
  status: string | null
  title: string | null
  thumbnail_url: string | null
  url: string | null
  published_at: string | null
  scheduled_at?: string | null
  platform_key: string | null
  creator?: VtualPublicContentCreator | null
  channel?: VtualPublicContentChannel | null
}

export interface VtualPublicContentFeed {
  items: VtualPublicContent[]
  pagination: VtualPublicDirectoryPagination
}

export interface VtualPublicLink {
  kind: string | null
  label: string | null
  url: string | null
}

export interface VtualPublicProfile {
  slug: string
  display_name: string
  bio: string | null
  avatar_url: string | null
  is_claimable: boolean
  is_live: boolean
  total_subscribers: number | null
  total_subscribers_formatted: string | null
  channels: VtualPublicChannel[]
  links: VtualPublicLink[]
  contents: VtualPublicContentFeed
}

export interface VtualPublicManagementProfile {
  slug: string
  name: string
  description: string | null
  logo_url: string | null
  links: VtualPublicLink[]
  creators: VtualPublicVtuber[]
}

export interface VtualPublicLandingEvent {
  title: string
  starts_at: string
  body: string
}

export interface VtualPublicStats {
  creators: number
  channels: number
  contents: number
  subscribers_total: number
  subscribers_total_formatted: string
}

export interface VtualPublicLanding {
  event: VtualPublicLandingEvent | null
  live_now: VtualPublicContent[]
  schedule: VtualPublicContent[]
  stats: VtualPublicStats
}

export interface VtualPublicItems {
  items: VtualPublicContent[]
}

export interface VtualCreatorClaim {
  id: string
  user_id: string
  creator_id: string
  channel_id: string
  token?: string
  status: string
  closed_reason: string | null
  attempt_count: number
  attempts_remaining: number
  max_attempts: number
  verify_queue_status: string | null
  can_verify: boolean
  blocked_until: string | null
  blocked_until_formatted?: string | null
  blocked_until_human?: string | null
  last_attempt_at: string | null
  last_attempt_at_formatted?: string | null
  last_attempt_at_human?: string | null
  expires_at: string | null
  expires_at_formatted?: string | null
  expires_at_human?: string | null
  verified_at: string | null
  verified_at_formatted?: string | null
  verified_at_human?: string | null
  verified_via: string | null
  verified_by_user_id: string | null
  verified_channel_id: string | null
  creator?: VtualCreator | null
  channel?: VtualChannel | null
  verified_channel?: VtualChannel | null
  user?: { id: string; name: string; email?: string } | null
  created_at: string | null
  created_at_formatted?: string | null
  created_at_human?: string | null
  updated_at: string | null
  updated_at_formatted?: string | null
  updated_at_human?: string | null
}

export interface VtualChannelClaim {
  id: string
  user_id: string
  creator_id: string
  platform_id: string
  external_id: string
  profile_input: string | null
  handle: string | null
  display_name: string | null
  url: string | null
  token?: string
  status: string
  closed_reason: string | null
  attempt_count: number
  expires_at: string | null
  expires_at_formatted?: string | null
  expires_at_human?: string | null
  verified_at: string | null
  verified_at_formatted?: string | null
  verified_at_human?: string | null
  verified_via: string | null
  verified_by_user_id: string | null
  channel_id: string | null
  platform?: VtualPlatform | null
  creator?: VtualCreator | null
  channel?: VtualChannel | null
  user?: { id: string; name: string; email?: string } | null
  created_at: string | null
  created_at_formatted?: string | null
  created_at_human?: string | null
  updated_at: string | null
  updated_at_formatted?: string | null
  updated_at_human?: string | null
}

export interface FhWorkspaceOwner {
  id: string
  name: string
  email?: string
}

export interface FhWorkspace {
  id: string
  owner_user_id: string
  name: string
  kind: string
  status: string
  is_owner: boolean
  my_role: string | null
  owner?: FhWorkspaceOwner | null
  members?: FhWorkspaceMember[]
  created_at: string | null
  created_at_formatted?: string | null
  created_at_human?: string | null
  updated_at: string | null
  updated_at_formatted?: string | null
  updated_at_human?: string | null
}

export interface FhWorkspaceMember {
  id: string
  workspace_id: string
  user_id: string
  role: string
  status: string
  joined_at: string | null
  joined_at_formatted?: string | null
  joined_at_human?: string | null
  user?: { id: string; name: string; email?: string } | null
}

export interface FhWorkspaceInvite {
  id: string
  workspace_id: string
  email: string
  role: string
  status: string
  token: string
  expires_at: string | null
  expires_at_formatted?: string | null
  expires_at_human?: string | null
  accepted_at: string | null
  accepted_at_formatted?: string | null
  accepted_at_human?: string | null
  created_at: string | null
  created_at_formatted?: string | null
  created_at_human?: string | null
}

export interface FhWorkspaceActivity {
  id: string
  event: string | null
  description: string | null
  causer: { id: string; name: string | null; email: string | null } | null
  subject_type: string | null
  subject_id: string | null
  properties: unknown[]
  created_at: string | null
}

export interface FhUploadPart {
  part_number: number
  url: string
  headers?: Record<string, string[]> | null
}

export interface FhUploadSession {
  upload_id: string
  strategy: 'single' | 'multipart'
  path: string
  chunk_size: number
  part_count: number
  parts: FhUploadPart[]
  expires_at: string | null
  expires_at_formatted?: string | null
  expires_at_human?: string | null
  folder_id: string | null
}

export interface FhUploadCompleteResult {
  upload_id: string
  file: HostedFile
}

export interface MicrostockCollectionPayload {
  id: string
  collection_status: string | null
  collection_hint: string | null
  collection_billing_mode: string | null
  collection_locked: boolean
}

export interface MicrostockCollectionStatusPayload {
  status: string
  phase: string | null
  billing_tier: string | null
  hint: string | null
  csv_path: string | null
  total: number
  processed: number
  finalized: number
  failed: number
}

export interface MicrostockCollectionExportPayload {
  path: string
  count: number
}

export interface MicrostockSlotStatus {
  activated: boolean
  used: number
  limit: number
  can_create: boolean
}

export interface MicrostockAssetStages {
  vision: string
  thinking: string
  result: string
}

export interface MicrostockAssetMetadata {
  id: string
  file_id: string
  filename?: string | null
  title: string | null
  keywords: string[]
  description: string | null
  category: string | null
  status: string | null
  stages: MicrostockAssetStages
  error: string | null
  created_at: string | null
  updated_at: string | null
}