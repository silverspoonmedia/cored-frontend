import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuth } from '@/stores/auth'
import { authRoutes } from '@/router/routes/auth'
import { dashboardRoutes } from '@/router/routes/dashboard'
import { identityProfileRoutes, identityUserRoutes } from '@/router/routes/identity'
import { currencyRoutes, paymentGatewayRoutes, invoiceRoutes, paymentsIncomeRoutes, paymentChannelRoutes, paymentReturnRoutes } from '@/router/routes/payment-gateway'
import { notificationAudienceRoutes, notificationInboxRoutes } from '@/router/routes/notification'
import { activityLogRoutes } from '@/router/routes/activity-log'
import { errorLogRoutes } from '@/router/routes/error-log'
import { settingsRoutes } from '@/router/routes/settings'
import { domainAccessRoutes } from '@/router/routes/domain-access'
import { navigationRoutes } from '@/router/routes/navigation'
import { inferenceCatalogRoutes, inferenceUsageRoutes } from '@/router/routes/inference'
import { aiConnectionRoutes } from '@/router/routes/ai'
import { subscriptionRoutes, serviceCatalogRoutes, servicePurchaseRoutes } from '@/router/routes/service'
import { vtualAdminEarlyRoutes, vtualAdminLateRoutes, vtualPublicRoutes } from '@/router/routes/vtual'
import { productActivationRoutes } from '@/router/routes/product-activations'
import { archivdMicrostockUsageRoutes, archivdRoutes } from '@/router/routes/archivd'
import { microstockRoutes } from '@/router/routes/microstock'
import { publicShareRoutes, notFoundRoutes } from '@/router/routes/public'
import { legacyRoutes } from '@/router/routes/legacy'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    if (to.hash) {
      return { el: to.hash, top: 96, behavior: 'smooth' }
    }
    return { top: 0 }
  },
  routes: [
    {
      path: '/',
      redirect: '/apps/dashboard',
    },
    ...authRoutes,
    ...dashboardRoutes,
    ...identityProfileRoutes,
    ...currencyRoutes,
    ...notificationAudienceRoutes,
    ...activityLogRoutes,
    ...errorLogRoutes,
    ...notificationInboxRoutes,
    ...settingsRoutes,
    ...domainAccessRoutes,
    ...identityUserRoutes,
    ...navigationRoutes,
    ...inferenceCatalogRoutes,
    ...aiConnectionRoutes,
    ...paymentGatewayRoutes,
    ...subscriptionRoutes,
    ...serviceCatalogRoutes,
    ...invoiceRoutes,
    ...vtualAdminEarlyRoutes,
    ...productActivationRoutes,
    ...inferenceUsageRoutes,
    ...paymentsIncomeRoutes,
    ...archivdMicrostockUsageRoutes,
    ...microstockRoutes,
    ...paymentChannelRoutes,
    ...servicePurchaseRoutes,
    ...archivdRoutes,
    ...publicShareRoutes,
    ...vtualAdminLateRoutes,
    ...vtualPublicRoutes,
    ...paymentReturnRoutes,
    ...legacyRoutes,
    ...notFoundRoutes,
  ] as RouteRecordRaw[],
})

let hydrated = false

/** Reset the one-shot cold-boot hydrate flag (called on logout). */
export function resetRouterHydration(): void {
  hydrated = false
}

export async function revokeCurrentProtectedRoute(): Promise<void> {
  const current = router.currentRoute.value
  const requiresAuth = current.matched.some((record) => record.meta.requiresAuth === true)
  if (!requiresAuth || current.name === 'login.view') return

  await router.replace({
    name: 'login.view',
    query: { redirect: current.fullPath },
  })
}

router.beforeEach(async (to) => {
  let probedThisNavigation = false
  if (!hydrated) {
    const { hydrateShell } = useAuth()
    await hydrateShell()
    hydrated = true
    probedThisNavigation = true
  }

  const { isAuthenticated, fetchMe } = useAuth()

  if (to.meta.requiresAuth && !isAuthenticated.value) {
    // hydrateShell already GET auth/me on this navigation. A second probe is
    // only useful later (guest hydrate, then a protected route after a cookie
    // appears — e.g. another tab logged in). Post-login settle is confirmSession
    // before navigate, not this duplicate GET.
    if (!probedThisNavigation) {
      await fetchMe().catch(() => null)
    }
    if (!isAuthenticated.value) {
      return { name: 'login.view', query: { redirect: to.fullPath } }
    }
  }

  if (to.meta.guestOnly && isAuthenticated.value) {
    return { name: 'dashboard.view' }
  }
})

export default router
