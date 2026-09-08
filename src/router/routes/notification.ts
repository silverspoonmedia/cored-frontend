import type { RouteRecordRaw } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'

export const notificationAudienceRoutes: RouteRecordRaw[] = [
  {
    path: '/apps/notification-audiences',
    name: 'notification-audiences.index',
    component: AppLayout,
    meta: { requiresAuth: true, titleKey: 'web.notification-audiences.title' },
    children: [
      {
        path: '',
        name: 'notification-audiences.index.view',
        component: () => import('@/views/notification/NotificationAudiencesView.vue'),
      },
    ],
  },
  {
    path: '/apps/notification-audiences/:type/edit',
    name: 'notification-audiences.edit',
    component: AppLayout,
    meta: { requiresAuth: true, titleKey: 'web.notification-audiences.edit_title' },
    children: [
      {
        path: '',
        name: 'notification-audiences.edit.view',
        component: () => import('@/views/notification/NotificationAudienceEditView.vue'),
      },
    ],
  },
]

export const notificationInboxRoutes: RouteRecordRaw[] = [
  {
    path: '/apps/notifications',
    name: 'notifications.index',
    component: AppLayout,
    meta: { requiresAuth: true, titleKey: 'web.notifications.title' },
    children: [
      {
        path: '',
        name: 'notifications.index.view',
        component: () => import('@/views/notification/NotificationsView.vue'),
      },
    ],
  },
]
