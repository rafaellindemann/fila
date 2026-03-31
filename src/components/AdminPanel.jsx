import { useEffect, useState } from 'react'
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
  const [timerKey, setTimerKey] = useState(0)

  useEffect(() => {
    carregarTurmas()
  }, [])

  async function carregarTurmas() {
    const data = await listarTurmasAtivas()
    setTurmas(data)
  }

  const emAtendimento = fila.find((item) => item.status === 'em_atendimento')
  const aguardando = fila.filter((item) => item.status === 'aguardando')
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
    setTimerKey((prev) => prev + 1)
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

  async function marcarVacuo() {
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

  return (
    <div className="admin-grid">
      <div className="card">
        <h2>Painel admin</h2>

        {!sessaoAtiva ? (
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
              <input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
            </label>

            <button type="submit">Abrir fila</button>
          </form>
        ) : (
          <div className="session-box">
            <p><strong>Turma:</strong> {sessaoAtiva.turma?.apelido || sessaoAtiva.turma?.nome}</p>
            <p><strong>Título:</strong> {sessaoAtiva.titulo || '—'}</p>
            <button className="danger" onClick={fecharSessao}>Encerrar sessão</button>
          </div>
        )}
      </div>

      <TimerCard
        key={timerKey}
        active={!!emAtendimento}
        seconds={180}
        onFinish={() => alert('Tempo de atendimento encerrado!')}
      />

      <div className="card">
        <h2>Operação da fila</h2>

        <div className="admin-actions">
          <button onClick={chamarProximo} disabled={!proximo}>
            Chamar próximo
          </button>

          <button className="secondary" onClick={concluirProfessor} disabled={!emAtendimento}>
            Finalizar atendimento
          </button>

          <button className="secondary" onClick={marcarVacuo} disabled={!emAtendimento}>
            Ficou no vácuo
          </button>
        </div>

        {emAtendimento && (
          <div className="highlight-box">
            <strong>Em atendimento:</strong> {emAtendimento.nome_completo}
            <p>{emAtendimento.descricao_problema || 'Sem descrição.'}</p>
          </div>
        )}

        <div className="mini-list">
          <h3>Aguardando</h3>
          {aguardando.map((item) => (
            <div className="mini-row" key={item.chamado_id}>
              <span>{item.nome_completo}</span>
              <button className="ghost" onClick={() => cancelar(item.chamado_id)}>
                Cancelar
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}