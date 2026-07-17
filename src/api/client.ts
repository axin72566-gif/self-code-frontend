import type { ApiErrorBody, CreateRunRequest, CreateRunResponse, HealthResponse } from './types'

const API_BASE = import.meta.env.VITE_API_BASE ?? ''

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as ApiErrorBody
    if (body.error) return body.error
  } catch {
    // ignore
  }
  return res.statusText || `HTTP ${res.status}`
}

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/api/v1/health`)
  if (!res.ok) {
    throw new Error(await parseError(res))
  }
  return (await res.json()) as HealthResponse
}

export async function createRun(body: CreateRunRequest): Promise<CreateRunResponse> {
  const res = await fetch(`${API_BASE}/api/v1/runs`, {
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
  const res = await fetch(`${API_BASE}/api/v1/runs/${encodeURIComponent(runId)}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    throw new Error(await parseError(res))
  }
}
