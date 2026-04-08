import { useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'fila_tempo_atendimento_segundos'
const DEFAULT_DURATION_SECONDS = 120

function getStoredDurationSeconds() {
  const raw = localStorage.getItem(STORAGE_KEY)
  const parsed = Number(raw)

  if (!raw || Number.isNaN(parsed) || parsed <= 0) {
    return DEFAULT_DURATION_SECONDS
  }

  return parsed
}

function formatClock(totalSeconds) {
  const safeSeconds = Math.max(0, totalSeconds)
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export default function TimerCard({
  active = false,
  startedAt = null,
  compact = false,
  durationSeconds,
}) {
  const [now, setNow] = useState(Date.now())
  const [storedDuration, setStoredDuration] = useState(getStoredDurationSeconds())

  useEffect(() => {
    function syncDuration() {
      setStoredDuration(getStoredDurationSeconds())
    }

    window.addEventListener('storage', syncDuration)
    return () => window.removeEventListener('storage', syncDuration)
  }, [])

  useEffect(() => {
    if (!active || !startedAt) return

    const id = setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => clearInterval(id)
  }, [active, startedAt])

  const effectiveDuration = durationSeconds || storedDuration || DEFAULT_DURATION_SECONDS

  const elapsedSeconds = useMemo(() => {
    if (!active || !startedAt) return 0

    const startedMs = new Date(startedAt).getTime()
    if (Number.isNaN(startedMs)) return 0

    return Math.max(0, Math.floor((now - startedMs) / 1000))
  }, [active, startedAt, now])

  const remainingSeconds = Math.max(0, effectiveDuration - elapsedSeconds)
  const expired = active && startedAt && elapsedSeconds >= effectiveDuration
  const display = formatClock(remainingSeconds)

  const className = compact
    ? `timer-inline ${expired ? 'alert pulse' : ''}`.trim()
    : `card timer-card ${expired ? 'alert pulse' : ''}`.trim()

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
    return <div className={className}>{display}</div>
  }

  return (
    <div className={className}>
      <h3>Tempo de atendimento</h3>
      <div className="big-timer">{display}</div>
    </div>
  )
}