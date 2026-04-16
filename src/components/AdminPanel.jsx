import { useEffect, useMemo, useState } from "react";
import { listarTurmasAtivas } from "../services/turmas";
import { criarSessao, encerrarSessao } from "../services/sessoes";
import {
  iniciarAtendimento,
  finalizarChamado,
  cancelarChamadoAdmin,
  chamarAgora,
} from "../services/chamados";
import { registrarInteracao } from "../services/interacoes";
import TimerCard from "./TimerCard";

const STORAGE_KEY = "fila_tempo_atendimento_segundos";
const DEFAULT_DURATION_SECONDS = 120;

function getStoredDurationSeconds() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const parsed = Number(raw);

  if (!raw || Number.isNaN(parsed) || parsed <= 0) {
    return DEFAULT_DURATION_SECONDS;
  }

  return parsed;
}

export default function AdminPanel({ fila, sessaoAtiva, onRefresh }) {
  const [turmas, setTurmas] = useState([]);
  const [turmaId, setTurmaId] = useState("");
  const [titulo, setTitulo] = useState("");

  const [tempoConfigMinutos, setTempoConfigMinutos] = useState(() =>
    String(Math.round(getStoredDurationSeconds() / 60)),
  );
  const [tempoAtendimentoSegundos, setTempoAtendimentoSegundos] = useState(() =>
    getStoredDurationSeconds(),
  );

  useEffect(() => {
    carregarTurmas();
  }, []);

  async function carregarTurmas() {
    const data = await listarTurmasAtivas();
    setTurmas(data);
  }

  const emAtendimento = useMemo(
    () => fila.find((item) => item.status === "em_atendimento"),
    [fila],
  );

  const aguardando = useMemo(
    () => fila.filter((item) => item.status === "aguardando"),
    [fila],
  );

  const proximo = aguardando[0];

  async function abrirSessao(e) {
    e.preventDefault();
    await criarSessao({
      turma_id: Number(turmaId),
      titulo,
    });
    setTurmaId("");
    setTitulo("");
    onRefresh();
  }

  async function fecharSessao() {
    if (!sessaoAtiva) return;
    await encerrarSessao(sessaoAtiva.id);
    onRefresh();
  }

  async function chamarProximo() {
    if (!proximo) return;
    await iniciarAtendimento(proximo.chamado_id);
    onRefresh();
  }

  async function concluirProfessor() {
    if (!emAtendimento) return;

    await finalizarChamado(emAtendimento.chamado_id);
    await registrarInteracao({
      chamado_id: emAtendimento.chamado_id,
      tipo_resultado: "atendido_professor",
    });
    onRefresh();
  }

  async function marcarVacuoEmAtendimento() {
    if (!emAtendimento) return;

    await finalizarChamado(emAtendimento.chamado_id);
    await registrarInteracao({
      chamado_id: emAtendimento.chamado_id,
      tipo_resultado: "ficou_no_vacuo",
    });
    onRefresh();
  }

  async function cancelar(chamadoId) {
    await cancelarChamadoAdmin(chamadoId);
    await registrarInteracao({
      chamado_id: chamadoId,
      tipo_resultado: "cancelado_pelo_aluno",
    });
    onRefresh();
  }

  async function marcarVacuoNaFila(chamadoId) {
    await cancelarChamadoAdmin(chamadoId);
    await registrarInteracao({
      chamado_id: chamadoId,
      tipo_resultado: "ficou_no_vacuo",
    });
    onRefresh();
  }

  async function handleChamarAgora(chamado) {
    try {
      if (!confirm("Chamar este aluno agora e ignorar a ordem da fila?")) {
        return;
      }

      await chamarAgora(chamado.chamado_id, sessaoAtiva.id);
      await onRefresh();
    } catch (err) {
      console.error("Erro ao chamar agora:", err);
      alert("Erro ao chamar aluno.");
    }
  }

  function salvarTempoAtendimento() {
    const minutos = Number(tempoConfigMinutos);

    if (Number.isNaN(minutos) || minutos <= 0) {
      return;
    }

    const segundos = Math.round(minutos * 60);
    localStorage.setItem(STORAGE_KEY, String(segundos));
    setTempoAtendimentoSegundos(segundos);
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
    );
  }

  return (
    <div className="admin-stack">
      <div className="card session-banner">
        <div>
          <h2>{sessaoAtiva.turma?.apelido || sessaoAtiva.turma?.nome}</h2>
          <p className="muted">{sessaoAtiva.titulo || "Sessão em andamento"}</p>
        </div>

        <button className="danger" onClick={fecharSessao}>
          Encerrar sessão
        </button>
      </div>

      <div className="card atendimento-settings-card">
        <div className="section-header">
          <h2>Tempo padrão de atendimento</h2>
          <span className="badge">
            {Math.round(tempoAtendimentoSegundos / 60)} min
          </span>
        </div>

        <div className="tempo-config-row">
          <label className="tempo-config-label">
            Minutos
            <input
              type="number"
              min="1"
              step="1"
              value={tempoConfigMinutos}
              onChange={(e) => setTempoConfigMinutos(e.target.value)}
            />
          </label>

          <button type="button" onClick={salvarTempoAtendimento}>
            Salvar tempo
          </button>
        </div>
      </div>

      <div className="admin-main-grid">
        <div className="card atendimento-card">
          <div className="section-header">
            <h2>Em atendimento</h2>
            <TimerCard
              active={!!emAtendimento}
              startedAt={emAtendimento?.iniciado_atendimento_em || null}
              durationSeconds={tempoAtendimentoSegundos}
              compact
            />
          </div>

          {emAtendimento ? (
            <div className="atendimento-highlight">
              <div className="atendimento-name">
                {emAtendimento.nome_completo}
              </div>

              <p className="atendimento-problema destaque-pergunta">
                {emAtendimento.descricao_problema || "🔇"}
              </p>

              <div className="admin-actions">
                <button className="secondary" onClick={concluirProfessor}>
                  Finalizar
                </button>

                <button
                  className="secondary"
                  onClick={marcarVacuoEmAtendimento}
                >
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
                <div
                  className="queue-item admin-queue-item"
                  key={item.chamado_id}
                >
                  <div className="queue-pos">{index + 1}</div>

                  <div className="queue-main">
                    <strong>{item.nome_completo}</strong>
                    <p className="queue-problema-small destaque-pergunta">
                      {item.descricao_problema || "🔇"}
                    </p>
                  </div>

                  <div className="queue-meta">
                    <div className="inline-actions">
                      <button
                        className="ghost"
                        onClick={() => marcarVacuoNaFila(item.chamado_id)}
                      >
                        Ficou no vácuo
                      </button>

                      <button
                        className="ghost"
                        onClick={() => cancelar(item.chamado_id)}
                      >
                        Cancelar
                      </button>

                      {item.status === "aguardando" && (
                        <button
                          className="ghost"
                          onClick={() => handleChamarAgora(item)}
                        >
                          Chamar agora
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="admin-footer-actions">
            <button
              onClick={chamarProximo}
              disabled={!proximo || !!emAtendimento}
            >
              Chamar próximo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}