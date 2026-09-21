import type { RouteRecordRaw } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'

export const aiConnectionRoutes: RouteRecordRaw[] = [
  {
    path: '/apps/ai/connections',
    name: 'ai.connections.index',
    component: AppLayout,
    meta: { requiresAuth: true, titleKey: 'web.ai-connections.title' },
    children: [
      {
        path: '',
        name: 'ai.connections.index.view',
        component: () => import('@/views/ai/AiConnectionsView.vue'),
      },
    ],
  },
  {
    path: '/apps/ai/connections/create',
    name: 'ai.connections.create',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.ai-connections.create_title',
      breadcrumb: { parent: 'ai.connections.index.view', labelKey: 'ui.breadcrumb.add' },
    },
    children: [
      {
        path: '',
        name: 'ai.connections.create.view',
        component: () => import('@/views/ai/AiConnectionEditView.vue'),
      },
    ],
  },
  {
    path: '/apps/ai/connections/:id/edit',
    name: 'ai.connections.edit',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.ai-connections.edit_title',
      breadcrumb: { parent: 'ai.connections.index.view', labelKey: 'ui.breadcrumb.edit' },
    },
    children: [
      {
        path: '',
        name: 'ai.connections.edit.view',
        component: () => import('@/views/ai/AiConnectionEditView.vue'),
      },
    ],
  },
]
