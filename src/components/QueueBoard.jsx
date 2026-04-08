export default function QueueBoard({ fila }) {
  const emAtendimento = fila.find((item) => item.status === 'em_atendimento')
  const aguardando = fila.filter((item) => item.status === 'aguardando')

  return (
    <div className="queue-board-public">
      {emAtendimento && (
        <div className="card public-now-serving">
          <div className="public-card-top">
            <span className="badge badge-serving">Em atendimento</span>
            <span className="public-card-order">Agora</span>
          </div>

          <h2>{emAtendimento.nome_completo}</h2>
          <p className="public-card-question destaque-pergunta">
            {emAtendimento.descricao_problema || 'Sem descrição informada.'}
          </p>
        </div>
      )}

      <div className="card">
        <div className="section-header">
          <h2>Fila atual</h2>
          <span className="badge">{aguardando.length} aguardando</span>
        </div>

        {aguardando.length === 0 ? (
          <p className="muted">Nenhum aluno na fila.</p>
        ) : (
          <div className="queue-cards-grid">
            {aguardando.map((item, index) => (
              <article className="queue-public-card" key={item.chamado_id}>
                <div className="queue-public-card-top">
                  <div className="queue-public-pos">{index + 1}</div>
                  <div className="queue-public-name">{item.nome_completo}</div>
                </div>

                <p className="queue-public-question destaque-pergunta">
                  {item.descricao_problema || 'Sem descrição informada.'}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}