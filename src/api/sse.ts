import type { SseEventType } from './types'

const EVENT_TYPES: SseEventType[] = [
  'tool',
  'message',
  'changed_files',
  'error',
  'done',
  'ping',
  'approval_needed',
  'approval_resolved',
  'verify',
]

export interface RunEventHandlers {
  onEvent: (type: SseEventType, data: string) => void
  onOpen?: () => void
  onTransportError?: (message: string) => void
}

export function subscribeRunEvents(runId: string, handlers: RunEventHandlers): () => void {
  const API_BASE = import.meta.env.VITE_API_BASE ?? ''
  const url = `${API_BASE}/api/v1/runs/${encodeURIComponent(runId)}/events`
  const source = new EventSource(url)
  let closed = false
  let opened = false
  let errorTicks = 0

  source.onopen = () => {
    opened = true
    errorTicks = 0
    handlers.onOpen?.()
  }

  for (const type of EVENT_TYPES) {
    source.addEventListener(type, (ev) => {
      const data = (ev as MessageEvent).data ?? ''
      handlers.onEvent(type, String(data))
      if (type === 'error' || type === 'done') {
        close()
      }
    })
  }

  source.onerror = () => {
    if (closed) return
    errorTicks += 1
    // After open, repeated errors usually mean the stream died; stop retrying.
    if (opened && (source.readyState === EventSource.CLOSED || errorTicks >= 2)) {
      handlers.onTransportError?.('SSE connection lost')
      close()
      return
    }
    if (!opened && source.readyState === EventSource.CLOSED) {
      handlers.onTransportError?.('SSE connection failed')
      close()
    }
  }

  function close() {
    if (closed) return
    closed = true
    source.close()
  }

  return close
}
