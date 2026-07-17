import type { HealthResponse } from '../api/types'

export type HealthView =
  | { kind: 'loading' }
  | { kind: 'unreachable'; message: string }
  | { kind: 'ok'; data: HealthResponse }

interface Props {
  health: HealthView
  onRefresh: () => void
}

export function HealthBadge({ health, onRefresh }: Props) {
  let label = 'checking…'
  let className = 'badge badge-muted'

  if (health.kind === 'unreachable') {
    label = 'backend unreachable'
    className = 'badge badge-danger'
  } else if (health.kind === 'ok') {
    if (!health.data.apiKeyConfigured) {
      label = 'ok · API key missing'
      className = 'badge badge-warn'
    } else {
      label = 'ok · key configured'
      className = 'badge badge-ok'
    }
  }

  return (
    <div className="health-row">
      <span className={className}>{label}</span>
      <button type="button" className="btn btn-ghost" onClick={onRefresh}>
        Refresh
      </button>
    </div>
  )
}
