import type { RouteRecordRaw } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'
import { archivdMicrostockUsageRoutes, archivdRoutes } from '@/features/archivd/routes'

/**
 * Routes owned by the Archivd product domain.
 *
 * They are contributed to the router through `src/features/registry.ts`, never
 * imported by the core router. A fork without Archivd drops this file with the
 * feature directory.
 */
const archivdSettingsRoutes: RouteRecordRaw[] = [
  {
    path: '/apps/settings/archivd',
    name: 'settings.archivd',
    component: AppLayout,
    meta: { requiresAuth: true, titleKey: 'web.settings.title' },
    children: [
      {
        path: '',
        name: 'settings.archivd.view',
        component: () => import('@/views/settings/SettingsFormView.vue'),
      },
    ],
  },
]

const publicShareRoutes: RouteRecordRaw[] = [
  {
    path: '/s/f/:id',
    name: 'public.file',
    component: () => import('@/layouts/PublicLayout.vue'),
    meta: { public: true },
    children: [
      {
        path: '',
        name: 'public.file.view',
        component: () => import('@/features/archivd/views/PublicFileView.vue'),
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
        component: () => import('@/features/archivd/views/PublicFolderView.vue'),
      },
    ],
  },
]

export const archivdFeatureRoutes: RouteRecordRaw[] = [
  ...archivdMicrostockUsageRoutes,
  ...archivdRoutes,
  ...archivdSettingsRoutes,
  ...publicShareRoutes,
]
