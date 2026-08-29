import type { RouteRecordRaw } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'

export const microstockRoutes: RouteRecordRaw[] = [
  {
    path: '/apps/file-hosting/microstock-credentials',
    name: 'file-hosting.microstock-credentials',
    component: AppLayout,
    meta: { requiresAuth: true, titleKey: 'web.microstock-credentials.title' },
    children: [
      {
        path: '',
        name: 'file-hosting.microstock-credentials.view',
        component: () => import('@/views/microstock/MicrostockCredentialsView.vue'),
      },
    ],
  },
]
