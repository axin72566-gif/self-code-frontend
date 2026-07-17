interface Props {
  task: string
  workdir: string
  yes: boolean
  resumeId: string
  sessionId: string | null
  sessionStatus: string | null
  messageCount: number
  workdirLocked: boolean
  disabled: boolean
  onTaskChange: (v: string) => void
  onWorkdirChange: (v: string) => void
  onYesChange: (v: boolean) => void
  onResumeIdChange: (v: string) => void
}

export function RunForm({
  task,
  workdir,
  yes,
  resumeId,
  sessionId,
  sessionStatus,
  messageCount,
  workdirLocked,
  disabled,
  onTaskChange,
  onWorkdirChange,
  onYesChange,
  onResumeIdChange,
}: Props) {
  return (
    <div className="form">
      <div className="session-meta">
        {sessionId ? (
          <>
            <span>
              session: <code>{sessionId}</code>
            </span>
            <span>
              status: <strong>{sessionStatus ?? '—'}</strong>
            </span>
            <span>messages: {messageCount}</span>
          </>
        ) : (
          <span className="muted">无活跃 session — Start 时将按 workdir 创建</span>
        )}
      </div>

      <label className="field">
        <span>Task</span>
        <textarea
          rows={4}
          value={task}
          disabled={disabled}
          placeholder="例如：把 README 标题改成 Hello"
          onChange={(e) => onTaskChange(e.target.value)}
        />
      </label>
      <label className="field">
        <span>Workdir（服务器本地绝对路径）{workdirLocked ? ' · 已锁定' : ''}</span>
        <input
          type="text"
          value={workdir}
          disabled={disabled || workdirLocked}
          placeholder="D:/code/my-project"
          onChange={(e) => onWorkdirChange(e.target.value)}
        />
      </label>
      <label className="field">
        <span>Resume sessionId（可选）</span>
        <input
          type="text"
          value={resumeId}
          disabled={disabled}
          placeholder="粘贴已有 sessionId 后点 Resume"
          onChange={(e) => onResumeIdChange(e.target.value)}
        />
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={yes}
          disabled={disabled}
          onChange={(e) => onYesChange(e.target.checked)}
        />
        <span>auto — 跳过计划确认与命令审批（等价 yes=true / approvalLevel=auto）</span>
      </label>
    </div>
  )
}
