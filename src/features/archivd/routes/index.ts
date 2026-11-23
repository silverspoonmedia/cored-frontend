import type { RouteRecordRaw } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'

export const archivdMicrostockUsageRoutes: RouteRecordRaw[] = [
  {
    path: '/apps/archivd/microstock-usage',
    name: 'archivd.microstock-usage',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.microstock.usage.title',
      breadcrumb: { labelKey: 'web.archivd.microstock_title' },
    },
    children: [
      {
        path: '',
        name: 'archivd.microstock-usage.view',
        component: () => import('@/features/archivd/views/ArchivdMicrostockUsageView.vue'),
      },
    ],
  },
]

export const archivdRoutes: RouteRecordRaw[] = [
  {
    path: '/apps/archivd',
    name: 'archivd.index',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.archivd.title',
    },
    children: [
      {
        path: '',
        name: 'archivd.index.view',
        component: () => import('@/features/archivd/views/ArchivdView.vue'),
      },
      {
        path: 'folder/:folderId',
        name: 'archivd.index.folder',
        component: () => import('@/features/archivd/views/ArchivdView.vue'),
      },
    ],
  },
  {
    path: '/apps/archivd/files/:id',
    name: 'archivd.show',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.archivd.show_title',
      breadcrumb: { parent: 'archivd.index.view' },
    },
    children: [
      {
        path: '',
        name: 'archivd.show.view',
        component: () => import('@/features/archivd/views/ArchivdShowView.vue'),
      },
    ],
  },
  {
    path: '/apps/archivd/trash',
    name: 'archivd.trash',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.archivd.trash_title',
      breadcrumb: { parent: 'archivd.index.view' },
    },
    children: [
      {
        path: '',
        name: 'archivd.trash.view',
        component: () => import('@/features/archivd/views/ArchivdTrashView.vue'),
      },
    ],
  },
  {
    path: '/apps/archivd/blocklist',
    name: 'archivd.blocklist.index',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.archivd.blocklist_title',
    },
    children: [
      {
        path: '',
        name: 'archivd.blocklist.index.view',
        component: () => import('@/features/archivd/views/ArchivdBlocklistView.vue'),
      },
    ],
  },
  {
    path: '/apps/archivd/workspaces',
    name: 'archivd.workspaces',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.archivd.workspaces_title',
      breadcrumb: { parent: 'archivd.index.view' },
    },
    children: [
      {
        path: '',
        name: 'archivd.workspaces.view',
        component: () => import('@/features/archivd/views/ArchivdWorkspacesView.vue'),
      },
    ],
  },
]
