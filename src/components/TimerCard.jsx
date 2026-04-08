import { useEffect, useMemo, useState } from 'react'

function formatElapsedTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return [
      String(hours).padStart(2, '0'),
      String(minutes).padStart(2, '0'),
      String(seconds).padStart(2, '0'),
    ].join(':')
  }

  return [
    String(minutes).padStart(2, '0'),
    String(seconds).padStart(2, '0'),
  ].join(':')
}

export default function TimerCard({
  active = false,
  startedAt = null,
  compact = false,
}) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (!active || !startedAt) return

    const id = setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => clearInterval(id)
  }, [active, startedAt])

  const elapsedSeconds = useMemo(() => {
    if (!active || !startedAt) return 0

    const startedMs = new Date(startedAt).getTime()
    if (Number.isNaN(startedMs)) return 0

    return Math.max(0, Math.floor((now - startedMs) / 1000))
  }, [active, startedAt, now])

  const display = formatElapsedTime(elapsedSeconds)

  if (!active || !startedAt) {
    return (
      <div className={compact ? 'timer-inline idle' : 'card timer-card'}>
        {compact ? (
          <span className="muted">sem atendimento</span>
        ) : (
          <>
            <h3>Tempo de atendimento</h3>
            <p className="muted">Nenhum atendimento em andamento.</p>
          </>
        )}
      </div>
    )
  }

  if (compact) {
    return <div className="timer-inline">{display}</div>
  }

  return (
    <div className="card timer-card">
      <h3>Tempo de atendimento</h3>
      <div className="big-timer">{display}</div>
    </div>
  )
}