interface Props {
  task: string
  workdir: string
  yes: boolean
  disabled: boolean
  onTaskChange: (v: string) => void
  onWorkdirChange: (v: string) => void
  onYesChange: (v: boolean) => void
}

export function RunForm({
  task,
  workdir,
  yes,
  disabled,
  onTaskChange,
  onWorkdirChange,
  onYesChange,
}: Props) {
  return (
    <div className="form">
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
        <span>Workdir（服务器本地绝对路径）</span>
        <input
          type="text"
          value={workdir}
          disabled={disabled}
          placeholder="D:/code/my-project"
          onChange={(e) => onWorkdirChange(e.target.value)}
        />
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={yes}
          disabled={disabled}
          onChange={(e) => onYesChange(e.target.checked)}
        />
        <span>yes — 自动批准危险 shell 命令（默认拒绝）</span>
      </label>
    </div>
  )
}
