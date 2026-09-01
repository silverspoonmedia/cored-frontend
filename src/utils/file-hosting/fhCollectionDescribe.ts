export const HINT_MAX_LENGTH = 2000
export const PRIMARY_CONCEPT_MIN = 10

export const SECTION_HEADERS = {
  primaryConcept: 'PRIMARY CONCEPT',
  visibleSubjects: 'VISIBLE SUBJECTS',
  buyerIntent: 'BUYER INTENT',
  styleMood: 'STYLE AND MOOD',
  additionalNotes: 'ADDITIONAL NOTES',
} as const

export interface DescribeSections {
  primaryConcept: string
  visibleSelected: string[]
  visibleOther: string
  intentSelected: string[]
  intentOther: string
  styleSelected: string[]
  styleOther: string
  additionalNotes: string
  billingMode: string
}

export type LabelMap = Record<string, string>

export function emptyDescribeSections(): DescribeSections {
  return {
    primaryConcept: '',
    visibleSelected: [],
    visibleOther: '',
    intentSelected: [],
    intentOther: '',
    styleSelected: [],
    styleOther: '',
    additionalNotes: '',
    billingMode: '',
  }
}

function joinSelections(selected: string[], other: string, labelMap: LabelMap): string {
  const items = selected.map((key) => labelMap[key] || key)
  const otherTrim = other.trim()
  if (otherTrim) items.push(otherTrim)
  return items.filter(Boolean).join(', ')
}

export function composeCollectionHint(sections: DescribeSections, labelMaps: {
  visible?: LabelMap
  intent?: LabelMap
  style?: LabelMap
} = {}): string {
  const parts: string[] = []
  const concept = sections.primaryConcept.trim()
  if (concept) parts.push(`${SECTION_HEADERS.primaryConcept}: ${concept}`)

  const visible = joinSelections(sections.visibleSelected, sections.visibleOther, labelMaps.visible ?? {})
  if (visible) parts.push(`${SECTION_HEADERS.visibleSubjects}: ${visible}`)

  const intent = joinSelections(sections.intentSelected, sections.intentOther, labelMaps.intent ?? {})
  if (intent) parts.push(`${SECTION_HEADERS.buyerIntent}: ${intent}`)

  const style = joinSelections(sections.styleSelected, sections.styleOther, labelMaps.style ?? {})
  if (style) parts.push(`${SECTION_HEADERS.styleMood}: ${style}`)

  const notes = sections.additionalNotes.trim()
  if (notes) parts.push(`${SECTION_HEADERS.additionalNotes}: ${notes}`)

  return parts.join('\n\n').trim()
}

export function isBlindDescribe(sections: DescribeSections): boolean {
  return (
    sections.primaryConcept.trim() === ''
    && sections.visibleSelected.length === 0
    && sections.visibleOther.trim() === ''
    && sections.intentSelected.length === 0
    && sections.intentOther.trim() === ''
    && sections.styleSelected.length === 0
    && sections.styleOther.trim() === ''
    && sections.additionalNotes.trim() === ''
  )
}

export function validateCollectionDescribe(
  sections: DescribeSections,
  options: { dailyFreeEnabled?: boolean } = {},
): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const concept = sections.primaryConcept.trim()
  if (concept.length > 0 && concept.length < PRIMARY_CONCEPT_MIN) {
    errors.push('primaryConcept')
  }
  if (concept.length > 0) {
    if (sections.visibleSelected.length === 0 && sections.visibleOther.trim() === '') errors.push('visible')
    if (sections.intentSelected.length === 0 && sections.intentOther.trim() === '') errors.push('intent')
    if (sections.styleSelected.length === 0 && sections.styleOther.trim() === '') errors.push('style')
  }
  if (options.dailyFreeEnabled && !['free', 'paid'].includes(sections.billingMode)) {
    errors.push('billingMode')
  }
  return { valid: errors.length === 0, errors }
}

export function analysisEstimateUsd(
  fileCount: number,
  perFileMicroUsd: number,
  locale = 'en',
): string {
  const estimate = Math.max(0, fileCount) * perFileMicroUsd / 1_000_000
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(estimate)
}

export function i18nOptionMap(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>).map(([key, value]) => [key, String(value)]),
  )
}