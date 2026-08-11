export type VtualStatus = 'active' | 'pending' | 'archived' | 'revoked' | 'disconnected' | string

export function vtualStatusBadgeClass(status: VtualStatus): string {
  switch (status) {
    case 'active': return 'text-bg-success'
    case 'pending': return 'text-bg-warning'
    case 'archived': return 'text-bg-secondary'
    case 'revoked': return 'text-bg-dark'
    case 'disconnected': return 'text-bg-light border'
    default: return 'text-bg-light border'
  }
}

export function vtualStatusLabel(status: VtualStatus): string {
  return status || '—'
}
