import type { RouteRecordRaw } from 'vue-router'
import { legacyAppsRedirect } from '@/router/legacy'

export const legacyRoutes: RouteRecordRaw[] = [
  {
    path: '/:legacyRoot/:pathMatch(.*)*',
    redirect: legacyAppsRedirect,
  },
]
