import type { RunPhase } from '../api/types'

interface Props {
  phase: RunPhase
  message: string | null
  changedFiles: string[]
  verifyStatus: string | null
}

export function RunSummary({ phase, message, changedFiles, verifyStatus }: Props) {
  if (
    phase === 'idle' ||
    phase === 'starting' ||
    phase === 'running' ||
    phase === 'awaiting_approval' ||
    phase === 'cancelling'
  ) {
    return null
  }

  if (phase === 'cancelled') {
    return (
      <section className="summary summary-cancelled">
        <h2>已取消</h2>
        <p>未标记为成功。</p>
        {message ? <p className="muted">{message}</p> : null}
      </section>
    )
  }

  if (phase === 'failed') {
    return (
      <section className="summary summary-failed">
        <h2>失败</h2>
        {message ? <p>{message}</p> : <p>运行失败</p>}
      </section>
    )
  }

  return (
    <section className="summary summary-ok">
      <h2>完成</h2>
      {verifyStatus ? (
        <>
          <h3>Verify</h3>
          <pre className="message-block">{verifyStatus}</pre>
        </>
      ) : null}
      {changedFiles.length > 0 ? (
        <>
          <h3>Changed files</h3>
          <ul>
            {changedFiles.map((f) => (
              <li key={f}>
                <code>{f}</code>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="muted">无文件变更记录</p>
      )}
      {message ? (
        <>
          <h3>Summary</h3>
          <pre className="message-block">{message}</pre>
        </>
      ) : null}
    </section>
  )
}
