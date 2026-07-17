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
  let detail: string | null = null

  if (health.kind === 'unreachable') {
    label = 'backend unreachable'
    className = 'badge badge-danger'
    detail = health.message
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
      <div className="health-text">
        <span className={className}>{label}</span>
        {detail ? <span className="health-detail">{detail}</span> : null}
      </div>
      <button type="button" className="btn btn-ghost" onClick={onRefresh}>
        Refresh
      </button>
    </div>
  )
}
