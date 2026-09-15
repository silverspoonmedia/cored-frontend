import type { RouteRecordRaw } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'

export const productActivationRoutes: RouteRecordRaw[] = [
  {
    path: '/apps/product-activations',
    name: 'product-activations.index',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'product-activations.products_title',
      breadcrumb: { labelKey: 'web.product-activations.title' },
    },
    children: [
      {
        path: '',
        name: 'product-activations.index.view',
        component: () => import('@/views/product-activations/ProductActivationsView.vue'),
      },
    ],
  },
  {
    path: '/apps/product-activations/:productKey',
    name: 'product-activations.show',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'product-activations.product_title',
      breadcrumb: { parent: 'product-activations.index.view', labelKey: 'ui.breadcrumb.edit' },
    },
    children: [
      {
        path: '',
        name: 'product-activations.show.view',
        component: () => import('@/views/product-activations/ProductActivationShowView.vue'),
      },
    ],
  },
]
