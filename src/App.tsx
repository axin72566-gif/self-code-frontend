import { useCallback, useEffect, useRef, useState } from 'react'
import {
  cancelRun,
  createSession,
  createSessionRun,
  fetchHealth,
  getSession,
  postDecision,
  resumeSession,
} from './api/client'
import { subscribeRunEvents } from './api/sse'
import type { ApprovalPayload, LogEntry, RunPhase, SessionSummary, SseEventType } from './api/types'
import { EventLog } from './components/EventLog'
import { HealthBadge, type HealthView } from './components/HealthBadge'
import { RunForm } from './components/RunForm'
import { RunSummary } from './components/RunSummary'
import './App.css'

const SESSION_STORAGE_KEY = 'selfcode.sessionId'

function isCancelMessage(data: string): boolean {
  const lower = data.toLowerCase()
  return lower.includes('cancel') || lower.includes('interrupted')
}

function isTerminal(phase: RunPhase): boolean {
  return phase === 'succeeded' || phase === 'failed' || phase === 'cancelled'
}

function readStoredSessionId(): string | null {
  try {
    const v = localStorage.getItem(SESSION_STORAGE_KEY)
    return v && v.trim() ? v.trim() : null
  } catch {
    return null
  }
}

function writeStoredSessionId(sessionId: string | null) {
  try {
    if (sessionId) {
      localStorage.setItem(SESSION_STORAGE_KEY, sessionId)
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY)
    }
  } catch {
    // ignore
  }
}

function parseApproval(data: string): ApprovalPayload | null {
  try {
    return JSON.parse(data) as ApprovalPayload
  } catch {
    return null
  }
}

export default function App() {
  const [health, setHealth] = useState<HealthView>({ kind: 'loading' })
  const [task, setTask] = useState('')
  const [workdir, setWorkdir] = useState('')
  const [yes, setYes] = useState(false)
  const [resumeIdInput, setResumeIdInput] = useState('')
  const [session, setSession] = useState<SessionSummary | null>(null)
  const [phase, setPhase] = useState<RunPhase>('idle')
  const [runId, setRunId] = useState<string | null>(null)
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [summaryMessage, setSummaryMessage] = useState<string | null>(null)
  const [changedFiles, setChangedFiles] = useState<string[]>([])
  const [formError, setFormError] = useState<string | null>(null)
  const [pendingApproval, setPendingApproval] = useState<ApprovalPayload | null>(null)
  const [verifyStatus, setVerifyStatus] = useState<string | null>(null)
  const [deciding, setDeciding] = useState(false)

  const seqRef = useRef(0)
  const closeSseRef = useRef<(() => void) | null>(null)
  const cancelRequestedRef = useRef(false)
  const lastMessageRef = useRef<string | null>(null)
  const phaseRef = useRef<RunPhase>('idle')
  const bootstrappedRef = useRef(false)

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

  const applySession = useCallback((summary: SessionSummary) => {
    setSession(summary)
    setWorkdir(summary.workdir)
    writeStoredSessionId(summary.sessionId)
  }, [])

  const refreshSession = useCallback(
    async (sessionId: string) => {
      const summary = await getSession(sessionId)
      applySession(summary)
      return summary
    },
    [applySession],
  )

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

  useEffect(() => {
    if (bootstrappedRef.current) return
    bootstrappedRef.current = true
    const stored = readStoredSessionId()
    if (!stored) return
    void (async () => {
      try {
        const summary = await resumeSession(stored)
        applySession(summary)
        appendLog('info', `resumed session from localStorage: ${summary.sessionId}`)
      } catch (e) {
        writeStoredSessionId(null)
        const msg = e instanceof Error ? e.message : 'resume failed'
        appendLog('client_error', `auto-resume failed: ${msg}`)
      }
    })()
  }, [appendLog, applySession])

  const busy =
    phase === 'starting' || phase === 'running' || phase === 'cancelling' || phase === 'awaiting_approval'

  const clearRunOutcome = () => {
    setSummaryMessage(null)
    setChangedFiles([])
    setFormError(null)
    setPendingApproval(null)
    setVerifyStatus(null)
    lastMessageRef.current = null
    cancelRequestedRef.current = false
  }

  const handleSseEvent = useCallback(
    (type: SseEventType, data: string) => {
      if (type === 'ping') {
        return
      }
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
      if (type === 'verify') {
        setVerifyStatus(data)
      }
      if (type === 'approval_needed') {
        const payload = parseApproval(data)
        if (payload?.requestId) {
          setPendingApproval(payload)
          setPhase('awaiting_approval')
        }
      }
      if (type === 'approval_resolved') {
        setPendingApproval(null)
        if (phaseRef.current === 'awaiting_approval') {
          setPhase('running')
        }
      }
      if (type === 'done') {
        closeSseRef.current?.()
        closeSseRef.current = null
        setPendingApproval(null)
        if (cancelRequestedRef.current) {
          setPhase('cancelled')
        } else {
          setPhase('succeeded')
          setSummaryMessage(lastMessageRef.current)
          setTask('')
        }
        const sid = readStoredSessionId()
        if (sid) {
          void refreshSession(sid).catch(() => {
            /* ignore */
          })
        }
      }
      if (type === 'error') {
        closeSseRef.current?.()
        closeSseRef.current = null
        setPendingApproval(null)
        if (cancelRequestedRef.current || isCancelMessage(data)) {
          setPhase('cancelled')
        } else {
          setPhase('failed')
        }
        setSummaryMessage(data)
        const sid = readStoredSessionId()
        if (sid) {
          void refreshSession(sid).catch(() => {
            /* ignore */
          })
        }
      }
    },
    [appendLog, refreshSession],
  )

  const attachSse = (id: string) => {
    closeSseRef.current = subscribeRunEvents(id, {
      onEvent: handleSseEvent,
      onOpen: () => appendLog('info', 'SSE connected'),
      onTransportError: (msg) => {
        const p = phaseRef.current
        if (isTerminal(p)) return
        appendLog('client_error', msg)
        closeSseRef.current = null
        setPendingApproval(null)
        if (cancelRequestedRef.current || p === 'cancelling') {
          setPhase('cancelled')
          setSummaryMessage('Cancelled (stream closed)')
        } else {
          setPhase('failed')
          setSummaryMessage(msg)
        }
      },
    })
  }

  const onStart = async () => {
    if (busy) return
    const t = task.trim()
    if (!t) {
      setFormError('task 为必填')
      return
    }

    closeSseRef.current?.()
    closeSseRef.current = null
    clearRunOutcome()
    setPhase('starting')
    setRunId(null)

    try {
      let sessionId = session?.sessionId ?? null
      if (!sessionId) {
        const w = workdir.trim()
        if (!w) {
          setFormError('创建 session 需要 workdir')
          setPhase('idle')
          return
        }
        const created = await createSession({ workdir: w, yes })
        const summary = await getSession(created.sessionId)
        applySession(summary)
        sessionId = created.sessionId
        appendLog('info', `session created: ${sessionId}`)
      }

      appendLog('info', `── turn: ${t}`)
      const approvalLevel = yes ? 'auto' : 'confirm'
      const { runId: id } = await createSessionRun(sessionId, { task: t, yes, approvalLevel })
      setRunId(id)
      appendLog('info', `run started: ${id} (approvalLevel=${approvalLevel})`)
      setPhase('running')
      attachSse(id)
      void refreshSession(sessionId)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'failed to start'
      setFormError(msg)
      appendLog('client_error', msg)
      setPhase('failed')
      setSummaryMessage(msg)
    }
  }

  const onDecision = async (decision: 'approve' | 'reject') => {
    if (!runId || !pendingApproval?.requestId || deciding) return
    setDeciding(true)
    setFormError(null)
    try {
      await postDecision(runId, { requestId: pendingApproval.requestId, decision })
      appendLog('info', `decision sent: ${decision}`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'decision failed'
      setFormError(msg)
      appendLog('client_error', msg)
    } finally {
      setDeciding(false)
    }
  }

  const onResume = async () => {
    if (busy) return
    const id = resumeIdInput.trim() || session?.sessionId || ''
    if (!id) {
      setFormError('请填写要 resume 的 sessionId')
      return
    }
    setFormError(null)
    try {
      const summary = await resumeSession(id)
      applySession(summary)
      setResumeIdInput('')
      appendLog('info', `resumed session: ${summary.sessionId} (messages=${summary.messageCount})`)
      setPhase('idle')
      setRunId(null)
      setSummaryMessage(null)
      setChangedFiles([])
      setPendingApproval(null)
      setVerifyStatus(null)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'resume failed'
      setFormError(msg)
      appendLog('client_error', msg)
    }
  }

  const onNewSession = () => {
    if (busy) return
    closeSseRef.current?.()
    closeSseRef.current = null
    writeStoredSessionId(null)
    setSession(null)
    setRunId(null)
    setPhase('idle')
    setEntries([])
    setSummaryMessage(null)
    setChangedFiles([])
    setFormError(null)
    setTask('')
    setResumeIdInput('')
    setPendingApproval(null)
    setVerifyStatus(null)
    cancelRequestedRef.current = false
    lastMessageRef.current = null
    appendLog('info', 'cleared session — next Start will create a new one')
  }

  const onCancel = async () => {
    if (!runId || !(phase === 'running' || phase === 'starting' || phase === 'awaiting_approval')) return
    cancelRequestedRef.current = true
    setPhase('cancelling')
    try {
      await cancelRun(runId)
      appendLog('info', 'cancel requested')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'cancel failed'
      appendLog('client_error', msg)
      setFormError(msg)
      if (phaseRef.current === 'cancelling') {
        closeSseRef.current?.()
        closeSseRef.current = null
        setPendingApproval(null)
        setPhase('cancelled')
        setSummaryMessage(msg)
      }
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>self-code</h1>
          <p className="tagline">P1 session console</p>
        </div>
        <HealthBadge health={health} onRefresh={() => void refreshHealth()} />
      </header>

      <main className="main">
        <RunForm
          task={task}
          workdir={workdir}
          yes={yes}
          resumeId={resumeIdInput}
          sessionId={session?.sessionId ?? null}
          sessionStatus={session?.status ?? null}
          messageCount={session?.messageCount ?? 0}
          workdirLocked={Boolean(session)}
          disabled={busy}
          onTaskChange={setTask}
          onWorkdirChange={setWorkdir}
          onYesChange={setYes}
          onResumeIdChange={setResumeIdInput}
        />

        {formError ? <p className="form-error">{formError}</p> : null}

        {pendingApproval ? (
          <section className="approval-panel">
            <h2>需要审批 · {pendingApproval.kind ?? 'request'}</h2>
            {pendingApproval.summary ? <p>{pendingApproval.summary}</p> : null}
            {pendingApproval.detail ? <pre className="message-block">{pendingApproval.detail}</pre> : null}
            <div className="actions">
              <button
                type="button"
                className="btn btn-primary"
                disabled={deciding}
                onClick={() => void onDecision('approve')}
              >
                Approve
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={deciding}
                onClick={() => void onDecision('reject')}
              >
                Reject
              </button>
            </div>
          </section>
        ) : null}

        <div className="actions">
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void onStart()}>
            Start
          </button>
          <button
            type="button"
            className="btn btn-danger"
            disabled={!runId || !(phase === 'running' || phase === 'starting' || phase === 'awaiting_approval')}
            onClick={() => void onCancel()}
          >
            Cancel
          </button>
          <button type="button" className="btn" disabled={busy} onClick={() => void onResume()}>
            Resume
          </button>
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={onNewSession}>
            New Session
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

        <RunSummary
          phase={phase}
          message={summaryMessage}
          changedFiles={changedFiles}
          verifyStatus={verifyStatus}
        />
      </main>
    </div>
  )
}
