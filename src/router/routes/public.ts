import type { RouteRecordRaw } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'

export const publicShareRoutes: RouteRecordRaw[] = [
  {
    path: '/s/f/:id',
    name: 'public.file',
    component: () => import('@/layouts/PublicLayout.vue'),
    meta: { public: true },
    children: [
      {
        path: '',
        name: 'public.file.view',
        component: () => import('@/views/public/PublicFileView.vue'),
      },
    ],
  },
  {
    path: '/s/d/:id',
    name: 'public.folder',
    component: () => import('@/layouts/PublicLayout.vue'),
    meta: { public: true },
    children: [
      {
        path: '',
        name: 'public.folder.view',
        component: () => import('@/views/public/PublicFolderView.vue'),
      },
    ],
  },
]

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
