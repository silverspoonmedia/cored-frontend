import type { RouteRecordRaw } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'

export const domainAccessRoutes: RouteRecordRaw[] = [
  {
    path: '/apps/domain-access',
    name: 'domain-access.index',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'domain-access.title',
      breadcrumb: { labelKey: 'web.domain-access.card_title' },
    },
    children: [
      {
        path: '',
        name: 'domain-access.index.view',
        component: () => import('@/views/domain-access/DomainAccessView.vue'),
      },
    ],
  },
]
