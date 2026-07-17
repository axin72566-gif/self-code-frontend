export type RunPhase =
  | 'idle'
  | 'starting'
  | 'running'
  | 'awaiting_approval'
  | 'cancelling'
  | 'succeeded'
  | 'failed'
  | 'cancelled'

export type SseEventType =
  | 'tool'
  | 'message'
  | 'changed_files'
  | 'error'
  | 'done'
  | 'ping'
  | 'approval_needed'
  | 'approval_resolved'
  | 'verify'

export type ApprovalLevel = 'confirm' | 'auto'

export interface HealthResponse {
  status: string
  apiKeyConfigured: boolean
}

export interface CreateSessionRequest {
  workdir: string
  yes?: boolean
}

export interface CreateSessionResponse {
  sessionId: string
  workdir: string
}

export interface SessionSummary {
  sessionId: string
  workdir: string
  status: string
  messageCount: number
  lastRunId: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateSessionRunRequest {
  task: string
  yes?: boolean
  approvalLevel?: ApprovalLevel
}

export interface CreateSessionRunResponse {
  runId: string
  sessionId: string
}

export interface DecisionRequest {
  requestId: string
  decision: 'approve' | 'reject'
}

export interface ApprovalPayload {
  requestId: string
  kind?: string
  summary?: string
  detail?: string
  decision?: string
}

/** @deprecated P0 one-shot; console uses session runs instead */
export interface CreateRunRequest {
  task: string
  workdir: string
  yes: boolean
}

/** @deprecated P0 one-shot */
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
