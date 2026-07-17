import type {
  ApiErrorBody,
  CreateRunRequest,
  CreateRunResponse,
  CreateSessionRequest,
  CreateSessionResponse,
  CreateSessionRunRequest,
  CreateSessionRunResponse,
  DecisionRequest,
  HealthResponse,
  SessionSummary,
} from './types'

const API_BASE = import.meta.env.VITE_API_BASE ?? ''

async function parseError(res: Response): Promise<string> {
  let detail = res.statusText || `HTTP ${res.status}`
  try {
    const body = (await res.json()) as ApiErrorBody
    if (body.error) {
      detail = body.error
    }
  } catch {
    // ignore
  }
  if (res.status === 409) {
    return `[409] session 已有进行中的 run`
  }
  return `[${res.status}] ${detail}`
}

async function fetchWithTimeout(input: string, init?: RequestInit, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    window.clearTimeout(timer)
  }
}

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetchWithTimeout(`${API_BASE}/api/v1/health`)
  if (!res.ok) {
    throw new Error(await parseError(res))
  }
  return (await res.json()) as HealthResponse
}

export async function createSession(body: CreateSessionRequest): Promise<CreateSessionResponse> {
  const res = await fetchWithTimeout(`${API_BASE}/api/v1/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(await parseError(res))
  }
  return (await res.json()) as CreateSessionResponse
}

export async function getSession(sessionId: string): Promise<SessionSummary> {
  const res = await fetchWithTimeout(`${API_BASE}/api/v1/sessions/${encodeURIComponent(sessionId)}`)
  if (!res.ok) {
    throw new Error(await parseError(res))
  }
  return (await res.json()) as SessionSummary
}

export async function resumeSession(sessionId: string): Promise<SessionSummary> {
  const res = await fetchWithTimeout(`${API_BASE}/api/v1/sessions/${encodeURIComponent(sessionId)}/resume`, {
    method: 'POST',
  })
  if (!res.ok) {
    throw new Error(await parseError(res))
  }
  return (await res.json()) as SessionSummary
}

export async function createSessionRun(
  sessionId: string,
  body: CreateSessionRunRequest,
): Promise<CreateSessionRunResponse> {
  const res = await fetchWithTimeout(`${API_BASE}/api/v1/sessions/${encodeURIComponent(sessionId)}/runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(await parseError(res))
  }
  return (await res.json()) as CreateSessionRunResponse
}

export async function postDecision(runId: string, body: DecisionRequest): Promise<void> {
  const res = await fetchWithTimeout(`${API_BASE}/api/v1/runs/${encodeURIComponent(runId)}/decisions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(await parseError(res))
  }
}

/** @deprecated P0 one-shot; prefer createSession + createSessionRun */
export async function createRun(body: CreateRunRequest): Promise<CreateRunResponse> {
  const res = await fetchWithTimeout(`${API_BASE}/api/v1/runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(await parseError(res))
  }
  return (await res.json()) as CreateRunResponse
}

export async function cancelRun(runId: string): Promise<void> {
  const res = await fetchWithTimeout(`${API_BASE}/api/v1/runs/${encodeURIComponent(runId)}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    throw new Error(await parseError(res))
  }
}
