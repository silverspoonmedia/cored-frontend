import type { RouteRecordRaw } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'

export const errorLogRoutes: RouteRecordRaw[] = [
  {
    path: '/apps/error-logs',
    name: 'error-logs.index',
    component: AppLayout,
    meta: { requiresAuth: true, titleKey: 'web.error-log.title' },
    children: [
      {
        path: '',
        name: 'error-logs.index.view',
        component: () => import('@/views/error-log/ErrorLogsView.vue'),
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
        component: () => import('@/views/error-log/ErrorLogShowView.vue'),
      },
    ],
  },
]
