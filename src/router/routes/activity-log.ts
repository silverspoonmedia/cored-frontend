import type { RouteRecordRaw } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'

export const activityLogRoutes: RouteRecordRaw[] = [
  {
    path: '/apps/activity-logs',
    name: 'activity-logs.index',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.activity-log.title',
      breadcrumb: { labelKey: 'web.activity-log.breadcrumb' },
    },
    children: [
      {
        path: '',
        name: 'activity-logs.index.view',
        component: () => import('@/views/activity-log/ActivityLogsView.vue'),
      },
    ],
  },
  {
    path: '/apps/activity-logs/:id',
    name: 'activity-logs.show',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.activity-log.show_title',
      breadcrumb: { parent: 'activity-logs.index.view', labelKey: 'web.activity-log.show_breadcrumb' },
    },
    children: [
      {
        path: '',
        name: 'activity-logs.show.view',
        component: () => import('@/views/activity-log/ActivityLogShowView.vue'),
      },
    ],
  },
]
