import { formatElapsed } from '../utils/time'

export default function QueueBoard({ fila }) {
  return (
    <div className="card">
      <div className="section-header">
        <h2>Fila atual</h2>
        <span className="badge">{fila.length} ativos</span>
      </div>

      <div className="queue-list">
        {fila.length === 0 && <p className="muted">Nenhum aluno na fila.</p>}

        {fila.map((item, index) => (
          <div className="queue-item" key={item.chamado_id}>
            <div className="queue-pos">{index + 1}</div>

            <div className="queue-main">
              <strong>{item.nome_completo}</strong>
              <span className="muted small">
                {item.turma_apelido || item.turma}
              </span>
              <p>{item.descricao_problema || 'Sem descrição informada.'}</p>
            </div>

            <div className="queue-meta">
              <span className={`status ${item.status}`}>{item.status}</span>
              <span className="timer">{formatElapsed(item.entrou_em)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}