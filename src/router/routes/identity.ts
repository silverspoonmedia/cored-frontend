import type { RouteRecordRaw } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'

export const identityProfileRoutes: RouteRecordRaw[] = [
  {
    path: '/apps/profile/password',
    name: 'profile.password.edit',
    component: AppLayout,
    meta: { requiresAuth: true, titleKey: 'web.profile.password_title' },
    children: [
      {
        path: '',
        name: 'profile.password.edit.view',
        component: () => import('@/views/identity/PasswordView.vue'),
      },
    ],
  },
  {
    path: '/apps/profile/two-factor',
    name: 'profile.two-factor.edit',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.auth.two_factor_title',
      breadcrumb: { labelKey: 'menu.two_factor' },
    },
    children: [
      {
        path: '',
        name: 'profile.two-factor.edit.view',
        component: () => import('@/views/identity/TwoFactorView.vue'),
      },
    ],
  },
  {
    path: '/apps/profile/connections',
    name: 'profile.connections',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.identity-connections.page_title',
      breadcrumb: { labelKey: 'menu.connected_accounts' },
    },
    children: [
      {
        path: '',
        name: 'profile.connections.view',
        component: () => import('@/views/identity/ConnectionsView.vue'),
      },
    ],
  },
]

export const identityUserRoutes: RouteRecordRaw[] = [
  {
    path: '/apps/users',
    name: 'users.index',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.users.title',
      breadcrumb: { labelKey: 'web.users.breadcrumb' },
    },
    children: [
      {
        path: '',
        name: 'users.index.view',
        component: () => import('@/views/identity/UsersView.vue'),
      },
    ],
  },
  {
    path: '/apps/users/create',
    name: 'users.create',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.users.create_title',
      breadcrumb: { parent: 'users.index.view', labelKey: 'ui.breadcrumb.add' },
    },
    children: [
      {
        path: '',
        name: 'users.create.view',
        component: () => import('@/views/identity/UserEditView.vue'),
      },
    ],
  },
  {
    path: '/apps/users/:id/edit',
    name: 'users.edit',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.users.edit_title',
      breadcrumb: { parent: 'users.index.view', labelKey: 'ui.breadcrumb.edit' },
    },
    children: [
      {
        path: '',
        name: 'users.edit.view',
        component: () => import('@/views/identity/UserEditView.vue'),
      },
    ],
  },
]
