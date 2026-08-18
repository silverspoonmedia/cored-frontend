import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    guestOnly?: boolean
    public?: boolean
    authChrome?: boolean
    titleKey?: string
    headingKey?: string
    template?: 'adminlte4' | 'valkivid3'
  }
}
