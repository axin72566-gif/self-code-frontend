import { useCallback, useEffect, useRef, useState } from 'react'
import { cancelRun, createRun, fetchHealth } from './api/client'
import { subscribeRunEvents } from './api/sse'
import type { LogEntry, RunPhase, SseEventType } from './api/types'
import { EventLog } from './components/EventLog'
import { HealthBadge, type HealthView } from './components/HealthBadge'
import { RunForm } from './components/RunForm'
import { RunSummary } from './components/RunSummary'
import './App.css'

function isCancelMessage(data: string): boolean {
  const lower = data.toLowerCase()
  return lower.includes('cancel') || lower.includes('interrupted')
}

export default function App() {
  const [health, setHealth] = useState<HealthView>({ kind: 'loading' })
  const [task, setTask] = useState('')
  const [workdir, setWorkdir] = useState('')
  const [yes, setYes] = useState(false)
  const [phase, setPhase] = useState<RunPhase>('idle')
  const [runId, setRunId] = useState<string | null>(null)
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [summaryMessage, setSummaryMessage] = useState<string | null>(null)
  const [changedFiles, setChangedFiles] = useState<string[]>([])
  const [formError, setFormError] = useState<string | null>(null)

  const seqRef = useRef(0)
  const closeSseRef = useRef<(() => void) | null>(null)
  const cancelRequestedRef = useRef(false)
  const lastMessageRef = useRef<string | null>(null)
  const phaseRef = useRef<RunPhase>('idle')

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  const appendLog = useCallback((type: LogEntry['type'], data: string) => {
    seqRef.current += 1
    setEntries((prev) => [
      ...prev,
      { id: seqRef.current, type, data, at: Date.now() },
    ])
  }, [])

  const refreshHealth = useCallback(async () => {
    try {
      const data = await fetchHealth()
      setHealth({ kind: 'ok', data })
    } catch (e) {
      setHealth({
        kind: 'unreachable',
        message: e instanceof Error ? e.message : 'unreachable',
      })
    }
  }, [])

  useEffect(() => {
    void refreshHealth()
    const id = window.setInterval(() => void refreshHealth(), 15000)
    return () => window.clearInterval(id)
  }, [refreshHealth])

  useEffect(() => {
    return () => {
      closeSseRef.current?.()
    }
  }, [])

  const busy = phase === 'starting' || phase === 'running'

  const resetRunView = () => {
    setEntries([])
    setSummaryMessage(null)
    setChangedFiles([])
    setFormError(null)
    lastMessageRef.current = null
    cancelRequestedRef.current = false
  }

  const handleSseEvent = useCallback(
    (type: SseEventType, data: string) => {
      appendLog(type, data)
      if (type === 'message') {
        lastMessageRef.current = data
        setSummaryMessage(data)
      }
      if (type === 'changed_files') {
        const files = data
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean)
        setChangedFiles(files)
      }
      if (type === 'done') {
        setPhase('succeeded')
        setSummaryMessage(lastMessageRef.current)
        closeSseRef.current = null
      }
      if (type === 'error') {
        if (cancelRequestedRef.current || isCancelMessage(data)) {
          setPhase('cancelled')
        } else {
          setPhase('failed')
        }
        setSummaryMessage(data)
        closeSseRef.current = null
      }
    },
    [appendLog],
  )

  const onStart = async () => {
    if (busy) return
    const t = task.trim()
    const w = workdir.trim()
    if (!t || !w) {
      setFormError('task 与 workdir 均为必填')
      return
    }

    resetRunView()
    setPhase('starting')
    setRunId(null)

    try {
      const { runId: id } = await createRun({ task: t, workdir: w, yes })
      setRunId(id)
      appendLog('info', `run started: ${id}`)
      setPhase('running')
      closeSseRef.current = subscribeRunEvents(id, {
        onEvent: handleSseEvent,
        onOpen: () => appendLog('info', 'SSE connected'),
        onTransportError: (msg) => {
          const p = phaseRef.current
          if (p === 'succeeded' || p === 'failed' || p === 'cancelled') return
          appendLog('client_error', msg)
        },
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'failed to start'
      setFormError(msg)
      appendLog('client_error', msg)
      setPhase('failed')
      setSummaryMessage(msg)
    }
  }

  const onCancel = async () => {
    if (!runId || !busy) return
    cancelRequestedRef.current = true
    try {
      await cancelRun(runId)
      appendLog('info', 'cancel requested')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'cancel failed'
      appendLog('client_error', msg)
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>self-code</h1>
          <p className="tagline">P0 coding agent console</p>
        </div>
        <HealthBadge health={health} onRefresh={() => void refreshHealth()} />
      </header>

      <main className="main">
        <RunForm
          task={task}
          workdir={workdir}
          yes={yes}
          disabled={busy}
          onTaskChange={setTask}
          onWorkdirChange={setWorkdir}
          onYesChange={setYes}
        />

        {formError ? <p className="form-error">{formError}</p> : null}

        <div className="actions">
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void onStart()}>
            Start
          </button>
          <button type="button" className="btn btn-danger" disabled={!busy || !runId} onClick={() => void onCancel()}>
            Cancel
          </button>
          <span className="run-status">
            status: <strong>{phase}</strong>
            {runId ? (
              <>
                {' '}
                · runId: <code>{runId}</code>
              </>
            ) : null}
          </span>
        </div>

        <section className="panel">
          <h2>Event stream</h2>
          <EventLog entries={entries} />
        </section>

        <RunSummary phase={phase} message={summaryMessage} changedFiles={changedFiles} />
      </main>
    </div>
  )
}
