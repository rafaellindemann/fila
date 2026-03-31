import { useEffect, useState } from 'react'

export default function TimerCard({ active = false, seconds = 180, onFinish }) {
  const [timeLeft, setTimeLeft] = useState(seconds)

  useEffect(() => {
    setTimeLeft(seconds)
  }, [seconds])

  useEffect(() => {
    if (!active) return
    if (timeLeft <= 0) {
      onFinish?.()
      return
    }

    const id = setInterval(() => {
      setTimeLeft((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(id)
  }, [active, timeLeft, onFinish])

  if (!active) {
    return (
      <div className="card timer-card">
        <h3>Timer de atendimento</h3>
        <p className="muted">Nenhum atendimento em andamento.</p>
      </div>
    )
  }

  const min = String(Math.floor(timeLeft / 60)).padStart(2, '0')
  const sec = String(timeLeft % 60).padStart(2, '0')

  return (
    <div className="card timer-card">
      <h3>Timer de atendimento</h3>
      <div className="big-timer">{min}:{sec}</div>
    </div>
  )
}