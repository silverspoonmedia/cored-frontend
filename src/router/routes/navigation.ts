import type { RouteRecordRaw } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'

export const navigationRoutes: RouteRecordRaw[] = [
  {
    path: '/apps/menus',
    name: 'menus.index',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.menus.title',
      breadcrumb: { labelKey: 'web.menus.breadcrumb' },
    },
    children: [
      {
        path: '',
        name: 'menus.index.view',
        component: () => import('@/views/navigation/MenusView.vue'),
      },
    ],
  },
  {
    path: '/apps/menus/create',
    name: 'menus.create',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.menus.create_title',
      breadcrumb: { parent: 'menus.index.view', labelKey: 'ui.breadcrumb.add' },
    },
    children: [
      {
        path: '',
        name: 'menus.create.view',
        component: () => import('@/views/navigation/MenuEditView.vue'),
      },
    ],
  },
  {
    path: '/apps/menus/:id/edit',
    name: 'menus.edit',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.menus.edit_title',
      breadcrumb: { parent: 'menus.index.view', labelKey: 'ui.breadcrumb.edit' },
    },
    children: [
      {
        path: '',
        name: 'menus.edit.view',
        component: () => import('@/views/navigation/MenuEditView.vue'),
      },
    ],
  },
  {
    path: '/apps/menus/trashed',
    name: 'menus.trashed',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.menus.trashed_title',
      breadcrumb: { parent: 'menus.index.view', labelKey: 'web.menus.trashed_breadcrumb' },
    },
    children: [
      {
        path: '',
        name: 'menus.trashed.view',
        component: () => import('@/views/navigation/MenusTrashedView.vue'),
      },
    ],
  },
]
