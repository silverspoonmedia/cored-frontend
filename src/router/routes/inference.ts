import type { RouteRecordRaw } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'

export const inferenceCatalogRoutes: RouteRecordRaw[] = [
  {
    path: '/apps/inference/model-cards',
    name: 'inference.model-cards.index',
    component: AppLayout,
    meta: { requiresAuth: true, titleKey: 'web.inference.model_cards.title' },
    children: [
      {
        path: '',
        name: 'inference.model-cards.index.view',
        component: () => import('@/views/inference/InferenceModelCardsView.vue'),
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
        component: () => import('@/views/inference/InferenceModelCardEditView.vue'),
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
        component: () => import('@/views/inference/InferenceModelCardEditView.vue'),
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
        component: () => import('@/views/inference/InferenceModelCardShowView.vue'),
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
        component: () => import('@/views/inference/InferenceProvidersView.vue'),
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
        component: () => import('@/views/inference/InferenceProviderShowView.vue'),
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
        component: () => import('@/views/inference/InferenceProviderEditView.vue'),
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
        component: () => import('@/views/inference/InferenceProviderEditView.vue'),
      },
    ],
  },
]

export const inferenceUsageRoutes: RouteRecordRaw[] = [
  {
    path: '/apps/inference/usage-events',
    name: 'inference.usage-events.index',
    component: AppLayout,
    meta: { requiresAuth: true, titleKey: 'web.inference.usage.title' },
    children: [
      {
        path: '',
        name: 'inference.usage-events.index.view',
        component: () => import('@/views/inference/InferenceUsageEventsView.vue'),
      },
    ],
  },
]
