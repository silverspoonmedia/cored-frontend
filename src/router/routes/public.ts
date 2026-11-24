import type { RouteRecordRaw } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'

/** 404 catch-all. `/s/*` public share routes are contributed by a product feature, if one ships. */
export const notFoundRoutes: RouteRecordRaw[] = [
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: AppLayout,
    meta: { requiresAuth: true, titleKey: 'errors.not_found' },
    children: [
      {
        path: '',
        name: 'not-found.view',
        component: () => import('@/views/public/NotFoundView.vue'),
      },
    ],
  },
]
