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

/**
 * Who may see a menu node. `role` is the only audience that carries role
 * restrictions; switching away from it clears the attached roles.
 */
export type MenuAudience = 'all' | 'auth' | 'role' | 'guest'

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
  audience: MenuAudience
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

// --- AI Connections (central AI transport + credentials) ---
/** Envelope-encrypted connection row. The API never returns the key itself. */
export interface AiConnection {
  actions?: QueryRowAction[]
  id: string
  slug: string
  label: string
  driver: string
  endpoint: string
  test_model: string
  timeout_seconds: number | null
  connect_timeout_seconds: number | null
  max_retries: number | null
  has_extra_headers: boolean
  is_default: boolean
  status: string
  secret_hint: string | null
  has_secret: boolean
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
  created_by: string | null
  created_at: string | null
  created_at_formatted: string | null
  created_at_human: string | null
  updated_at: string | null
  updated_at_formatted: string | null
  updated_at_human: string | null
}

/** `POST ai/connections/{id}/test` payload. */
export interface AiConnectionTestPayload {
  connection: AiConnection
  test: {
    ok: boolean
    message: string
    latency_ms: number | null
  }
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
