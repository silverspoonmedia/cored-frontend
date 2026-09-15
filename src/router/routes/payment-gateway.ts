import type { RouteRecordRaw } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'

export const currencyRoutes: RouteRecordRaw[] = [
  {
    path: '/apps/currencies',
    name: 'currencies.index',
    component: AppLayout,
    meta: { requiresAuth: true, titleKey: 'web.currencies.title' },
    children: [
      {
        path: '',
        name: 'currencies.index.view',
        component: () => import('@/views/payment-gateway/CurrenciesView.vue'),
      },
    ],
  },
]

export const paymentGatewayRoutes: RouteRecordRaw[] = [
  {
    path: '/apps/payment-gateways',
    name: 'payment-gateways.index',
    component: AppLayout,
    meta: { requiresAuth: true, titleKey: 'web.payments.gateways.title' },
    children: [
      {
        path: '',
        name: 'payment-gateways.index.view',
        component: () => import('@/views/payment-gateway/PaymentGatewaysView.vue'),
      },
    ],
  },
  {
    path: '/apps/payment-gateways/create',
    name: 'payment-gateways.create',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.payments.gateways.create_title',
      breadcrumb: { parent: 'payment-gateways.index.view', labelKey: 'ui.breadcrumb.add' },
    },
    children: [
      {
        path: '',
        name: 'payment-gateways.create.view',
        component: () => import('@/views/payment-gateway/PaymentGatewayEditView.vue'),
      },
    ],
  },
  {
    path: '/apps/payment-gateways/:id/edit',
    name: 'payment-gateways.edit',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.payments.gateways.edit_title',
      breadcrumb: { parent: 'payment-gateways.index.view', labelKey: 'ui.breadcrumb.edit' },
    },
    children: [
      {
        path: '',
        name: 'payment-gateways.edit.view',
        component: () => import('@/views/payment-gateway/PaymentGatewayEditView.vue'),
      },
    ],
  },
]

export const invoiceRoutes: RouteRecordRaw[] = [
  {
    path: '/apps/invoices',
    name: 'invoices.index',
    component: AppLayout,
    meta: { requiresAuth: true, titleKey: 'web.payments.invoices.title' },
    children: [
      {
        path: '',
        name: 'invoices.index.view',
        component: () => import('@/views/payment-gateway/InvoicesView.vue'),
      },
    ],
  },
  {
    path: '/apps/invoices/:id',
    name: 'invoices.show',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.payments.invoices.show_title',
      breadcrumb: { parent: 'invoices.index.view' },
    },
    children: [
      {
        path: '',
        name: 'invoices.show.view',
        component: () => import('@/views/payment-gateway/InvoiceShowView.vue'),
      },
    ],
  },
]

export const paymentsIncomeRoutes: RouteRecordRaw[] = [
  {
    path: '/apps/payments/income',
    name: 'payments.income.index',
    component: AppLayout,
    meta: { requiresAuth: true, titleKey: 'web.payments.income.title' },
    children: [
      {
        path: '',
        name: 'payments.income.index.view',
        component: () => import('@/views/payment-gateway/PaymentsIncomeView.vue'),
      },
    ],
  },
]

export const paymentChannelRoutes: RouteRecordRaw[] = [
  {
    path: '/apps/payment-channels',
    name: 'payment-channels.index',
    component: AppLayout,
    meta: { requiresAuth: true, titleKey: 'web.payments.channels.title' },
    children: [
      {
        path: '',
        name: 'payment-channels.index.view',
        component: () => import('@/views/payment-gateway/PaymentChannelsView.vue'),
      },
    ],
  },
]

export const paymentReturnRoutes: RouteRecordRaw[] = [
  {
    path: '/payment/return',
    name: 'payment.return',
    component: () => import('@/views/payment-gateway/PaymentReturnView.vue'),
    meta: { requiresAuth: true, titleKey: 'web.payments.confirming_payment' },
  },
  {
    path: '/payment/cancel',
    name: 'payment.cancel',
    component: () => import('@/views/payment-gateway/PaymentReturnView.vue'),
    meta: { requiresAuth: true, titleKey: 'web.payments.payment_cancelled' },
  },
]
