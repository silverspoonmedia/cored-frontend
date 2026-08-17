import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { settingsGroupFromRoute, settingsGroupLabelKey } from '@/utils/settingsGroup'

interface BreadcrumbItem {
  label: string
  routeName?: string
}

interface BreadcrumbConfig {
  parent?: string
  labelKey: string
  labelParams?: Record<string, unknown>
  routeName?: string
}

const BREADCRUMB_MAP: Record<string, BreadcrumbConfig> = {
  'dashboard.view': { labelKey: 'menu.dashboard', routeName: 'dashboard.view' },

  'users.index.view': { labelKey: 'web.users.breadcrumb', routeName: 'users.index.view' },
  'users.create.view': { parent: 'users.index.view', labelKey: 'ui.breadcrumb.add' },
  'users.edit.view': { parent: 'users.index.view', labelKey: 'ui.breadcrumb.edit' },

  'menus.index.view': { labelKey: 'web.menus.breadcrumb', routeName: 'menus.index.view' },
  'menus.create.view': { parent: 'menus.index.view', labelKey: 'ui.breadcrumb.add' },
  'menus.edit.view': { parent: 'menus.index.view', labelKey: 'ui.breadcrumb.edit' },
  'menus.trashed.view': { parent: 'menus.index.view', labelKey: 'web.menus.trashed_breadcrumb' },

  'activity-logs.index.view': { labelKey: 'web.activity-log.breadcrumb', routeName: 'activity-logs.index.view' },
  'activity-logs.show.view': { parent: 'activity-logs.index.view', labelKey: 'web.activity-log.show_breadcrumb' },

  'error-logs.index.view': { labelKey: 'web.error-log.breadcrumb', routeName: 'error-logs.index.view' },
  'error-logs.show.view': { parent: 'error-logs.index.view', labelKey: 'web.error-log.show_breadcrumb' },

  'notifications.index.view': { labelKey: 'web.notifications.breadcrumb', routeName: 'notifications.index.view' },

  'notification-audiences.index.view': { labelKey: 'web.notification-audiences.title', routeName: 'notification-audiences.index.view' },
  'notification-audiences.edit.view': { parent: 'notification-audiences.index.view', labelKey: 'ui.breadcrumb.edit' },

  'profile.password.edit.view': { labelKey: 'web.profile.password_title', routeName: 'profile.password.edit.view' },
  'profile.two-factor.edit.view': { labelKey: 'menu.two_factor', routeName: 'profile.two-factor.edit.view' },
  'profile.connections.view': { labelKey: 'menu.connected_accounts', routeName: 'profile.connections.view' },

  'currencies.index.view': { labelKey: 'web.currencies.title', routeName: 'currencies.index.view' },

  'settings.index.view': { labelKey: 'web.settings.title', routeName: 'settings.index.view' },
  'settings.group.view': { parent: 'settings.index.view', labelKey: 'web.settings.title' },

  'domain-access.index.view': { labelKey: 'web.domain-access.card_title', routeName: 'domain-access.index.view' },

  'services.index.view': { labelKey: 'web.services.breadcrumb', routeName: 'services.index.view' },
  'services.create.view': { parent: 'services.index.view', labelKey: 'ui.breadcrumb.add' },
  'services.edit.view': { parent: 'services.index.view', labelKey: 'ui.breadcrumb.edit' },
  'services.show.view': { parent: 'services.index.view', labelKey: 'web.services.show_title' },
  'service-purchases.show.view': { parent: 'services.index.view', labelKey: 'web.services.purchase_title' },

  'invoices.index.view': { labelKey: 'web.payments.invoices.title', routeName: 'invoices.index.view' },
  'invoices.show.view': { parent: 'invoices.index.view', labelKey: 'web.payments.invoices.show_title' },

  'payments.income.index.view': { labelKey: 'web.payments.income.title', routeName: 'payments.income.index.view' },

  'payment-channels.index.view': { labelKey: 'web.payments.channels.title', routeName: 'payment-channels.index.view' },

  'payment-gateways.index.view': { labelKey: 'web.payments.gateways.title', routeName: 'payment-gateways.index.view' },
  'payment-gateways.create.view': { parent: 'payment-gateways.index.view', labelKey: 'ui.breadcrumb.add' },
  'payment-gateways.edit.view': { parent: 'payment-gateways.index.view', labelKey: 'ui.breadcrumb.edit' },

  'subscriptions.index.view': { labelKey: 'web.payments.subscriptions.title', routeName: 'subscriptions.index.view' },
  'subscriptions.create.view': { parent: 'subscriptions.index.view', labelKey: 'ui.breadcrumb.add' },
  'subscriptions.edit.view': { parent: 'subscriptions.index.view', labelKey: 'ui.breadcrumb.edit' },
  'subscriptions.show.view': { parent: 'subscriptions.index.view', labelKey: 'web.payments.subscriptions.show_title' },

  'inference.model-cards.index.view': { labelKey: 'web.inference.model_cards.title', routeName: 'inference.model-cards.index.view' },
  'inference.model-cards.create.view': { parent: 'inference.model-cards.index.view', labelKey: 'ui.breadcrumb.add' },
  'inference.model-cards.edit.view': { parent: 'inference.model-cards.index.view', labelKey: 'ui.breadcrumb.edit' },
  'inference.model-cards.show.view': { parent: 'inference.model-cards.index.view', labelKey: 'web.inference.model_cards.show_title' },

  'inference.providers.index.view': { labelKey: 'web.inference.providers.title', routeName: 'inference.providers.index.view' },
  'inference.providers.create.view': { parent: 'inference.providers.index.view', labelKey: 'ui.breadcrumb.add' },
  'inference.providers.edit.view': { parent: 'inference.providers.index.view', labelKey: 'ui.breadcrumb.edit' },
  'inference.providers.show.view': { parent: 'inference.providers.index.view', labelKey: 'web.inference.providers.show_title' },

  'inference.usage-events.index.view': { labelKey: 'web.inference.usage.title', routeName: 'inference.usage-events.index.view' },

  'vtual.profiles.index.view': { labelKey: 'web.vtual.profiles.title', routeName: 'vtual.profiles.index.view' },
  'vtual.profiles.show.view': { parent: 'vtual.profiles.index.view', labelKey: 'web.vtual.profiles.manage_title' },

  'vtual.vtuber.index.view': { labelKey: 'web.vtual-vtuber.hub_title', routeName: 'vtual.vtuber.index.view' },
  'vtual.vtuber.show.view': { parent: 'vtual.vtuber.index.view', labelKey: 'web.vtual-vtuber.title' },
  'vtual.vtuber.claim.view': { parent: 'vtual.vtuber.show.view', labelKey: 'web.vtual-vtuber.claim_page_title' },

  'vtual.orphans.index.view': { labelKey: 'web.vtual-orphans.breadcrumb', routeName: 'vtual.orphans.index.view' },
  'vtual.orphans.create.view': { parent: 'vtual.orphans.index.view', labelKey: 'web.vtual-orphans.create_title' },
  'vtual.orphans.edit.view': { parent: 'vtual.orphans.index.view', labelKey: 'web.vtual-orphans.edit_title' },

  'vtual.platform-credentials.index.view': { labelKey: 'web.vtual-platform-credentials.breadcrumb', routeName: 'vtual.platform-credentials.index.view' },
  'vtual.platform-credentials.platform.view': { parent: 'vtual.platform-credentials.index.view', labelKey: 'web.vtual.credentials.list' },
  'vtual.platform-credentials.create.view': { parent: 'vtual.platform-credentials.index.view', labelKey: 'web.vtual.admin.credentials.create_title' },
  'vtual.platform-credentials.edit.view': { parent: 'vtual.platform-credentials.index.view', labelKey: 'web.vtual.admin.credentials.edit_title' },
  'vtual.platform-credentials.probe.view': { parent: 'vtual.platform-credentials.index.view', labelKey: 'web.vtual.probe.title' },

  'product-activations.index.view': { labelKey: 'web.product-activations.title', routeName: 'product-activations.index.view' },
  'product-activations.show.view': { parent: 'product-activations.index.view', labelKey: 'ui.breadcrumb.edit' },

  'file-hosting.microstock-usage.view': { labelKey: 'web.file-hosting.microstock_title', routeName: 'file-hosting.microstock-usage.view' },
  'file-hosting.blocklist.index.view': { labelKey: 'web.file-hosting.blocklist_title', routeName: 'file-hosting.blocklist.index.view' },
}

export function useBreadcrumbs() {
  const route = useRoute()
  const { t } = useI18n()

  const breadcrumbs = computed<BreadcrumbItem[]>(() => {
    const items: BreadcrumbItem[] = []
    const routeName = route.name as string | null
    if (!routeName) return items

    const settingsGroup = settingsGroupFromRoute(route)
    if (settingsGroup && routeName.startsWith('settings.') && routeName !== 'settings.index.view') {
      items.push({ label: t('web.settings.title'), routeName: 'settings.index.view' })
      items.push({ label: t(settingsGroupLabelKey(settingsGroup)) })
      return items
    }

    const config = BREADCRUMB_MAP[routeName]
    if (!config) return items

    const chain: BreadcrumbConfig[] = []
    let current: BreadcrumbConfig | undefined = config
    while (current) {
      chain.unshift(current)
      current = current.parent ? BREADCRUMB_MAP[current.parent] : undefined
    }

    for (const item of chain) {
      items.push({
        label: t(item.labelKey, item.labelParams ?? {}),
        routeName: item.routeName,
      })
    }

    return items
  })

  return { breadcrumbs }
}
