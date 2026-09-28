import type { RouteRecordRaw } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'

export const vtualAdminEarlyRoutes: RouteRecordRaw[] = [
  {
    path: '/apps/vtual/profiles',
    name: 'vtual.profiles.index',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.vtual-profiles.page_title',
      breadcrumb: { labelKey: 'web.vtual.profiles.title' },
    },
    children: [
      {
        path: '',
        name: 'vtual.profiles.index.view',
        component: () => import('@/views/vtual/VtualProfilesView.vue'),
      },
    ],
  },
  {
    path: '/apps/vtual/vtuber',
    name: 'vtual.vtuber.index',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.vtual-vtuber.hub_title',
    },
    children: [
      {
        path: '',
        name: 'vtual.vtuber.index.view',
        component: () => import('@/views/vtual/VtualVtuberIndexView.vue'),
      },
    ],
  },
  {
    path: '/apps/vtual/orphans',
    name: 'vtual.orphans.index',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.vtual-orphans.title',
      breadcrumb: { labelKey: 'web.vtual-orphans.breadcrumb' },
    },
    children: [
      {
        path: '',
        name: 'vtual.orphans.index.view',
        component: () => import('@/views/vtual/VtualOrphansView.vue'),
      },
    ],
  },
  {
    path: '/apps/vtual/orphans/create',
    name: 'vtual.orphans.create',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.vtual-orphans.create_title',
      breadcrumb: { parent: 'vtual.orphans.index.view', labelKey: 'ui.breadcrumb.add' },
    },
    children: [
      {
        path: '',
        name: 'vtual.orphans.create.view',
        component: () => import('@/views/vtual/VtualOrphanEditView.vue'),
      },
    ],
  },
  {
    path: '/apps/vtual/orphans/:id/edit',
    name: 'vtual.orphans.edit',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.vtual-orphans.edit_title',
      breadcrumb: { parent: 'vtual.orphans.index.view', labelKey: 'ui.breadcrumb.edit' },
    },
    children: [
      {
        path: '',
        name: 'vtual.orphans.edit.view',
        component: () => import('@/views/vtual/VtualOrphanEditView.vue'),
      },
    ],
  },
  {
    path: '/apps/vtual/claims',
    name: 'vtual.claims.index',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.vtual.claims.title',
      breadcrumb: { labelKey: 'web.vtual.claims.breadcrumb' },
    },
    children: [
      {
        path: '',
        name: 'vtual.claims.index.view',
        component: () => import('@/views/vtual/VtualClaimsView.vue'),
      },
    ],
  },
  {
    path: '/apps/vtual/events',
    name: 'vtual.events.index',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.vtual-events.title',
      breadcrumb: { labelKey: 'web.vtual-events.breadcrumb' },
    },
    children: [
      {
        path: '',
        name: 'vtual.events.index.view',
        component: () => import('@/views/vtual/VtualEventsView.vue'),
      },
    ],
  },
  {
    path: '/apps/vtual/events/create',
    name: 'vtual.events.create',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.vtual-events.create_title',
      breadcrumb: { parent: 'vtual.events.index.view', labelKey: 'ui.breadcrumb.add' },
    },
    children: [
      {
        path: '',
        name: 'vtual.events.create.view',
        component: () => import('@/views/vtual/VtualEventEditView.vue'),
      },
    ],
  },
  {
    path: '/apps/vtual/events/:id/edit',
    name: 'vtual.events.edit',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.vtual-events.edit_title',
      breadcrumb: { parent: 'vtual.events.index.view', labelKey: 'ui.breadcrumb.edit' },
    },
    children: [
      {
        path: '',
        name: 'vtual.events.edit.view',
        component: () => import('@/views/vtual/VtualEventEditView.vue'),
      },
    ],
  },
  {
    path: '/apps/vtual/incidents',
    name: 'vtual.incidents.index',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.vtual.incidents.title',
      breadcrumb: { labelKey: 'web.vtual.incidents.breadcrumb' },
    },
    children: [
      {
        path: '',
        name: 'vtual.incidents.index.view',
        component: () => import('@/views/vtual/VtualIncidentsView.vue'),
      },
    ],
  },
  {
    path: '/apps/vtual/managements',
    name: 'vtual.managements.index',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.vtual-managements.title',
      breadcrumb: { labelKey: 'web.vtual-managements.breadcrumb' },
    },
    children: [
      {
        path: '',
        name: 'vtual.managements.index.view',
        component: () => import('@/views/vtual/VtualManagementsView.vue'),
      },
    ],
  },
  {
    path: '/apps/vtual/managements/create',
    name: 'vtual.managements.create',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.vtual-managements.create_title',
      breadcrumb: { parent: 'vtual.managements.index.view', labelKey: 'ui.breadcrumb.add' },
    },
    children: [
      {
        path: '',
        name: 'vtual.managements.create.view',
        component: () => import('@/views/vtual/VtualManagementEditView.vue'),
      },
    ],
  },
  {
    path: '/apps/vtual/managements/:id/edit',
    name: 'vtual.managements.edit',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.vtual-managements.edit_title',
      breadcrumb: { parent: 'vtual.managements.index.view', labelKey: 'ui.breadcrumb.edit' },
    },
    children: [
      {
        path: '',
        name: 'vtual.managements.edit.view',
        component: () => import('@/views/vtual/VtualManagementEditView.vue'),
      },
    ],
  },
  {
    path: '/apps/vtual/invites/respond',
    name: 'vtual.invites.respond',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.vtual-invites.title',
    },
    children: [
      {
        path: '',
        name: 'vtual.invites.respond.view',
        component: () => import('@/views/vtual/VtualInviteRespondView.vue'),
      },
    ],
  },
  {
    path: '/apps/vtual/platform-credentials',
    name: 'vtual.platform-credentials.index',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.vtual-platform-credentials.title',
      breadcrumb: { labelKey: 'web.vtual-platform-credentials.breadcrumb' },
    },
    children: [
      {
        path: '',
        name: 'vtual.platform-credentials.index.view',
        component: () => import('@/views/vtual/VtualPlatformCredentialsView.vue'),
      },
    ],
  },
  {
    path: '/apps/vtual/platform-credentials/probe',
    name: 'vtual.platform-credentials.probe',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.vtual.probe.title',
      breadcrumb: { parent: 'vtual.platform-credentials.index.view' },
    },
    children: [
      {
        path: '',
        name: 'vtual.platform-credentials.probe.view',
        component: () => import('@/views/vtual/VtualPlatformCredentialProbeView.vue'),
      },
    ],
  },
  {
    path: '/apps/vtual/platform-credentials/:platformId',
    name: 'vtual.platform-credentials.platform',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.vtual.credentials.list',
      breadcrumb: { parent: 'vtual.platform-credentials.index.view' },
    },
    children: [
      {
        path: '',
        name: 'vtual.platform-credentials.platform.view',
        component: () => import('@/views/vtual/VtualPlatformCredentialPlatformView.vue'),
      },
    ],
  },
  {
    path: '/apps/vtual/platform-credentials/:platformId/create',
    name: 'vtual.platform-credentials.create',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.vtual.admin.credentials.create_title',
      breadcrumb: { parent: 'vtual.platform-credentials.index.view' },
    },
    children: [
      {
        path: '',
        name: 'vtual.platform-credentials.create.view',
        component: () => import('@/views/vtual/VtualPlatformCredentialCreateView.vue'),
      },
    ],
  },
  {
    path: '/apps/vtual/credentials/:id/edit',
    name: 'vtual.platform-credentials.edit',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.vtual.admin.credentials.edit_title',
      breadcrumb: { parent: 'vtual.platform-credentials.index.view' },
    },
    children: [
      {
        path: '',
        name: 'vtual.platform-credentials.edit.view',
        component: () => import('@/views/vtual/VtualPlatformCredentialCreateView.vue'),
      },
    ],
  },
]

export const vtualAdminLateRoutes: RouteRecordRaw[] = [
  {
    path: '/apps/vtual/profiles/:id',
    name: 'vtual.profiles.show',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.vtual.profiles.manage_title',
      breadcrumb: { parent: 'vtual.profiles.index.view' },
    },
    children: [
      {
        path: '',
        name: 'vtual.profiles.show.view',
        component: () => import('@/views/vtual/VtualProfileShowView.vue'),
      },
    ],
  },
  {
    path: '/apps/vtual/vtuber/:slug/claim',
    redirect: (to) => ({
      name: 'vtual.vtuber.claim.view',
      params: { slug: String(to.params.slug ?? '') },
      query: to.query,
      hash: to.hash,
    }),
  },
  {
    path: '/apps/vtual/vtuber/:slug',
    redirect: (to) => ({
      name: 'vtual.vtuber.show.view',
      params: { slug: String(to.params.slug ?? '') },
      query: to.query,
      hash: to.hash,
    }),
  },
  {
    path: '/apps/vtual/vtubers/:slug',
    name: 'vtual.vtuber.show',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.vtual-vtuber.title',
      breadcrumb: { parent: 'vtual.vtuber.index.view' },
    },
    children: [
      {
        path: '',
        name: 'vtual.vtuber.show.view',
        component: () => import('@/views/vtual/VtualVtuberShowView.vue'),
      },
    ],
  },
  {
    path: '/apps/vtual/vtubers/:slug/claim',
    name: 'vtual.vtuber.claim',
    component: AppLayout,
    meta: {
      requiresAuth: true,
      titleKey: 'web.vtual-vtuber.claim_page_title',
      breadcrumb: { parent: 'vtual.vtuber.show.view' },
    },
    children: [
      {
        path: '',
        name: 'vtual.vtuber.claim.view',
        component: () => import('@/views/vtual/VtualVtuberClaimView.vue'),
      },
    ],
  },
]

export const vtualPublicRoutes: RouteRecordRaw[] = [
  {
    path: '/vtual',
    name: 'vtual.public',
    component: () => import('@/valkivid3/layouts/VkStr1Layout.vue'),
    meta: { public: true, template: 'valkivid3', titleKey: 'web.vtual.public.title' },
    children: [
      {
        path: '',
        name: 'vtual.public.view',
        component: () => import('@/valkivid3/views/VkStr1VtualHomeView.vue'),
      },
      {
        path: 'vtuber/:slug/claim',
        redirect: (to) => ({
          name: 'vtual.vtuber.claim.view',
          params: { slug: String(to.params.slug ?? '') },
          query: to.query,
          hash: to.hash,
        }),
      },
      {
        path: 'vtuber/:slug',
        redirect: (to) => ({
          name: 'vtual.vtuber.show.view',
          params: { slug: String(to.params.slug ?? '') },
          query: to.query,
          hash: to.hash,
        }),
      },
      {
        path: 'vtubers/:slug',
        name: 'vtual.public.vtuber',
        component: () => import('@/valkivid3/views/VkStr1VtuberShowView.vue'),
        meta: { public: true, template: 'valkivid3', titleKey: 'web.vtual.public.title' },
      },
      {
        path: 'management/:slug',
        redirect: (to) => ({
          name: 'vtual.public.management',
          params: { slug: String(to.params.slug ?? '') },
          query: to.query,
          hash: to.hash,
        }),
      },
      {
        path: 'managements/:slug',
        name: 'vtual.public.management',
        component: () => import('@/valkivid3/views/VkStr1ManagementShowView.vue'),
        meta: { public: true, template: 'valkivid3', titleKey: 'web.vtual.public.title' },
      },
    ],
  },
]
