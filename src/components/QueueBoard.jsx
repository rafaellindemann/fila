import { formatElapsed } from '../utils/time'

export default function QueueBoard({ fila }) {
  const emAtendimento = fila.find((item) => item.status === 'em_atendimento')
  const aguardando = fila.filter((item) => item.status === 'aguardando')

  return (
    <div className="queue-board-public">
      {emAtendimento && (
        <div className="card public-now-serving">
          <span className="badge">Em atendimento</span>
          <h2>{emAtendimento.nome_completo}</h2>
          <p>{emAtendimento.descricao_problema || 'Sem descrição informada.'}</p>
        </div>
      )}

      <div className="card">
        <div className="section-header">
          <h2>Fila atual</h2>
          <span className="badge">{aguardando.length} aguardando</span>
        </div>

        <div className="queue-list">
          {aguardando.length === 0 && <p className="muted">Nenhum aluno na fila.</p>}

          {aguardando.map((item, index) => (
            <div className="queue-item" key={item.chamado_id}>
              <div className="queue-pos">{index + 1}</div>

              <div className="queue-main">
                <strong>{item.nome_completo}</strong>
                <p className="queue-problema-small">
                  {item.descricao_problema || 'Sem descrição informada.'}
                </p>
              </div>

              <div className="queue-meta">
                <span className="timer">{formatElapsed(item.entrou_em)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}