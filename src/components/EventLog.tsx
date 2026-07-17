import { useEffect, useRef } from 'react'
import type { LogEntry } from '../api/types'

interface Props {
  entries: LogEntry[]
}

export function EventLog({ entries }: Props) {
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [entries])

  if (entries.length === 0) {
    return <div className="log empty">事件流将显示在这里</div>
  }

  return (
    <div className="log">
      {entries.map((e) => (
        <div key={e.id} className={`log-line log-${e.type}`}>
          <span className="log-type">{e.type}</span>
          <span className="log-data">{e.data}</span>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
