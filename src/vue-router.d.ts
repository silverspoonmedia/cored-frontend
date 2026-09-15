import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    guestOnly?: boolean
    public?: boolean
    authChrome?: boolean
    titleKey?: string
    headingKey?: string
    /**
     * Breadcrumb placement, resolved against the route tree (never a central
     * map). `labelKey` defaults to `titleKey`; `parent` is the `.view` route
     * name of the crumb directly above this one. See `docs/routes.md`.
     */
    breadcrumb?: {
      parent?: string
      labelKey?: string
    }
    template?: 'adminlte4' | 'valkivid3'
  }
}
