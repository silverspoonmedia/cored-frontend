import type { RouteRecordRaw } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'

export const blogRoutes: RouteRecordRaw[] = [
  {
    path: '/apps/blog/posts',
    name: 'blog.posts.index',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.blog.posts.title',
      breadcrumb: { labelKey: 'web.blog.posts.breadcrumb' },
    },
    children: [
      {
        path: '',
        name: 'blog.posts.index.view',
        component: () => import('@/views/blog/PostsView.vue'),
      },
    ],
  },
  {
    path: '/apps/blog/posts/create',
    name: 'blog.posts.create',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.blog.posts.create_title',
      breadcrumb: { parent: 'blog.posts.index.view', labelKey: 'ui.breadcrumb.add' },
    },
    children: [
      {
        path: '',
        name: 'blog.posts.create.view',
        component: () => import('@/views/blog/PostEditView.vue'),
      },
    ],
  },
  {
    path: '/apps/blog/posts/:id/edit',
    name: 'blog.posts.edit',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.blog.posts.edit_title',
      breadcrumb: { parent: 'blog.posts.index.view', labelKey: 'ui.breadcrumb.edit' },
    },
    children: [
      {
        path: '',
        name: 'blog.posts.edit.view',
        component: () => import('@/views/blog/PostEditView.vue'),
      },
    ],
  },
  {
    path: '/apps/blog/posts/trashed',
    name: 'blog.posts.trashed',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.blog.posts.trashed_title',
      breadcrumb: { parent: 'blog.posts.index.view', labelKey: 'web.blog.posts.trashed_breadcrumb' },
    },
    children: [
      {
        path: '',
        name: 'blog.posts.trashed.view',
        component: () => import('@/views/blog/PostsTrashedView.vue'),
      },
    ],
  },
  {
    path: '/apps/blog/categories',
    name: 'blog.categories.index',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.blog.categories.title',
      breadcrumb: { labelKey: 'web.blog.categories.breadcrumb' },
    },
    children: [
      {
        path: '',
        name: 'blog.categories.index.view',
        component: () => import('@/views/blog/CategoriesView.vue'),
      },
    ],
  },
  {
    path: '/apps/blog/tags',
    name: 'blog.tags.index',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.blog.tags.title',
      breadcrumb: { labelKey: 'web.blog.tags.breadcrumb' },
    },
    children: [
      {
        path: '',
        name: 'blog.tags.index.view',
        component: () => import('@/views/blog/TagsView.vue'),
      },
    ],
  },
]
