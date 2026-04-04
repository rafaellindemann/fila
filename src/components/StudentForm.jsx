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

export default function StudentForm({
  onRefresh,
  usuario,
}) {
  const [sessoes, setSessoes] = useState([])
  const [meuChamado, setMeuChamado] = useState(null)
  const [colegas, setColegas] = useState([])

  const [descricao, setDescricao] = useState('')
  const [colegaId, setColegaId] = useState('')

  const [msg, setMsg] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    carregar()
  }, [])

  async function carregar() {
    try {
      const [listaSessoes, chamado] = await Promise.all([
        listarSessoesAtivas(),
        buscarMeuChamado(),
      ])

      setSessoes(listaSessoes)
      setMeuChamado(chamado)

      if (usuario?.turma?.id) {
        const lista = await listarUsuariosDaTurma(usuario.turma.id)
        setColegas(lista)
      }
    } catch (err) {
      setErro(err.message)
    }
  }

  const sessaoAtiva = sessoes[0] || null

  const colegasPossiveis = useMemo(() => {
    return colegas.filter((c) => c.id !== usuario.id)
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
      setErro(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCancelar() {
    setErro('')
    setMsg('')

    try {
      await cancelarMeuChamado()
      setMeuChamado(null)
      setMsg('Chamado cancelado.')

      await carregar()
      onRefresh?.()
    } catch (err) {
      setErro(err.message)
    }
  }

  async function handleResolviSozinho() {
    setErro('')
    setMsg('')

    try {
      await registrarResolvidoSozinho()
      setMeuChamado(null)
      setMsg('Marcado como resolvido.')

      await carregar()
      onRefresh?.()
    } catch (err) {
      setErro(err.message)
    }
  }

  async function handleFuiAjudado() {
    setErro('')
    setMsg('')

    try {
      if (!colegaId) {
        throw new Error('Selecione o colega que ajudou.')
      }

      if (String(colegaId) === String(usuario.id)) {
        throw new Error('Você não pode selecionar a si mesmo.')
      }

      await registrarAjudaDoColega({
        resolvido_por_usuario_id: Number(colegaId),
      })

      setMeuChamado(null)
      setColegaId('')
      setMsg('Ajuda registrada com sucesso.')

      await carregar()
      onRefresh?.()
    } catch (err) {
      setErro(err.message)
    }
  }

  return (
    <div className="student-layout">
      <div className="card">
        <h2>Abrir chamado</h2>

        <p className="muted">
          Você está como <strong>{usuario.nome_completo}</strong>
        </p>

        {sessaoAtiva ? (
          <p className="muted">
            Sessão ativa: <strong>{sessaoAtiva.turma?.apelido}</strong>
          </p>
        ) : (
          <p className="muted">
            Não há sessão ativa no momento.
          </p>
        )}

        {!podeAbrirChamado && sessaoAtiva && (
          <p className="error">
            Você não pertence à turma desta sessão.
          </p>
        )}

        <form className="form" onSubmit={handleEntrarNaFila}>
          <label>
            Descreva sua dúvida
            <textarea
              rows="3"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              disabled={!!meuChamado}
              placeholder="Opcional"
            />
          </label>

          {msg && <p className="success">{msg}</p>}
          {erro && <p className="error">{erro}</p>}

          <button
            type="submit"
            disabled={!podeAbrirChamado || !!meuChamado || loading}
          >
            Entrar na fila
          </button>
        </form>
      </div>

      <div className="card">
        <h2>Meu chamado</h2>

        {!meuChamado ? (
          <p className="muted">Você não possui chamado ativo.</p>
        ) : (
          <div className="form">
            <p><strong>Status:</strong> {meuChamado.status}</p>
            <p><strong>Descrição:</strong> {meuChamado.descricao_problema || 'Sem descrição'}</p>

            <button className="secondary" onClick={handleCancelar}>
              Cancelar
            </button>

            <button className="secondary" onClick={handleResolviSozinho}>
              Resolvi sozinho
            </button>

            <label>
              Fui ajudado por colega
              <select
                value={colegaId}
                onChange={(e) => setColegaId(e.target.value)}
              >
                <option value="">Selecione</option>
                {colegasPossiveis.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome_completo}
                  </option>
                ))}
              </select>
            </label>

            <button onClick={handleFuiAjudado}>
              Registrar ajuda
            </button>
          </div>
        )}
      </div>
    </div>
  )
}