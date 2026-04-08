import { useEffect, useMemo, useState } from 'react'
import { listarTurmasAtivas } from '../services/turmas'
import { criarSessao, encerrarSessao } from '../services/sessoes'
import {
  iniciarAtendimento,
  finalizarChamado,
  cancelarChamadoAdmin,
} from '../services/chamados'
import { registrarInteracao } from '../services/interacoes'
import TimerCard from './TimerCard'

export default function AdminPanel({ fila, sessaoAtiva, onRefresh }) {
  const [turmas, setTurmas] = useState([])
  const [turmaId, setTurmaId] = useState('')
  const [titulo, setTitulo] = useState('')

  useEffect(() => {
    carregarTurmas()
  }, [])

  async function carregarTurmas() {
    const data = await listarTurmasAtivas()
    setTurmas(data)
  }

  const emAtendimento = useMemo(
    () => fila.find((item) => item.status === 'em_atendimento'),
    [fila]
  )

  const aguardando = useMemo(
    () => fila.filter((item) => item.status === 'aguardando'),
    [fila]
  )

  const proximo = aguardando[0]

  async function abrirSessao(e) {
    e.preventDefault()
    await criarSessao({
      turma_id: Number(turmaId),
      titulo,
    })
    setTurmaId('')
    setTitulo('')
    onRefresh()
  }

  async function fecharSessao() {
    if (!sessaoAtiva) return
    await encerrarSessao(sessaoAtiva.id)
    onRefresh()
  }

  async function chamarProximo() {
    if (!proximo) return
    await iniciarAtendimento(proximo.chamado_id)
    onRefresh()
  }

  async function concluirProfessor() {
    if (!emAtendimento) return

    await finalizarChamado(emAtendimento.chamado_id)
    await registrarInteracao({
      chamado_id: emAtendimento.chamado_id,
      tipo_resultado: 'atendido_professor',
    })
    onRefresh()
  }

  async function marcarVacuoEmAtendimento() {
    if (!emAtendimento) return

    await finalizarChamado(emAtendimento.chamado_id)
    await registrarInteracao({
      chamado_id: emAtendimento.chamado_id,
      tipo_resultado: 'ficou_no_vacuo',
    })
    onRefresh()
  }

  async function cancelar(chamadoId) {
    await cancelarChamadoAdmin(chamadoId)
    await registrarInteracao({
      chamado_id: chamadoId,
      tipo_resultado: 'cancelado_pelo_aluno',
    })
    onRefresh()
  }

  async function marcarVacuoNaFila(chamadoId) {
    await cancelarChamadoAdmin(chamadoId)
    await registrarInteracao({
      chamado_id: chamadoId,
      tipo_resultado: 'ficou_no_vacuo',
    })
    onRefresh()
  }

  if (!sessaoAtiva) {
    return (
      <div className="admin-stack">
        <div className="card">
          <h2>Abrir fila</h2>

          <form className="form" onSubmit={abrirSessao}>
            <label>
              Turma da sessão
              <select
                value={turmaId}
                onChange={(e) => setTurmaId(e.target.value)}
                required
              >
                <option value="">Selecione a turma</option>
                {turmas.map((turma) => (
                  <option key={turma.id} value={turma.id}>
                    {turma.apelido} — {turma.nome}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Título da aula
              <input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
              />
            </label>

            <button type="submit">Abrir fila</button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-stack">
      <div className="card session-banner">
        <div>
          <h2>{sessaoAtiva.turma?.apelido || sessaoAtiva.turma?.nome}</h2>
          <p className="muted">
            {sessaoAtiva.titulo || 'Sessão em andamento'}
          </p>
        </div>

        <button className="danger" onClick={fecharSessao}>
          Encerrar sessão
        </button>
      </div>

      <div className="admin-main-grid">
        <div className="card atendimento-card">
          <div className="section-header">
            <h2>Em atendimento</h2>
            <TimerCard
              active={!!emAtendimento}
              startedAt={emAtendimento?.iniciado_atendimento_em || null}
              compact
            />
          </div>

          {emAtendimento ? (
            <div className="atendimento-highlight">
              <div className="atendimento-name">
                {emAtendimento.nome_completo}
              </div>

              <p className="atendimento-problema destaque-pergunta">
                {emAtendimento.descricao_problema || 'Sem descrição informada.'}
              </p>

              <div className="admin-actions">
                <button className="secondary" onClick={concluirProfessor}>
                  Finalizar
                </button>

                <button className="secondary" onClick={marcarVacuoEmAtendimento}>
                  Ficou no vácuo
                </button>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <p className="muted">Ninguém em atendimento no momento.</p>
              <button onClick={chamarProximo} disabled={!proximo}>
                Chamar próximo
              </button>
            </div>
          )}
        </div>

        <div className="card fila-admin-card">
          <div className="section-header">
            <h2>Fila</h2>
            <span className="badge">{aguardando.length} aguardando</span>
          </div>

          {aguardando.length === 0 ? (
            <p className="muted">Nenhum aluno aguardando.</p>
          ) : (
            <div className="queue-list admin-queue-list">
              {aguardando.map((item, index) => (
                <div className="queue-item admin-queue-item" key={item.chamado_id}>
                  <div className="queue-pos">{index + 1}</div>

                  <div className="queue-main">
                    <strong>{item.nome_completo}</strong>
                    <p className="queue-problema-small destaque-pergunta">
                      {item.descricao_problema || 'Sem descrição informada.'}
                    </p>
                  </div>

                  <div className="queue-meta">
                    <div className="inline-actions">
                      <button className="ghost" onClick={() => marcarVacuoNaFila(item.chamado_id)}>
                        Ficou no vácuo
                      </button>

                      <button className="ghost" onClick={() => cancelar(item.chamado_id)}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="admin-footer-actions">
            <button onClick={chamarProximo} disabled={!proximo || !!emAtendimento}>
              Chamar próximo
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}