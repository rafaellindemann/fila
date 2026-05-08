import { useState } from 'react'
import TimerCard from './TimerCard'
import { solicitarConfirmacaoAjuda } from '../services/solicitacoesAjuda'

export default function QueueBoard({ fila, usuario }) {
  const [solicitandoId, setSolicitandoId] = useState(null)
  const [msg, setMsg] = useState('')
  const [erro, setErro] = useState('')

  const emAtendimento = fila.find((item) => item.status === 'em_atendimento')
  const aguardando = fila.filter((item) => item.status === 'aguardando')

  function getDonoChamadoId(item) {
    return item.perfil_id || item.usuario_id || item.aluno_id || null
  }

  function podeAjudar(item) {
    if (!usuario?.id) return false
    if (item.status !== 'aguardando') return false

    const donoId = getDonoChamadoId(item)
    if (!donoId) return true

    return String(donoId) !== String(usuario.id)
  }

  async function handleAjudei(item) {
    try {
      setErro('')
      setMsg('')
      setSolicitandoId(item.chamado_id)

      await solicitarConfirmacaoAjuda({
        chamado_id: item.chamado_id,
        solicitado_por_usuario_id: usuario.id,
      })

      setMsg(`Pedido de confirmação enviado para ${item.nome_completo}.`)
    } catch (err) {
      if (err.code === '23505') {
        setErro('Você já enviou um pedido de confirmação para esse chamado.')
      } else {
        setErro(err.message || 'Não foi possível enviar o pedido de ajuda.')
      }
    } finally {
      setSolicitandoId(null)
    }
  }

  return (
    <div className="queue-board-public datashow-mode">
      {emAtendimento && (
        <div className="card public-now-serving">
          <div className="public-card-top">
            <span className="badge badge-serving">Em atendimento</span>
            <TimerCard
              active
              startedAt={emAtendimento.iniciado_atendimento_em}
              compact
            />
          </div>

          <h2>{emAtendimento.nome_completo}</h2>

          <p className="public-card-question destaque-pergunta">
            {emAtendimento.descricao_problema || '🔇'}
          </p>
        </div>
      )}

      <div className="card datashow-queue-card">
        <div className="section-header">
          <h2>Fila atual</h2>
          <span className="badge">{aguardando.length} aguardando</span>
        </div>

        {msg && <p className="success">{msg}</p>}
        {erro && <p className="error">{erro}</p>}

        {aguardando.length === 0 ? (
          <p className="muted">Nenhum aluno na fila.</p>
        ) : (
          <div className="queue-cards-grid datashow-grid">
            {aguardando.map((item, index) => (
              <article className="queue-public-card datashow-public-card" key={item.chamado_id}>
                <div className="queue-public-card-top">
                  <div className="queue-public-pos">{index + 1}</div>
                  <div className="queue-public-name">{item.nome_completo}</div>
                </div>

                <p className="queue-public-question destaque-pergunta">
                  {item.descricao_problema || '🔇'}
                </p>

                {podeAjudar(item) && (
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => handleAjudei(item)}
                    disabled={solicitandoId === item.chamado_id}
                  >
                    {solicitandoId === item.chamado_id ? 'Enviando...' : 'Ajudei'}
                  </button>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}