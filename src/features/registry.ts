import type { FeatureModule, Messages } from '@/features/types'
import { mergeMessages } from '@/features/messages'
import { archivdFeature } from '@/features/archivd'
import { microstockFeature } from '@/features/microstock'

/**
 * The one place that names the product features a build ships.
 *
 * Adding a product: create `src/features/{name}/index.ts` exporting a
 * `FeatureModule` (routes, messages, optional boot), add its translations under
 * `src/i18n/features/{name}/`, and append it here. Removing a product: delete
 * those two directories and the line below — nothing in `src/api`, `src/stores`,
 * `src/views`, `src/composables`, `src/layouts`, `src/router` or `src/i18n`
 * mentions it.
 *
 * `boot()` runs once at module evaluation, before the router is created, so a
 * feature can register its settings group, legacy root, and shell signals in
 * time for route generation.
 */
export const features: FeatureModule[] = [archivdFeature, microstockFeature]

for (const feature of features) {
  feature.boot?.()
}

/** Routes of every shipped feature, in registry order. */
export function featureRoutes(): FeatureModule['routes'] {
  return features.flatMap((feature) => feature.routes)
}

/** Every feature's eager English pack, merged in registry order. */
export function featureMessagesEn(): Messages {
  return features.reduce<Messages>(
    (acc, feature) => mergeMessages(acc, feature.messages.en),
    {},
  )
}

/** Every feature that ships `locale`, merged in registry order. */
export async function featureMessagesFor(locale: string): Promise<Messages> {
  let messages: Messages = {}

  for (const feature of features) {
    const load = feature.messages.load
    if (!load) continue
    messages = mergeMessages(messages, await load(locale))
  }

  return messages
}
