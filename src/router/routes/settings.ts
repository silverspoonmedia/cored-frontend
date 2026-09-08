import type { RouteRecordRaw } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'
import { SETTINGS_MENU_GROUPS } from '@/utils/settingsGroup'

const settingsMenuRoutes: RouteRecordRaw[] = SETTINGS_MENU_GROUPS.map((group) => ({
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
    meta: { requiresAuth: true, titleKey: 'web.settings.title' },
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
    meta: { requiresAuth: true, titleKey: 'web.settings.title' },
    children: [
      {
        path: '',
        name: 'settings.group.view',
        component: () => import('@/views/settings/SettingsFormView.vue'),
      },
    ],
  },
]
