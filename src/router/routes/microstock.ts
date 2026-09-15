import type { RouteRecordRaw } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'

export const microstockRoutes: RouteRecordRaw[] = [
  {
    path: '/apps/archivd/microstock-credentials',
    name: 'archivd.microstock-credentials',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.microstock-credentials.title',
    },
    children: [
      {
        path: '',
        name: 'archivd.microstock-credentials.view',
        component: () => import('@/views/microstock/MicrostockCredentialsView.vue'),
      },
    ],
  },
]
