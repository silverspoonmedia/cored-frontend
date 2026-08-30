import type { RouteLocationRaw } from 'vue-router'
import type { QueryRowAction } from '@/api/types'
import type { RowAction } from '@/components/RowActions.vue'
import { confirmDialog } from '@/lib/swal'
import { safeHttpUrl } from '@/utils/safeUrl'

export function findQueryRowAction(
  actions: QueryRowAction[] | undefined,
  key: string,
): QueryRowAction | undefined {
  return actions?.find((action) => action.key === key)
}

export function queryRowActionTo(action: QueryRowAction | undefined): RouteLocationRaw | undefined {
  if (!action?.route) return undefined
  return {
    name: `${action.route}.view`,
    params: action.params ?? {},
    query: action.query ?? {},
  }
}

export function mapQueryRowActions(
  actions: QueryRowAction[] | undefined,
  handlers: Partial<Record<string, (action: QueryRowAction) => void>> = {},
): RowAction[] {
  if (!actions?.length) return []

  return actions.flatMap((action) => {
    const mapped: RowAction = {
      key: action.key,
      icon: action.icon,
      label: action.label,
      variant: action.variant,
    }

    if (action.route) {
      mapped.to = queryRowActionTo(action)
      return [mapped]
    }

    if (action.href) {
      const href = safeHttpUrl(action.href)
      if (!href) return []
      mapped.href = href
      mapped.target = action.target
      return [mapped]
    }

    mapped.onClick = () => {
      handlers[action.key]?.(action)
    }
    return [mapped]
  })
}

export async function confirmQueryMutate(
  action: QueryRowAction,
  confirmText: string,
): Promise<boolean> {
  return confirmDialog({
    title: action.confirm?.title,
    text: action.confirm?.text,
    confirmText,
  })
}
