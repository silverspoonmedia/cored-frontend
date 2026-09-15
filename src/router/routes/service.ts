import type { RouteRecordRaw } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'

export const subscriptionRoutes: RouteRecordRaw[] = [
  {
    path: '/apps/subscriptions',
    name: 'subscriptions.index',
    component: AppLayout,
    meta: { requiresAuth: true, titleKey: 'web.payments.subscriptions.title' },
    children: [
      {
        path: '',
        name: 'subscriptions.index.view',
        component: () => import('@/views/service/SubscriptionsView.vue'),
      },
    ],
  },
  {
    path: '/apps/subscriptions/create',
    name: 'subscriptions.create',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.payments.subscriptions.create_title',
      breadcrumb: { parent: 'subscriptions.index.view', labelKey: 'ui.breadcrumb.add' },
    },
    children: [
      {
        path: '',
        name: 'subscriptions.create.view',
        component: () => import('@/views/service/SubscriptionEditView.vue'),
      },
    ],
  },
  {
    path: '/apps/subscriptions/:id/edit',
    name: 'subscriptions.edit',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.payments.subscriptions.edit_title',
      breadcrumb: { parent: 'subscriptions.index.view', labelKey: 'ui.breadcrumb.edit' },
    },
    children: [
      {
        path: '',
        name: 'subscriptions.edit.view',
        component: () => import('@/views/service/SubscriptionEditView.vue'),
      },
    ],
  },
  {
    path: '/apps/subscriptions/:id',
    name: 'subscriptions.show',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.payments.subscriptions.show_title',
      breadcrumb: { parent: 'subscriptions.index.view' },
    },
    children: [
      {
        path: '',
        name: 'subscriptions.show.view',
        component: () => import('@/views/service/SubscriptionShowView.vue'),
      },
    ],
  },
]

export const serviceCatalogRoutes: RouteRecordRaw[] = [
  {
    path: '/apps/services',
    name: 'services.index',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.services.title',
      breadcrumb: { labelKey: 'web.services.breadcrumb' },
    },
    children: [
      {
        path: '',
        name: 'services.index.view',
        component: () => import('@/views/service/ServicesView.vue'),
      },
    ],
  },
  {
    path: '/apps/services/create',
    name: 'services.create',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.services.create_title',
      breadcrumb: { parent: 'services.index.view', labelKey: 'ui.breadcrumb.add' },
    },
    children: [
      {
        path: '',
        name: 'services.create.view',
        component: () => import('@/views/service/ServiceEditView.vue'),
      },
    ],
  },
  {
    path: '/apps/services/:id/edit',
    name: 'services.edit',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.services.edit_title',
      breadcrumb: { parent: 'services.index.view', labelKey: 'ui.breadcrumb.edit' },
    },
    children: [
      {
        path: '',
        name: 'services.edit.view',
        component: () => import('@/views/service/ServiceEditView.vue'),
      },
    ],
  },
  {
    path: '/apps/services/:id',
    name: 'services.show',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.services.show_title',
      breadcrumb: { parent: 'services.index.view' },
    },
    children: [
      {
        path: '',
        name: 'services.show.view',
        component: () => import('@/views/service/ServiceShowView.vue'),
      },
    ],
  },
]

export const servicePurchaseRoutes: RouteRecordRaw[] = [
  {
    path: '/apps/service-purchases/:id',
    name: 'service-purchases.show',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.services.purchase_title',
      breadcrumb: { parent: 'services.index.view' },
    },
    children: [
      {
        path: '',
        name: 'service-purchases.show.view',
        component: () => import('@/views/service/ServicePurchaseShowView.vue'),
      },
    ],
  },
]
