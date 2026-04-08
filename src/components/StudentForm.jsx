import { useEffect, useMemo, useState } from 'react'
import { listarSessoesAtivas } from '../services/sessoes'
import {
  entrarNaFila,
  cancelarMeuChamado,
  buscarMeuChamado,
} from '../services/chamados'
import {
  registrarAjudaDoColega,
  registrarResolvidoSozinho,
} from '../services/interacoes'
import { listarUsuariosDaTurma } from '../services/usuarios'

export default function StudentForm({ onRefresh, usuario }) {
  const [sessoes, setSessoes] = useState([])
  const [meuChamado, setMeuChamado] = useState(null)
  const [colegas, setColegas] = useState([])

  const [descricao, setDescricao] = useState('')
  const [colegaId, setColegaId] = useState('')

  const [msg, setMsg] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    carregar()
  }, [usuario?.id])

  async function carregar() {
    try {
      setErro('')
      setCarregando(true)

      const [listaSessoes, chamado] = await Promise.all([
        listarSessoesAtivas(),
        buscarMeuChamado(),
      ])

      setSessoes(listaSessoes || [])
      setMeuChamado(chamado || null)

      if (usuario?.turma?.id) {
        const lista = await listarUsuariosDaTurma(usuario.turma.id)
        setColegas(lista || [])
      } else {
        setColegas([])
      }
    } catch (err) {
      setErro(err.message || 'Erro ao carregar dados do aluno.')
    } finally {
      setCarregando(false)
    }
  }

  const sessaoAtiva = sessoes[0] || null

  const colegasPossiveis = useMemo(() => {
    return colegas.filter((c) => c.id !== usuario?.id)
  }, [colegas, usuario])

  const podeAbrirChamado = useMemo(() => {
    if (!sessaoAtiva) return false
    if (!usuario?.turma?.id) return false
    return usuario.turma.id === sessaoAtiva.turma?.id
  }, [sessaoAtiva, usuario])

  async function handleEntrarNaFila(e) {
    e.preventDefault()
    setErro('')
    setMsg('')
    setLoading(true)

    try {
      if (meuChamado) {
        throw new Error('Você já possui um chamado ativo.')
      }

      if (!sessaoAtiva) {
        throw new Error('Não há sessão ativa no momento.')
      }

      if (!podeAbrirChamado) {
        throw new Error('Você só pode abrir chamado na sessão da sua turma.')
      }

      const chamado = await entrarNaFila({
        sessao_id: sessaoAtiva.id,
        perfil_id: usuario.id,
        descricao_problema: descricao,
      })

      setMeuChamado(chamado)
      setDescricao('')
      setMsg('Você entrou na fila com sucesso.')

      await carregar()
      onRefresh?.()
    } catch (err) {
      setErro(err.message || 'Erro ao entrar na fila.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCancelar() {
    setErro('')
    setMsg('')
    setLoading(true)

    try {
      await cancelarMeuChamado()
      setMeuChamado(null)
      setMsg('Chamado cancelado.')

      await carregar()
      onRefresh?.()
    } catch (err) {
      setErro(err.message || 'Erro ao cancelar chamado.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResolviSozinho() {
    setErro('')
    setMsg('')
    setLoading(true)

    try {
      await registrarResolvidoSozinho()
      setMeuChamado(null)
      setMsg('Marcado como resolvido.')

      await carregar()
      onRefresh?.()
    } catch (err) {
      setErro(err.message || 'Erro ao registrar resolução.')
    } finally {
      setLoading(false)
    }
  }

  async function handleFuiAjudado() {
    setErro('')
    setMsg('')
    setLoading(true)

    try {
      if (!colegaId) {
        throw new Error('Selecione o colega que ajudou.')
      }

      if (String(colegaId) === String(usuario.id)) {
        throw new Error('Você não pode selecionar a si mesmo.')
      }

      await registrarAjudaDoColega({
        resolvido_por_usuario_id: colegaId,
      })

      setMeuChamado(null)
      setColegaId('')
      setMsg('Ajuda registrada com sucesso.')

      await carregar()
      onRefresh?.()
    } catch (err) {
      setErro(err.message || 'Erro ao registrar ajuda do colega.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="student-stack">
      <div className="card student-hero-card">
        <div className="student-hero-top">
          <div>
            <h2>Meu acesso</h2>
            <p className="muted">
              Logado como <strong>{usuario.nome_completo}</strong>
            </p>
          </div>

          <span className="badge">
            {usuario?.turma?.apelido || usuario?.turma?.nome || 'Sem turma'}
          </span>
        </div>

        {sessaoAtiva ? (
          <div className="student-session-banner">
            <strong>Sessão ativa:</strong>{' '}
            {sessaoAtiva.turma?.apelido || sessaoAtiva.turma?.nome}
            {sessaoAtiva.titulo ? ` — ${sessaoAtiva.titulo}` : ''}
          </div>
        ) : (
          <div className="student-session-banner muted">
            Não há sessão ativa no momento.
          </div>
        )}

        {!podeAbrirChamado && sessaoAtiva && (
          <p className="error">Você não pertence à turma desta sessão.</p>
        )}
      </div>

      <div className="student-grid-2">
        <div className="card">
          <div className="section-header">
            <h2>Abrir chamado</h2>
            <span className="badge">
              {meuChamado ? 'Você já está na fila' : 'Novo chamado'}
            </span>
          </div>

          <form className="form" onSubmit={handleEntrarNaFila}>
            <label>
              Descreva sua dúvida
              <textarea
                rows="5"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                disabled={!!meuChamado || carregando || loading}
                placeholder="Ex.: erro no fetch, dúvida sobre map/filter, problema com useEffect..."
              />
            </label>

            {msg && <p className="success">{msg}</p>}
            {erro && <p className="error">{erro}</p>}

            <button
              type="submit"
              disabled={!podeAbrirChamado || !!meuChamado || loading || carregando}
            >
              {loading ? 'Enviando...' : 'Entrar na fila'}
            </button>
          </form>
        </div>

        <div className="card">
          <div className="section-header">
            <h2>Meu chamado</h2>
            {meuChamado && <span className={`status ${meuChamado.status}`}>{meuChamado.status}</span>}
          </div>

          {carregando ? (
            <p className="muted">Carregando...</p>
          ) : !meuChamado ? (
            <div className="empty-state">
              <p className="muted">Você não possui chamado ativo.</p>
            </div>
          ) : (
            <div className="form">
              <div className="destaque-pergunta">
                {meuChamado.descricao_problema || 'Sem descrição informada.'}
              </div>

              <div className="student-action-grid">
                <button
                  type="button"
                  className="secondary"
                  onClick={handleCancelar}
                  disabled={loading}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="secondary"
                  onClick={handleResolviSozinho}
                  disabled={loading}
                >
                  Resolvi sozinho
                </button>
              </div>

              <label>
                Fui ajudado por colega
                <select
                  value={colegaId}
                  onChange={(e) => setColegaId(e.target.value)}
                  disabled={loading}
                >
                  <option value="">Selecione</option>
                  {colegasPossiveis.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome_completo}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={handleFuiAjudado}
                disabled={loading || !colegaId}
              >
                Registrar ajuda
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}