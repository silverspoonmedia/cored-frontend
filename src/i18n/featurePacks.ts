import { mergeMessages } from '@/features/messages'
import type { Messages } from '@/features/types'
import { featureMessagesEn, featureMessagesFor, features } from '@/features/registry'

/**
 * Feature translation packs, split out of `./index` so the loaders can be
 * resolved without evaluating the shell.
 *
 * `./index` constructs the i18n instance and reads this module; a feature
 * composable that imports `./index` would close the cycle
 * (i18n → registry → feature → i18n) and read `i18n` before it exists. So the
 * eager-merge and per-locale assembly live here, and `./index` calls them at
 * construction. `featurePackFor()` is what a locale switch awaits.
 */

/**
 * The eager English pack of every shipped feature, or `{}` when the registry is
 * not populated yet or a feature ships no copy. Memoised: the registry is
 * static after module evaluation.
 */
let englishPack: Messages | null = null

export function featureEnglishPack(): Messages {
  if (englishPack !== null) return englishPack
  if (features.length === 0) return {}
  englishPack = featureMessagesEn()
  return englishPack
}

/** Every feature's pack for `locale`, or `{}` when it ships none. */
export async function featurePackFor(locale: string): Promise<Messages> {
  if (features.length === 0) return {}
  return featureMessagesFor(locale)
}

/** Deep-merge a feature pack over the core pack of the same locale. */
export function withFeaturePack(core: Messages, pack: Messages): Messages {
  return mergeMessages(core, pack)
}
