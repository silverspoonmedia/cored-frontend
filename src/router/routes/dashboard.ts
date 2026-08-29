import type { RouteRecordRaw } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'

export const dashboardRoutes: RouteRecordRaw[] = [
  {
    path: '/apps/dashboard',
    name: 'dashboard',
    component: AppLayout,
    meta: { requiresAuth: true, titleKey: 'web.dashboard.title' },
    children: [
      {
        path: '',
        name: 'dashboard.view',
        component: () => import('@/views/dashboard/DashboardView.vue'),
      },
    ],
  },
]
