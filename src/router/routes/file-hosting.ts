import type { RouteRecordRaw } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'

export const fileHostingMicrostockUsageRoutes: RouteRecordRaw[] = [
  {
    path: '/apps/file-hosting/microstock-usage',
    name: 'file-hosting.microstock-usage',
    component: AppLayout,
    meta: { requiresAuth: true, titleKey: 'web.microstock.usage.title' },
    children: [
      {
        path: '',
        name: 'file-hosting.microstock-usage.view',
        component: () => import('@/views/file-hosting/FileHostingMicrostockUsageView.vue'),
      },
    ],
  },
]

export const fileHostingRoutes: RouteRecordRaw[] = [
  {
    path: '/apps/file-hosting',
    name: 'file-hosting.index',
    component: AppLayout,
    meta: { requiresAuth: true, titleKey: 'web.file-hosting.title' },
    children: [
      {
        path: '',
        name: 'file-hosting.index.view',
        component: () => import('@/views/file-hosting/FileHostingView.vue'),
      },
      {
        path: 'folder/:folderId',
        name: 'file-hosting.index.folder',
        component: () => import('@/views/file-hosting/FileHostingView.vue'),
      },
    ],
  },
  {
    path: '/apps/file-hosting/files/:id',
    name: 'file-hosting.show',
    component: AppLayout,
    meta: { requiresAuth: true, titleKey: 'web.file-hosting.show_title' },
    children: [
      {
        path: '',
        name: 'file-hosting.show.view',
        component: () => import('@/views/file-hosting/FileHostingShowView.vue'),
      },
    ],
  },
  {
    path: '/apps/file-hosting/trash',
    name: 'file-hosting.trash',
    component: AppLayout,
    meta: { requiresAuth: true, titleKey: 'web.file-hosting.trash_title' },
    children: [
      {
        path: '',
        name: 'file-hosting.trash.view',
        component: () => import('@/views/file-hosting/FileHostingTrashView.vue'),
      },
    ],
  },
  {
    path: '/apps/file-hosting/blocklist',
    name: 'file-hosting.blocklist.index',
    component: AppLayout,
    meta: { requiresAuth: true, titleKey: 'web.file-hosting.blocklist_title' },
    children: [
      {
        path: '',
        name: 'file-hosting.blocklist.index.view',
        component: () => import('@/views/file-hosting/FileHostingBlocklistView.vue'),
      },
    ],
  },
  {
    path: '/apps/file-hosting/workspaces',
    name: 'file-hosting.workspaces',
    component: AppLayout,
    meta: { requiresAuth: true, titleKey: 'web.file-hosting.workspaces_title' },
    children: [
      {
        path: '',
        name: 'file-hosting.workspaces.view',
        component: () => import('@/views/file-hosting/FileHostingWorkspacesView.vue'),
      },
    ],
  },
]
