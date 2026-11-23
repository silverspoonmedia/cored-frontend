import type { RouteRecordRaw } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'
import { microstockRoutes } from '@/features/microstock/routes'

/**
 * Routes owned by the Microstock product domain, contributed to the router
 * through `src/features/registry.ts`.
 */
const microstockSettingsRoutes: RouteRecordRaw[] = [
  {
    path: '/apps/settings/microstock',
    name: 'settings.microstock',
    component: AppLayout,
    meta: { requiresAuth: true, titleKey: 'web.settings.title' },
    children: [
      {
        path: '',
        name: 'settings.microstock.view',
        component: () => import('@/views/settings/SettingsFormView.vue'),
      },
    ],
  },
]

export const microstockFeatureRoutes: RouteRecordRaw[] = [
  ...microstockRoutes,
  ...microstockSettingsRoutes,
]
