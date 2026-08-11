import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'
import { useAuth } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/dashboard',
    },
    {
      path: '/login',
      name: 'login',
      component: AuthLayout,
      meta: { guestOnly: true },
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
      meta: { guestOnly: true },
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
      meta: { guestOnly: true },
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
      meta: { guestOnly: true },
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
      meta: { guestOnly: true },
      children: [
        {
          path: '',
          name: 'two-factor.challenge.view',
          component: () => import('@/views/TwoFactorChallengeView.vue'),
        },
      ],
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: AppLayout,
      props: { title: 'Dashboard' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'dashboard.view',
          component: () => import('@/views/DashboardView.vue'),
        },
      ],
    },
    {
      path: '/profile/password',
      name: 'profile.password.edit',
      component: AppLayout,
      props: { title: 'Password' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'profile.password.edit.view',
          component: () => import('@/views/PasswordView.vue'),
        },
      ],
    },
    {
      path: '/profile/two-factor',
      name: 'profile.two-factor.edit',
      component: AppLayout,
      props: { title: 'Two-Factor Authentication' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'profile.two-factor.edit.view',
          component: () => import('@/views/TwoFactorView.vue'),
        },
      ],
    },
    {
      path: '/profile/connections',
      name: 'profile.connections',
      component: AppLayout,
      props: { title: 'Connections' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'profile.connections.view',
          component: () => import('@/views/ConnectionsView.vue'),
        },
      ],
    },
    {
      path: '/currencies',
      name: 'currencies.index',
      component: AppLayout,
      props: { title: 'Currencies' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'currencies.index.view',
          component: () => import('@/views/CurrenciesView.vue'),
        },
      ],
    },
    {
      path: '/notification-audiences',
      name: 'notification-audiences.index',
      component: AppLayout,
      props: { title: 'Notification Audiences' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'notification-audiences.index.view',
          component: () => import('@/views/NotificationAudiencesView.vue'),
        },
      ],
    },
    {
      path: '/notification-audiences/:type/edit',
      name: 'notification-audiences.edit',
      component: AppLayout,
      props: { title: 'Edit Notification Audience' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'notification-audiences.edit.view',
          component: () => import('@/views/NotificationAudienceEditView.vue'),
        },
      ],
    },
    {
      path: '/activity-logs',
      name: 'activity-logs.index',
      component: AppLayout,
      props: { title: 'Activity Logs' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'activity-logs.index.view',
          component: () => import('@/views/ActivityLogsView.vue'),
        },
      ],
    },
    {
      path: '/activity-logs/:id',
      name: 'activity-logs.show',
      component: AppLayout,
      props: { title: 'Activity Log Detail' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'activity-logs.show.view',
          component: () => import('@/views/ActivityLogShowView.vue'),
        },
      ],
    },
    {
      path: '/error-logs',
      name: 'error-logs.index',
      component: AppLayout,
      props: { title: 'Error Logs' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'error-logs.index.view',
          component: () => import('@/views/ErrorLogsView.vue'),
        },
      ],
    },
    {
      path: '/error-logs/:id',
      name: 'error-logs.show',
      component: AppLayout,
      props: { title: 'Error Log Detail' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'error-logs.show.view',
          component: () => import('@/views/ErrorLogShowView.vue'),
        },
      ],
    },
    {
      path: '/notifications',
      name: 'notifications.index',
      component: AppLayout,
      props: { title: 'Notifications' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'notifications.index.view',
          component: () => import('@/views/NotificationsView.vue'),
        },
      ],
    },
    {
      path: '/settings',
      name: 'settings.index',
      component: AppLayout,
      props: { title: 'Settings' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'settings.index.view',
          component: () => import('@/views/SettingsView.vue'),
        },
      ],
    },
    {
      path: '/settings/:group',
      name: 'settings.group',
      component: AppLayout,
      props: { title: 'Group Settings' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'settings.group.view',
          component: () => import('@/views/SettingsFormView.vue'),
        },
      ],
    },
    {
      path: '/domain-access',
      name: 'domain-access.index',
      component: AppLayout,
      props: { title: 'Domain Access' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'domain-access.index.view',
          component: () => import('@/views/DomainAccessView.vue'),
        },
      ],
    },
    {
      path: '/users',
      name: 'users.index',
      component: AppLayout,
      props: { title: 'Users' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'users.index.view',
          component: () => import('@/views/UsersView.vue'),
        },
      ],
    },
    {
      path: '/users/create',
      name: 'users.create',
      component: AppLayout,
      props: { title: 'Create User' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'users.create.view',
          component: () => import('@/views/UserEditView.vue'),
        },
      ],
    },
    {
      path: '/users/:id/edit',
      name: 'users.edit',
      component: AppLayout,
      props: { title: 'Edit User' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'users.edit.view',
          component: () => import('@/views/UserEditView.vue'),
        },
      ],
    },
    {
      path: '/menus',
      name: 'menus.index',
      component: AppLayout,
      props: { title: 'Navigation Menus' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'menus.index.view',
          component: () => import('@/views/MenusView.vue'),
        },
      ],
    },
    {
      path: '/menus/create',
      name: 'menus.create',
      component: AppLayout,
      props: { title: 'Create Menu' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'menus.create.view',
          component: () => import('@/views/MenuEditView.vue'),
        },
      ],
    },
    {
      path: '/menus/:id/edit',
      name: 'menus.edit',
      component: AppLayout,
      props: { title: 'Edit Menu' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'menus.edit.view',
          component: () => import('@/views/MenuEditView.vue'),
        },
      ],
    },
    {
      path: '/menus/trashed',
      name: 'menus.trashed',
      component: AppLayout,
      props: { title: 'Trashed Menus' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'menus.trashed.view',
          component: () => import('@/views/MenusTrashedView.vue'),
        },
      ],
    },
    {
      path: '/inference/model-cards',
      name: 'inference.model-cards.index',
      component: AppLayout,
      props: { title: 'AI Model Cards' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'inference.model-cards.index.view',
          component: () => import('@/views/InferenceModelCardsView.vue'),
        },
      ],
    },
    {
      path: '/inference/model-cards/create',
      name: 'inference.model-cards.create',
      component: AppLayout,
      props: { title: 'Create Model Card' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'inference.model-cards.create.view',
          component: () => import('@/views/InferenceModelCardEditView.vue'),
        },
      ],
    },
    {
      path: '/inference/model-cards/:id/edit',
      name: 'inference.model-cards.edit',
      component: AppLayout,
      props: { title: 'Edit Model Card' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'inference.model-cards.edit.view',
          component: () => import('@/views/InferenceModelCardEditView.vue'),
        },
      ],
    },
    {
      path: '/inference/model-cards/:id',
      name: 'inference.model-cards.show',
      component: AppLayout,
      props: { title: 'Model Card Detail' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'inference.model-cards.show.view',
          component: () => import('@/views/InferenceModelCardShowView.vue'),
        },
      ],
    },
    {
      path: '/inference/providers',
      name: 'inference.providers.index',
      component: AppLayout,
      props: { title: 'Inference Providers' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'inference.providers.index.view',
          component: () => import('@/views/InferenceProvidersView.vue'),
        },
      ],
    },
    {
      path: '/inference/providers/:id',
      name: 'inference.providers.show',
      component: AppLayout,
      props: { title: 'Inference Provider' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'inference.providers.show.view',
          component: () => import('@/views/InferenceProviderShowView.vue'),
        },
      ],
    },
    {
      path: '/inference/providers/create',
      name: 'inference.providers.create',
      component: AppLayout,
      props: { title: 'Create Provider' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'inference.providers.create.view',
          component: () => import('@/views/InferenceProviderEditView.vue'),
        },
      ],
    },
    {
      path: '/inference/providers/:id/edit',
      name: 'inference.providers.edit',
      component: AppLayout,
      props: { title: 'Edit Provider' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'inference.providers.edit.view',
          component: () => import('@/views/InferenceProviderEditView.vue'),
        },
      ],
    },
    {
      path: '/payment-gateways',
      name: 'payment-gateways.index',
      component: AppLayout,
      props: { title: 'Payment Gateways' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'payment-gateways.index.view',
          component: () => import('@/views/PaymentGatewaysView.vue'),
        },
      ],
    },
    {
      path: '/payment-gateways/create',
      name: 'payment-gateways.create',
      component: AppLayout,
      props: { title: 'Create Payment Gateway' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'payment-gateways.create.view',
          component: () => import('@/views/PaymentGatewayEditView.vue'),
        },
      ],
    },
    {
      path: '/payment-gateways/:id/edit',
      name: 'payment-gateways.edit',
      component: AppLayout,
      props: { title: 'Edit Payment Gateway' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'payment-gateways.edit.view',
          component: () => import('@/views/PaymentGatewayEditView.vue'),
        },
      ],
    },
    {
      path: '/subscriptions',
      name: 'subscriptions.index',
      component: AppLayout,
      props: { title: 'Subscriptions' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'subscriptions.index.view',
          component: () => import('@/views/SubscriptionsView.vue'),
        },
      ],
    },
    {
      path: '/subscriptions/create',
      name: 'subscriptions.create',
      component: AppLayout,
      props: { title: 'Create Subscription' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'subscriptions.create.view',
          component: () => import('@/views/SubscriptionEditView.vue'),
        },
      ],
    },
    {
      path: '/subscriptions/:id/edit',
      name: 'subscriptions.edit',
      component: AppLayout,
      props: { title: 'Edit Subscription' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'subscriptions.edit.view',
          component: () => import('@/views/SubscriptionEditView.vue'),
        },
      ],
    },
    {
      path: '/subscriptions/:id',
      name: 'subscriptions.show',
      component: AppLayout,
      props: { title: 'Subscription Detail' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'subscriptions.show.view',
          component: () => import('@/views/SubscriptionShowView.vue'),
        },
      ],
    },
    {
      path: '/services',
      name: 'services.index',
      component: AppLayout,
      props: { title: 'Services' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'services.index.view',
          component: () => import('@/views/ServicesView.vue'),
        },
      ],
    },
    {
      path: '/services/create',
      name: 'services.create',
      component: AppLayout,
      props: { title: 'Create Service' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'services.create.view',
          component: () => import('@/views/ServiceEditView.vue'),
        },
      ],
    },
    {
      path: '/services/:id/edit',
      name: 'services.edit',
      component: AppLayout,
      props: { title: 'Edit Service' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'services.edit.view',
          component: () => import('@/views/ServiceEditView.vue'),
        },
      ],
    },
    {
      path: '/services/:id',
      name: 'services.show',
      component: AppLayout,
      props: { title: 'Service Detail' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'services.show.view',
          component: () => import('@/views/ServiceShowView.vue'),
        },
      ],
    },
    {
      path: '/invoices',
      name: 'invoices.index',
      component: AppLayout,
      props: { title: 'Invoices' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'invoices.index.view',
          component: () => import('@/views/InvoicesView.vue'),
        },
      ],
    },
    {
      path: '/invoices/:id',
      name: 'invoices.show',
      component: AppLayout,
      props: { title: 'Invoice Detail' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'invoices.show.view',
          component: () => import('@/views/InvoiceShowView.vue'),
        },
      ],
    },
    {
      path: '/vtual/profiles',
      name: 'vtual.profiles.index',
      component: AppLayout,
      props: { title: 'My Creator Profiles' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'vtual.profiles.index.view',
          component: () => import('@/views/VtualProfilesView.vue'),
        },
      ],
    },
    {
      path: '/vtual/vtuber',
      name: 'vtual.vtuber.index',
      component: AppLayout,
      props: { title: 'Vtuber Hub' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'vtual.vtuber.index.view',
          component: () => import('@/views/VtualVtuberIndexView.vue'),
        },
      ],
    },
    {
      path: '/vtual/orphans',
      name: 'vtual.orphans.index',
      component: AppLayout,
      props: { title: 'Orphan Creators' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'vtual.orphans.index.view',
          component: () => import('@/views/VtualOrphansView.vue'),
        },
      ],
    },
    {
      path: '/vtual/orphans/create',
      name: 'vtual.orphans.create',
      component: AppLayout,
      props: { title: 'Create Orphan Creator' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'vtual.orphans.create.view',
          component: () => import('@/views/VtualOrphanEditView.vue'),
        },
      ],
    },
    {
      path: '/vtual/orphans/:id/edit',
      name: 'vtual.orphans.edit',
      component: AppLayout,
      props: { title: 'Edit Orphan Creator' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'vtual.orphans.edit.view',
          component: () => import('@/views/VtualOrphanEditView.vue'),
        },
      ],
    },
    {
      path: '/vtual/platform-credentials',
      name: 'vtual.platform-credentials.index',
      component: AppLayout,
      props: { title: 'Platform Credentials' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'vtual.platform-credentials.index.view',
          component: () => import('@/views/VtualPlatformCredentialsView.vue'),
        },
      ],
    },
    {
      path: '/vtual/platform-credentials/:platformId',
      name: 'vtual.platform-credentials.platform',
      component: AppLayout,
      props: { title: 'Platform Credentials' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'vtual.platform-credentials.platform.view',
          component: () => import('@/views/VtualPlatformCredentialPlatformView.vue'),
        },
      ],
    },
    {
      path: '/vtual/platform-credentials/:platformId/create',
      name: 'vtual.platform-credentials.create',
      component: AppLayout,
      props: { title: 'Create Credential' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'vtual.platform-credentials.create.view',
          component: () => import('@/views/VtualPlatformCredentialCreateView.vue'),
        },
      ],
    },
    {
      path: '/vtual/credentials/:id/edit',
      name: 'vtual.platform-credentials.edit',
      component: AppLayout,
      props: { title: 'Edit Credential' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'vtual.platform-credentials.edit.view',
          component: () => import('@/views/VtualPlatformCredentialCreateView.vue'),
        },
      ],
    },
    {
      path: '/vtual/platform-credentials/probe',
      name: 'vtual.platform-credentials.probe',
      component: AppLayout,
      props: { title: 'Platform API Probe' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'vtual.platform-credentials.probe.view',
          component: () => import('@/views/VtualPlatformCredentialProbeView.vue'),
        },
      ],
    },
    {
      path: '/product-activations',
      name: 'product-activations.index',
      component: AppLayout,
      props: { title: 'Product Activations' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'product-activations.index.view',
          component: () => import('@/views/ProductActivationsView.vue'),
        },
      ],
    },
    {
      path: '/product-activations/:productKey',
      name: 'product-activations.show',
      component: AppLayout,
      props: { title: 'Product Activation Detail' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'product-activations.show.view',
          component: () => import('@/views/ProductActivationShowView.vue'),
        },
      ],
    },
    {
      path: '/inference/usage-events',
      name: 'inference.usage-events.index',
      component: AppLayout,
      props: { title: 'Inference Usage Events' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'inference.usage-events.index.view',
          component: () => import('@/views/InferenceUsageEventsView.vue'),
        },
      ],
    },
    {
      path: '/payments/income',
      name: 'payments.income.index',
      component: AppLayout,
      props: { title: 'Payments Income' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'payments.income.index.view',
          component: () => import('@/views/PaymentsIncomeView.vue'),
        },
      ],
    },
    {
      path: '/file-hosting/microstock-usage',
      name: 'file-hosting.microstock-usage',
      component: AppLayout,
      props: { title: 'Microstock Usage' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'file-hosting.microstock-usage.view',
          component: () => import('@/views/FileHostingMicrostockUsageView.vue'),
        },
      ],
    },
    {
      path: '/payment-channels',
      name: 'payment-channels.index',
      component: AppLayout,
      props: { title: 'Payment Channels' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'payment-channels.index.view',
          component: () => import('@/views/PaymentChannelsView.vue'),
        },
      ],
    },
    {
      path: '/service-purchases/:id',
      name: 'service-purchases.show',
      component: AppLayout,
      props: { title: 'Service Purchase' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'service-purchases.show.view',
          component: () => import('@/views/ServicePurchaseShowView.vue'),
        },
      ],
    },
    {
      path: '/file-hosting',
      name: 'file-hosting.index',
      component: AppLayout,
      props: { title: 'File Hosting' },
      meta: { requiresAuth: true },
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
      path: '/file-hosting/files/:id',
      name: 'file-hosting.show',
      component: AppLayout,
      props: { title: 'File Detail' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'file-hosting.show.view',
          component: () => import('@/views/FileHostingShowView.vue'),
        },
      ],
    },
    {
      path: '/file-hosting/trash',
      name: 'file-hosting.trash',
      component: AppLayout,
      props: { title: 'Trash' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'file-hosting.trash.view',
          component: () => import('@/views/FileHostingTrashView.vue'),
        },
      ],
    },
    {
      path: '/file-hosting/blocklist',
      name: 'file-hosting.blocklist',
      component: AppLayout,
      props: { title: 'Hash Blocklist' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'file-hosting.blocklist.view',
          component: () => import('@/views/FileHostingBlocklistView.vue'),
        },
      ],
    },
    {
      path: '/file-hosting/workspaces',
      name: 'file-hosting.workspaces',
      component: AppLayout,
      props: { title: 'Workspaces' },
      meta: { requiresAuth: true },
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
      path: '/vtual/profiles/:id',
      name: 'vtual.profiles.show',
      component: AppLayout,
      props: { title: 'Creator Profile' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'vtual.profiles.show.view',
          component: () => import('@/views/VtualProfileShowView.vue'),
        },
      ],
    },
    {
      path: '/vtual/vtubers/:slug',
      name: 'vtual.vtuber.show',
      component: AppLayout,
      props: { title: 'Vtuber Profile' },
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'vtual.vtuber.show.view',
          component: () => import('@/views/VtualVtuberShowView.vue'),
        },
      ],
    },
    {
      path: '/vtual/vtubers/:slug/claim',
      name: 'vtual.vtuber.claim',
      component: AppLayout,
      props: { title: 'Claim Profile' },
      meta: { requiresAuth: true },
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
      meta: { requiresAuth: true },
    },
    {
      path: '/payment/cancel',
      name: 'payment.cancel',
      component: () => import('@/views/PaymentReturnView.vue'),
      meta: { requiresAuth: true },
    },
  ],
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
