import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { settingsGroupFromRoute, settingsGroupLabelKey } from '@/utils/settingsGroup'

const APP_NAME = 'Monolith'

function metaString(
  matched: { meta: Record<string, unknown> }[],
  key: 'titleKey' | 'headingKey',
): string | undefined {
  for (let i = matched.length - 1; i >= 0; i--) {
    const value = matched[i]?.meta[key]
    if (typeof value === 'string' && value.length > 0) return value
  }
  return undefined
}

export function usePageTitle() {
  const route = useRoute()
  const { t, locale } = useI18n()

  const pageTitle = computed(() => {
    void locale.value
    const name = String(route.name ?? '')
    const settingsGroup = settingsGroupFromRoute(route)

    if (settingsGroup && name.startsWith('settings.') && name !== 'settings.index.view' && name !== 'settings.index') {
      return t(settingsGroupLabelKey(settingsGroup))
    }

    if (name === 'product-activations.show' || name === 'product-activations.show.view') {
      const product = typeof route.params.productKey === 'string' ? route.params.productKey : ''
      return t('product-activations.product_title', { product })
    }

    const titleKey = metaString(route.matched, 'titleKey')
    return titleKey ? t(titleKey) : ''
  })

  const heading = computed(() => {
    void locale.value
    const headingKey = metaString(route.matched, 'headingKey')
    return headingKey ? t(headingKey) : ''
  })

  const documentTitle = computed(() => {
    const title = pageTitle.value
    return title ? `${title} | ${APP_NAME}` : APP_NAME
  })

  function applyDocumentTitle(): void {
    document.title = documentTitle.value
  }

  return { pageTitle, heading, documentTitle, applyDocumentTitle }
}
