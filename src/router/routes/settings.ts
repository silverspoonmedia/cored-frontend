import type { RouteRecordRaw } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'
import { CORE_SETTINGS_MENU_GROUPS } from '@/utils/settingsGroup'

// Product settings groups render through their feature's own route
// contribution (`src/features/{name}/routes/feature.ts`), so this file only
// needs the kernel groups.
const settingsMenuRoutes: RouteRecordRaw[] = CORE_SETTINGS_MENU_GROUPS.map((group) => ({
  path: `/apps/settings/${group}`,
  name: `settings.${group}`,
  component: AppLayout,
  meta: { requiresAuth: true, titleKey: 'web.settings.title' },
  children: [
    {
      path: '',
      name: `settings.${group}.view`,
      component: () => import('@/views/settings/SettingsFormView.vue'),
    },
  ],
}))

export const settingsRoutes: RouteRecordRaw[] = [
  {
    path: '/apps/settings',
    name: 'settings.index',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.settings.title',
      breadcrumb: { labelKey: 'web.settings.title' },
    },
    children: [
      {
        path: '',
        name: 'settings.index.view',
        component: () => import('@/views/settings/SettingsView.vue'),
      },
    ],
  },
  ...settingsMenuRoutes,
  {
    path: '/apps/settings/:group',
    name: 'settings.group',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.settings.title',
      // Only used when the `:group` param is empty; a known group is rendered by
      // the settings branch in `useBreadcrumbs()` as `Settings / <group>`.
      breadcrumb: { parent: 'settings.index.view', labelKey: 'web.settings.title' },
    },
    children: [
      {
        path: '',
        name: 'settings.group.view',
        component: () => import('@/views/settings/SettingsFormView.vue'),
      },
    ],
  },
]
