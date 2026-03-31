export function formatElapsed(dateString) {
  if (!dateString) return '--:--'

  const start = new Date(dateString).getTime()
  const now = Date.now()
  const diff = Math.max(0, Math.floor((now - start) / 1000))

  const min = String(Math.floor(diff / 60)).padStart(2, '0')
  const sec = String(diff % 60).padStart(2, '0')

  return `${min}:${sec}`
}

export function formatClock(dateString) {
  if (!dateString) return '--:--'
  return new Date(dateString).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}