import type { FhMicrostock } from '@/api/types'

export interface FhMicrostockBadge {
  label: string
  cls: string
}

export interface FhMicrostockBadgeLabels {
  noMetadata: string
  statusPending: string
  statusGenerated: string
  statusFinalized: string
  statusFailed: string
  stageVision: string
  stageThinking: string
  stageQueuedThinking: string
  stageDegraded: string
}

type MsStages = {
  vision?: string
  thinking?: string
  result?: string
}

function stagesOf(ms: FhMicrostock | null | undefined): MsStages {
  const raw = ms?.stages
  if (!raw || typeof raw !== 'object') return {}
  return raw as MsStages
}

export function formatCollectionProgress(
  processed: number,
  total: number,
  failed: number,
  progress: string,
  progressFailed: string,
): string {
  const text = progress
    .replaceAll('{processed}', String(processed))
    .replaceAll('{total}', String(total))
  if (failed > 0) {
    return `${text} ${progressFailed.replaceAll('{failed}', String(failed))}`
  }
  return text
}

export function resolveMicrostockBadge(
  ms: FhMicrostock | null | undefined,
  labels: FhMicrostockBadgeLabels,
): FhMicrostockBadge {
  if (!ms || !ms.status) {
    return { label: labels.noMetadata, cls: 'text-bg-secondary' }
  }

  const status = ms.status
  const stages = stagesOf(ms)
  const vision = stages.vision || 'pending'
  const thinking = stages.thinking || 'pending'

  if (status === 'finalized') {
    return { label: labels.statusFinalized, cls: 'text-bg-success' }
  }
  if (status === 'generated') {
    return { label: labels.statusGenerated, cls: 'text-bg-info' }
  }
  if (status === 'failed') {
    return { label: labels.statusFailed, cls: 'text-bg-danger' }
  }

  if (status === 'pending') {
    if (ms.phase === 'degraded') {
      return { label: labels.stageDegraded, cls: 'text-bg-warning' }
    }
    if (vision === 'running') {
      return { label: labels.stageVision, cls: 'text-bg-warning' }
    }
    if (vision === 'ok' && thinking === 'running') {
      return { label: labels.stageThinking, cls: 'text-bg-warning' }
    }
    if (vision === 'ok' && (thinking === 'pending' || thinking === 'skipped')) {
      return { label: labels.stageQueuedThinking, cls: 'text-bg-warning' }
    }
    return { label: labels.statusPending, cls: 'text-bg-warning' }
  }

  return { label: labels.statusPending, cls: 'text-bg-warning' }
}
