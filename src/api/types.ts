export type RunPhase =
  | 'idle'
  | 'starting'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'cancelled'

export type SseEventType = 'tool' | 'message' | 'changed_files' | 'error' | 'done'

export interface HealthResponse {
  status: string
  apiKeyConfigured: boolean
}

export interface CreateRunRequest {
  task: string
  workdir: string
  yes: boolean
}

export interface CreateRunResponse {
  runId: string
}

export interface ApiErrorBody {
  error?: string
  status?: string
}

export interface LogEntry {
  id: number
  type: SseEventType | 'info' | 'client_error'
  data: string
  at: number
}
