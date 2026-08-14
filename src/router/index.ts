import { createRouter, createWebHistory, type RouteLocationNormalized, type RouteLocationRaw, type RouteRecordRaw } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'
import { useAuth } from '@/stores/auth'
import { SETTINGS_MENU_GROUPS } from '@/utils/settingsGroup'

const LEGACY_APP_ROOTS = new Set([
  'dashboard',
  'profile',
  'currencies',
  'notification-audiences',
  'activity-logs',
  'error-logs',
  'notifications',
  'settings',
  'domain-access',
  'users',
  'menus',
  'inference',
  'payment-gateways',
  'subscriptions',
  'services',
  'invoices',
  'vtual',
  'product-activations',
  'payments',
  'file-hosting',
  'payment-channels',
  'service-purchases',
])

function legacyAppsRedirect(to: RouteLocationNormalized): RouteLocationRaw {
  const root = String(to.params.legacyRoot ?? '')
  if (!LEGACY_APP_ROOTS.has(root)) {
    return { name: 'not-found.view' }
  }
  const rest = to.params.pathMatch
  const tail = Array.isArray(rest) && rest.length > 0
    ? `/${rest.join('/')}`
    : typeof rest === 'string' && rest.length > 0
      ? `/${rest}`
      : ''
  return { path: `/apps/${root}${tail}`, query: to.query, hash: to.hash }
}

const settingsMenuRoutes: RouteRecordRaw[] = SETTINGS_MENU_GROUPS.map((group) => ({
  path: `/apps/settings/${group}`,
  name: `settings.${group}`,
  component: AppLayout,
  meta: { requiresAuth: true, titleKey: 'web.settings.title' },
  children: [
    {
      path: '',
      name: `settings.${group}.view`,
      component: () => import('@/views/SettingsFormView.vue'),
    },
  ],
}))

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/apps/dashboard',
    },
    {
      path: '/login',
      name: 'login',
      component: AuthLayout,
      meta: { guestOnly: true, titleKey: 'web.auth.login_title', headingKey: 'web.auth.login_heading' },
      children: [
        {
          path: '',
          name: 'login.view',
          component: () => import('@/views/LoginView.vue'),
        },
      ],
    },
    {
      path: '/register',
      name: 'register',
      component: AuthLayout,
      meta: { guestOnly: true, titleKey: 'web.auth.register_title', headingKey: 'web.auth.register_heading' },
      children: [
        {
          path: '',
          name: 'auth.register.view',
          component: () => import('@/views/RegisterView.vue'),
        },
      ],
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: AuthLayout,
      meta: { guestOnly: true, titleKey: 'web.auth.forgot_password_title', headingKey: 'web.auth.forgot_password_heading' },
      children: [
        {
          path: '',
          name: 'auth.forgot-password.view',
          component: () => import('@/views/ForgotPasswordView.vue'),
        },
      ],
    },
    {
      path: '/reset-password',
      name: 'reset-password',
      component: AuthLayout,
      meta: { guestOnly: true, titleKey: 'web.auth.reset_password_title', headingKey: 'web.auth.reset_password_heading' },
      children: [
        {
          path: '',
          name: 'auth.reset-password.view',
          component: () => import('@/views/ResetPasswordView.vue'),
        },
      ],
    },
    {
      path: '/two-factor-challenge',
      name: 'two-factor.challenge',
      component: AuthLayout,
      meta: { guestOnly: true, titleKey: 'web.auth.two_factor_challenge_title', headingKey: 'web.auth.two_factor_challenge_heading' },
      children: [
        {
          path: '',
          name: 'two-factor.challenge.view',
          component: () => import('@/views/TwoFactorChallengeView.vue'),
        },
      ],
    },
    {
      path: '/apps/dashboard',
      name: 'dashboard',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.dashboard.title' },
      children: [
        {
          path: '',
          name: 'dashboard.view',
          component: () => import('@/views/DashboardView.vue'),
        },
      ],
    },
    {
      path: '/apps/profile/password',
      name: 'profile.password.edit',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.profile.password_title' },
      children: [
        {
          path: '',
          name: 'profile.password.edit.view',
          component: () => import('@/views/PasswordView.vue'),
        },
      ],
    },
    {
      path: '/apps/profile/two-factor',
      name: 'profile.two-factor.edit',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.auth.two_factor_title' },
      children: [
        {
          path: '',
          name: 'profile.two-factor.edit.view',
          component: () => import('@/views/TwoFactorView.vue'),
        },
      ],
    },
    {
      path: '/apps/profile/connections',
      name: 'profile.connections',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.identity-connections.page_title' },
      children: [
        {
          path: '',
          name: 'profile.connections.view',
          component: () => import('@/views/ConnectionsView.vue'),
        },
      ],
    },
    {
      path: '/apps/currencies',
      name: 'currencies.index',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.currencies.title' },
      children: [
        {
          path: '',
          name: 'currencies.index.view',
          component: () => import('@/views/CurrenciesView.vue'),
        },
      ],
    },
    {
      path: '/apps/notification-audiences',
      name: 'notification-audiences.index',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.notification-audiences.title' },
      children: [
        {
          path: '',
          name: 'notification-audiences.index.view',
          component: () => import('@/views/NotificationAudiencesView.vue'),
        },
      ],
    },
    {
      path: '/apps/notification-audiences/:type/edit',
      name: 'notification-audiences.edit',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.notification-audiences.edit_title' },
      children: [
        {
          path: '',
          name: 'notification-audiences.edit.view',
          component: () => import('@/views/NotificationAudienceEditView.vue'),
        },
      ],
    },
    {
      path: '/apps/activity-logs',
      name: 'activity-logs.index',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.activity-log.title' },
      children: [
        {
          path: '',
          name: 'activity-logs.index.view',
          component: () => import('@/views/ActivityLogsView.vue'),
        },
      ],
    },
    {
      path: '/apps/activity-logs/:id',
      name: 'activity-logs.show',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.activity-log.show_title' },
      children: [
        {
          path: '',
          name: 'activity-logs.show.view',
          component: () => import('@/views/ActivityLogShowView.vue'),
        },
      ],
    },
    {
      path: '/apps/error-logs',
      name: 'error-logs.index',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.error-log.title' },
      children: [
        {
          path: '',
          name: 'error-logs.index.view',
          component: () => import('@/views/ErrorLogsView.vue'),
        },
      ],
    },
    {
      path: '/apps/error-logs/:id',
      name: 'error-logs.show',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.error-log.show_title' },
      children: [
        {
          path: '',
          name: 'error-logs.show.view',
          component: () => import('@/views/ErrorLogShowView.vue'),
        },
      ],
    },
    {
      path: '/apps/notifications',
      name: 'notifications.index',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.notifications.title' },
      children: [
        {
          path: '',
          name: 'notifications.index.view',
          component: () => import('@/views/NotificationsView.vue'),
        },
      ],
    },
    {
      path: '/apps/settings',
      name: 'settings.index',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.settings.title' },
      children: [
        {
          path: '',
          name: 'settings.index.view',
          component: () => import('@/views/SettingsView.vue'),
        },
      ],
    },
    ...settingsMenuRoutes,
    {
      path: '/apps/settings/:group',
      name: 'settings.group',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.settings.title' },
      children: [
        {
          path: '',
          name: 'settings.group.view',
          component: () => import('@/views/SettingsFormView.vue'),
        },
      ],
    },
    {
      path: '/apps/domain-access',
      name: 'domain-access.index',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'domain-access.title' },
      children: [
        {
          path: '',
          name: 'domain-access.index.view',
          component: () => import('@/views/DomainAccessView.vue'),
        },
      ],
    },
    {
      path: '/apps/users',
      name: 'users.index',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.users.title' },
      children: [
        {
          path: '',
          name: 'users.index.view',
          component: () => import('@/views/UsersView.vue'),
        },
      ],
    },
    {
      path: '/apps/users/create',
      name: 'users.create',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.users.create_title' },
      children: [
        {
          path: '',
          name: 'users.create.view',
          component: () => import('@/views/UserEditView.vue'),
        },
      ],
    },
    {
      path: '/apps/users/:id/edit',
      name: 'users.edit',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.users.edit_title' },
      children: [
        {
          path: '',
          name: 'users.edit.view',
          component: () => import('@/views/UserEditView.vue'),
        },
      ],
    },
    {
      path: '/apps/menus',
      name: 'menus.index',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.menus.title' },
      children: [
        {
          path: '',
          name: 'menus.index.view',
          component: () => import('@/views/MenusView.vue'),
        },
      ],
    },
    {
      path: '/apps/menus/create',
      name: 'menus.create',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.menus.create_title' },
      children: [
        {
          path: '',
          name: 'menus.create.view',
          component: () => import('@/views/MenuEditView.vue'),
        },
      ],
    },
    {
      path: '/apps/menus/:id/edit',
      name: 'menus.edit',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.menus.edit_title' },
      children: [
        {
          path: '',
          name: 'menus.edit.view',
          component: () => import('@/views/MenuEditView.vue'),
        },
      ],
    },
    {
      path: '/apps/menus/trashed',
      name: 'menus.trashed',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.menus.trashed_title' },
      children: [
        {
          path: '',
          name: 'menus.trashed.view',
          component: () => import('@/views/MenusTrashedView.vue'),
        },
      ],
    },
    {
      path: '/apps/inference/model-cards',
      name: 'inference.model-cards.index',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.inference.model_cards.title' },
      children: [
        {
          path: '',
          name: 'inference.model-cards.index.view',
          component: () => import('@/views/InferenceModelCardsView.vue'),
        },
      ],
    },
    {
      path: '/apps/inference/model-cards/create',
      name: 'inference.model-cards.create',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.inference.model_cards.create_title' },
      children: [
        {
          path: '',
          name: 'inference.model-cards.create.view',
          component: () => import('@/views/InferenceModelCardEditView.vue'),
        },
      ],
    },
    {
      path: '/apps/inference/model-cards/:id/edit',
      name: 'inference.model-cards.edit',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.inference.model_cards.edit_title' },
      children: [
        {
          path: '',
          name: 'inference.model-cards.edit.view',
          component: () => import('@/views/InferenceModelCardEditView.vue'),
        },
      ],
    },
    {
      path: '/apps/inference/model-cards/:id',
      name: 'inference.model-cards.show',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.inference.model_cards.show_title' },
      children: [
        {
          path: '',
          name: 'inference.model-cards.show.view',
          component: () => import('@/views/InferenceModelCardShowView.vue'),
        },
      ],
    },
    {
      path: '/apps/inference/providers',
      name: 'inference.providers.index',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.inference.providers.title' },
      children: [
        {
          path: '',
          name: 'inference.providers.index.view',
          component: () => import('@/views/InferenceProvidersView.vue'),
        },
      ],
    },
    {
      path: '/apps/inference/providers/:id',
      name: 'inference.providers.show',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.inference.providers.show_title' },
      children: [
        {
          path: '',
          name: 'inference.providers.show.view',
          component: () => import('@/views/InferenceProviderShowView.vue'),
        },
      ],
    },
    {
      path: '/apps/inference/providers/create',
      name: 'inference.providers.create',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.inference.providers.create_title' },
      children: [
        {
          path: '',
          name: 'inference.providers.create.view',
          component: () => import('@/views/InferenceProviderEditView.vue'),
        },
      ],
    },
    {
      path: '/apps/inference/providers/:id/edit',
      name: 'inference.providers.edit',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.inference.providers.edit_title' },
      children: [
        {
          path: '',
          name: 'inference.providers.edit.view',
          component: () => import('@/views/InferenceProviderEditView.vue'),
        },
      ],
    },
    {
      path: '/apps/payment-gateways',
      name: 'payment-gateways.index',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.payments.gateways.title' },
      children: [
        {
          path: '',
          name: 'payment-gateways.index.view',
          component: () => import('@/views/PaymentGatewaysView.vue'),
        },
      ],
    },
    {
      path: '/apps/payment-gateways/create',
      name: 'payment-gateways.create',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.payments.gateways.create_title' },
      children: [
        {
          path: '',
          name: 'payment-gateways.create.view',
          component: () => import('@/views/PaymentGatewayEditView.vue'),
        },
      ],
    },
    {
      path: '/apps/payment-gateways/:id/edit',
      name: 'payment-gateways.edit',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.payments.gateways.edit_title' },
      children: [
        {
          path: '',
          name: 'payment-gateways.edit.view',
          component: () => import('@/views/PaymentGatewayEditView.vue'),
        },
      ],
    },
    {
      path: '/apps/subscriptions',
      name: 'subscriptions.index',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.payments.subscriptions.title' },
      children: [
        {
          path: '',
          name: 'subscriptions.index.view',
          component: () => import('@/views/SubscriptionsView.vue'),
        },
      ],
    },
    {
      path: '/apps/subscriptions/create',
      name: 'subscriptions.create',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.payments.subscriptions.create_title' },
      children: [
        {
          path: '',
          name: 'subscriptions.create.view',
          component: () => import('@/views/SubscriptionEditView.vue'),
        },
      ],
    },
    {
      path: '/apps/subscriptions/:id/edit',
      name: 'subscriptions.edit',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.payments.subscriptions.edit_title' },
      children: [
        {
          path: '',
          name: 'subscriptions.edit.view',
          component: () => import('@/views/SubscriptionEditView.vue'),
        },
      ],
    },
    {
      path: '/apps/subscriptions/:id',
      name: 'subscriptions.show',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.payments.subscriptions.show_title' },
      children: [
        {
          path: '',
          name: 'subscriptions.show.view',
          component: () => import('@/views/SubscriptionShowView.vue'),
        },
      ],
    },
    {
      path: '/apps/services',
      name: 'services.index',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.services.title' },
      children: [
        {
          path: '',
          name: 'services.index.view',
          component: () => import('@/views/ServicesView.vue'),
        },
      ],
    },
    {
      path: '/apps/services/create',
      name: 'services.create',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.services.create_title' },
      children: [
        {
          path: '',
          name: 'services.create.view',
          component: () => import('@/views/ServiceEditView.vue'),
        },
      ],
    },
    {
      path: '/apps/services/:id/edit',
      name: 'services.edit',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.services.edit_title' },
      children: [
        {
          path: '',
          name: 'services.edit.view',
          component: () => import('@/views/ServiceEditView.vue'),
        },
      ],
    },
    {
      path: '/apps/services/:id',
      name: 'services.show',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.services.show_title' },
      children: [
        {
          path: '',
          name: 'services.show.view',
          component: () => import('@/views/ServiceShowView.vue'),
        },
      ],
    },
    {
      path: '/apps/invoices',
      name: 'invoices.index',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.payments.invoices.title' },
      children: [
        {
          path: '',
          name: 'invoices.index.view',
          component: () => import('@/views/InvoicesView.vue'),
        },
      ],
    },
    {
      path: '/apps/invoices/:id',
      name: 'invoices.show',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.payments.invoices.show_title' },
      children: [
        {
          path: '',
          name: 'invoices.show.view',
          component: () => import('@/views/InvoiceShowView.vue'),
        },
      ],
    },
    {
      path: '/apps/vtual/profiles',
      name: 'vtual.profiles.index',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.vtual-profiles.page_title' },
      children: [
        {
          path: '',
          name: 'vtual.profiles.index.view',
          component: () => import('@/views/VtualProfilesView.vue'),
        },
      ],
    },
    {
      path: '/apps/vtual/vtuber',
      name: 'vtual.vtuber.index',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.vtual-vtuber.hub_title' },
      children: [
        {
          path: '',
          name: 'vtual.vtuber.index.view',
          component: () => import('@/views/VtualVtuberIndexView.vue'),
        },
      ],
    },
    {
      path: '/apps/vtual/orphans',
      name: 'vtual.orphans.index',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.vtual-orphans.title' },
      children: [
        {
          path: '',
          name: 'vtual.orphans.index.view',
          component: () => import('@/views/VtualOrphansView.vue'),
        },
      ],
    },
    {
      path: '/apps/vtual/orphans/create',
      name: 'vtual.orphans.create',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.vtual-orphans.create_title' },
      children: [
        {
          path: '',
          name: 'vtual.orphans.create.view',
          component: () => import('@/views/VtualOrphanEditView.vue'),
        },
      ],
    },
    {
      path: '/apps/vtual/orphans/:id/edit',
      name: 'vtual.orphans.edit',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.vtual-orphans.edit_title' },
      children: [
        {
          path: '',
          name: 'vtual.orphans.edit.view',
          component: () => import('@/views/VtualOrphanEditView.vue'),
        },
      ],
    },
    {
      path: '/apps/vtual/platform-credentials',
      name: 'vtual.platform-credentials.index',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.vtual-platform-credentials.title' },
      children: [
        {
          path: '',
          name: 'vtual.platform-credentials.index.view',
          component: () => import('@/views/VtualPlatformCredentialsView.vue'),
        },
      ],
    },
    {
      path: '/apps/vtual/platform-credentials/probe',
      name: 'vtual.platform-credentials.probe',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.vtual.probe.title' },
      children: [
        {
          path: '',
          name: 'vtual.platform-credentials.probe.view',
          component: () => import('@/views/VtualPlatformCredentialProbeView.vue'),
        },
      ],
    },
    {
      path: '/apps/vtual/platform-credentials/:platformId',
      name: 'vtual.platform-credentials.platform',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.vtual.credentials.list' },
      children: [
        {
          path: '',
          name: 'vtual.platform-credentials.platform.view',
          component: () => import('@/views/VtualPlatformCredentialPlatformView.vue'),
        },
      ],
    },
    {
      path: '/apps/vtual/platform-credentials/:platformId/create',
      name: 'vtual.platform-credentials.create',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.vtual.admin.credentials.create_title' },
      children: [
        {
          path: '',
          name: 'vtual.platform-credentials.create.view',
          component: () => import('@/views/VtualPlatformCredentialCreateView.vue'),
        },
      ],
    },
    {
      path: '/apps/vtual/credentials/:id/edit',
      name: 'vtual.platform-credentials.edit',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.vtual.admin.credentials.edit_title' },
      children: [
        {
          path: '',
          name: 'vtual.platform-credentials.edit.view',
          component: () => import('@/views/VtualPlatformCredentialCreateView.vue'),
        },
      ],
    },
    {
      path: '/apps/product-activations',
      name: 'product-activations.index',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'product-activations.products_title' },
      children: [
        {
          path: '',
          name: 'product-activations.index.view',
          component: () => import('@/views/ProductActivationsView.vue'),
        },
      ],
    },
    {
      path: '/apps/product-activations/:productKey',
      name: 'product-activations.show',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'product-activations.product_title' },
      children: [
        {
          path: '',
          name: 'product-activations.show.view',
          component: () => import('@/views/ProductActivationShowView.vue'),
        },
      ],
    },
    {
      path: '/apps/inference/usage-events',
      name: 'inference.usage-events.index',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.inference.usage.title' },
      children: [
        {
          path: '',
          name: 'inference.usage-events.index.view',
          component: () => import('@/views/InferenceUsageEventsView.vue'),
        },
      ],
    },
    {
      path: '/apps/payments/income',
      name: 'payments.income.index',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.payments.income.title' },
      children: [
        {
          path: '',
          name: 'payments.income.index.view',
          component: () => import('@/views/PaymentsIncomeView.vue'),
        },
      ],
    },
    {
      path: '/apps/file-hosting/microstock-usage',
      name: 'file-hosting.microstock-usage',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.microstock.usage.title' },
      children: [
        {
          path: '',
          name: 'file-hosting.microstock-usage.view',
          component: () => import('@/views/FileHostingMicrostockUsageView.vue'),
        },
      ],
    },
    {
      path: '/apps/payment-channels',
      name: 'payment-channels.index',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.payments.channels.title' },
      children: [
        {
          path: '',
          name: 'payment-channels.index.view',
          component: () => import('@/views/PaymentChannelsView.vue'),
        },
      ],
    },
    {
      path: '/apps/service-purchases/:id',
      name: 'service-purchases.show',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.services.purchase_title' },
      children: [
        {
          path: '',
          name: 'service-purchases.show.view',
          component: () => import('@/views/ServicePurchaseShowView.vue'),
        },
      ],
    },
    {
      path: '/apps/file-hosting',
      name: 'file-hosting.index',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.file-hosting.title' },
      children: [
        {
          path: '',
          name: 'file-hosting.index.view',
          component: () => import('@/views/FileHostingView.vue'),
        },
        {
          path: 'folder/:folderId',
          name: 'file-hosting.index.folder',
          component: () => import('@/views/FileHostingView.vue'),
        },
      ],
    },
    {
      path: '/apps/file-hosting/files/:id',
      name: 'file-hosting.show',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.file-hosting.show_title' },
      children: [
        {
          path: '',
          name: 'file-hosting.show.view',
          component: () => import('@/views/FileHostingShowView.vue'),
        },
      ],
    },
    {
      path: '/apps/file-hosting/trash',
      name: 'file-hosting.trash',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.file-hosting.trash_title' },
      children: [
        {
          path: '',
          name: 'file-hosting.trash.view',
          component: () => import('@/views/FileHostingTrashView.vue'),
        },
      ],
    },
    {
      path: '/apps/file-hosting/blocklist',
      name: 'file-hosting.blocklist',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.file-hosting.blocklist_title' },
      children: [
        {
          path: '',
          name: 'file-hosting.blocklist.view',
          component: () => import('@/views/FileHostingBlocklistView.vue'),
        },
      ],
    },
    {
      path: '/apps/file-hosting/workspaces',
      name: 'file-hosting.workspaces',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.file-hosting.workspaces_title' },
      children: [
        {
          path: '',
          name: 'file-hosting.workspaces.view',
          component: () => import('@/views/FileHostingWorkspacesView.vue'),
        },
      ],
    },
    {
      path: '/s/f/:id',
      name: 'public.file',
      component: () => import('@/layouts/PublicLayout.vue'),
      meta: { public: true },
      children: [
        {
          path: '',
          name: 'public.file.view',
          component: () => import('@/views/PublicFileView.vue'),
        },
      ],
    },
    {
      path: '/s/d/:id',
      name: 'public.folder',
      component: () => import('@/layouts/PublicLayout.vue'),
      meta: { public: true },
      children: [
        {
          path: '',
          name: 'public.folder.view',
          component: () => import('@/views/PublicFolderView.vue'),
        },
      ],
    },
    {
      path: '/apps/vtual/profiles/:id',
      name: 'vtual.profiles.show',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.vtual.profiles.manage_title' },
      children: [
        {
          path: '',
          name: 'vtual.profiles.show.view',
          component: () => import('@/views/VtualProfileShowView.vue'),
        },
      ],
    },
    {
      path: '/apps/vtual/vtubers/:slug',
      name: 'vtual.vtuber.show',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.vtual-vtuber.title' },
      children: [
        {
          path: '',
          name: 'vtual.vtuber.show.view',
          component: () => import('@/views/VtualVtuberShowView.vue'),
        },
      ],
    },
    {
      path: '/apps/vtual/vtubers/:slug/claim',
      name: 'vtual.vtuber.claim',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'web.vtual-vtuber.claim_page_title' },
      children: [
        {
          path: '',
          name: 'vtual.vtuber.claim.view',
          component: () => import('@/views/VtualVtuberClaimView.vue'),
        },
      ],
    },
    {
      path: '/payment/return',
      name: 'payment.return',
      component: () => import('@/views/PaymentReturnView.vue'),
      meta: { requiresAuth: true, titleKey: 'web.payments.confirming_payment' },
    },
    {
      path: '/payment/cancel',
      name: 'payment.cancel',
      component: () => import('@/views/PaymentReturnView.vue'),
      meta: { requiresAuth: true, titleKey: 'web.payments.payment_cancelled' },
    },
    {
      path: '/:legacyRoot/:pathMatch(.*)*',
      redirect: legacyAppsRedirect,
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: AppLayout,
      meta: { requiresAuth: true, titleKey: 'errors.not_found' },
      children: [
        {
          path: '',
          name: 'not-found.view',
          component: () => import('@/views/NotFoundView.vue'),
        },
      ],
    },
  ] as RouteRecordRaw[],
})

let hydrated = false

router.beforeEach(async (to) => {
  if (!hydrated) {
    const { hydrate } = useAuth()
    await hydrate()
    hydrated = true
  }

  const { isAuthenticated } = useAuth()

  if (to.meta.requiresAuth && !isAuthenticated.value) {
    return { name: 'login.view', query: { redirect: to.fullPath } }
  }

  if (to.meta.guestOnly && isAuthenticated.value) {
    return { name: 'dashboard.view' }
  }
})

export default router
