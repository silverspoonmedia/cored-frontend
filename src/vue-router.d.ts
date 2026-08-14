import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    guestOnly?: boolean
    public?: boolean
    titleKey?: string
    headingKey?: string
  }
}
