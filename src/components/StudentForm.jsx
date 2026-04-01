import { useEffect, useMemo, useState } from 'react'
import { listarAlunos, criarAluno } from '../services/alunos'
import { listarTurmasAtivas } from '../services/turmas'
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

export default function StudentForm({
  onRefresh,
  cadastroAlunoAberto,
  setCadastroAlunoAberto,
}) {
  const [alunos, setAlunos] = useState([])
  const [turmas, setTurmas] = useState([])
  const [sessoes, setSessoes] = useState([])
  const [meuChamado, setMeuChamado] = useState(null)

  const [alunoId, setAlunoId] = useState('')
  const [descricao, setDescricao] = useState('')
  const [colegaId, setColegaId] = useState('')

  const [nome, setNome] = useState('')
  const [matricula, setMatricula] = useState('')
  const [turmaId, setTurmaId] = useState('')

  const [msg, setMsg] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    carregar()
  }, [])

  useEffect(() => {
    if (cadastroAlunoAberto) {
      carregar()
    }
  }, [cadastroAlunoAberto])

  async function carregar() {
    try {
      const [listaAlunos, listaTurmas, listaSessoes, chamado] = await Promise.all([
        listarAlunos(),
        listarTurmasAtivas(),
        listarSessoesAtivas(),
        buscarMeuChamado(),
      ])

      setAlunos(listaAlunos)
      setTurmas(listaTurmas)
      setSessoes(listaSessoes)
      setMeuChamado(chamado)
    } catch (err) {
      setErro(err.message)
    }
  }

  const sessaoAtiva = sessoes[0] || null

  const alunoSelecionado = useMemo(() => {
    return alunos.find((aluno) => String(aluno.id) === String(alunoId)) || null
  }, [alunos, alunoId])

  const alunosDaTurmaDaSessao = useMemo(() => {
    if (!sessaoAtiva?.turma?.id) return []
    return alunos.filter((aluno) => aluno.turma?.id === sessaoAtiva.turma.id)
  }, [alunos, sessaoAtiva])

  const colegasPossiveis = useMemo(() => {
    if (!sessaoAtiva?.turma?.id) return []

    return alunos.filter((aluno) => {
      const mesmaTurma = aluno.turma?.id === sessaoAtiva.turma.id
      const naoEhEleMesmo = alunoSelecionado ? aluno.id !== alunoSelecionado.id : true

      return mesmaTurma && naoEhEleMesmo
    })
  }, [alunos, sessaoAtiva, alunoSelecionado])

  async function handleCadastrarAluno(e) {
    e.preventDefault()
    setErro('')
    setMsg('')

    try {
      const novoAluno = await criarAluno({
        nome_completo: nome,
        matricula,
        turma_id: Number(turmaId),
      })

      await carregar()

      setAlunoId(String(novoAluno.id))
      setNome('')
      setMatricula('')
      setTurmaId('')
      setCadastroAlunoAberto(false)
      setMsg('Aluno cadastrado com sucesso.')
    } catch (err) {
      setErro(err.message)
    }
  }

  async function handleEntrarNaFila(e) {
    e.preventDefault()
    setErro('')
    setMsg('')
    setLoading(true)

    try {
      if (meuChamado) {
        throw new Error('Este dispositivo já possui um chamado ativo.')
      }

      if (!sessaoAtiva) {
        throw new Error('Não há sessão ativa no momento.')
      }

      if (!alunoId) {
        throw new Error('Selecione um aluno cadastrado.')
      }

      if (!alunoSelecionado) {
        throw new Error('Aluno selecionado não encontrado.')
      }

      if (alunoSelecionado.turma?.id !== sessaoAtiva.turma?.id) {
        throw new Error('Você só pode abrir chamado na sessão da sua própria turma.')
      }

      const chamado = await entrarNaFila({
        sessao_id: sessaoAtiva.id,
        aluno_id: Number(alunoId),
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
      setMsg('Seu chamado foi cancelado.')
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
      setMsg('Chamado encerrado como resolvido por você.')
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

      if (String(colegaId) === String(alunoId)) {
        throw new Error('Você não pode selecionar a si mesmo como ajudante.')
      }

      await registrarAjudaDoColega({
        resolvido_por_aluno_id: Number(colegaId),
      })

      setMeuChamado(null)
      setColegaId('')
      setMsg('Chamado encerrado com ajuda de colega registrada.')
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

        {sessaoAtiva ? (
          <p className="muted">
            Sessão ativa: <strong>{sessaoAtiva.turma?.apelido || sessaoAtiva.turma?.nome}</strong>
          </p>
        ) : (
          <p className="muted">
            Você pode se cadastrar normalmente, mas só poderá abrir chamado quando houver sessão ativa.
          </p>
        )}

        <form className="form" onSubmit={handleEntrarNaFila}>
          <div className="field-header">
            <label htmlFor="aluno-select">Aluno</label>

            <button
              type="button"
              className="icon-button"
              onClick={() => setCadastroAlunoAberto(true)}
              title="Cadastrar aluno"
              aria-label="Cadastrar aluno"
            >
              <span aria-hidden="true">👤➕</span>
            </button>
          </div>

          <select
            id="aluno-select"
            value={alunoId}
            onChange={(e) => setAlunoId(e.target.value)}
            disabled={!!meuChamado}
            required
          >
            <option value="">Selecione seu nome</option>
            {alunosDaTurmaDaSessao.length > 0
              ? alunosDaTurmaDaSessao.map((aluno) => (
                  <option key={aluno.id} value={aluno.id}>
                    {aluno.nome_completo}
                  </option>
                ))
              : alunos.map((aluno) => (
                  <option key={aluno.id} value={aluno.id}>
                    {aluno.nome_completo}
                  </option>
                ))}
          </select>

          <label>
            Descreva rapidamente a dúvida
            <textarea
              rows="3"
              maxLength="300"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Opcional"
              disabled={!!meuChamado}
            />
          </label>

          {msg && <p className="success">{msg}</p>}
          {erro && <p className="error">{erro}</p>}

          <button
            type="submit"
            disabled={!sessaoAtiva || !!meuChamado || loading}
          >
            Entrar na fila
          </button>
        </form>
      </div>

      <div className="card">
        <h2>Meu chamado</h2>

        {!meuChamado ? (
          <p className="muted">Este dispositivo não possui chamado ativo.</p>
        ) : (
          <div className="form">
            <p><strong>Status:</strong> {meuChamado.status}</p>
            <p><strong>Descrição:</strong> {meuChamado.descricao_problema || 'Sem descrição.'}</p>

            <button type="button" className="secondary" onClick={handleCancelar}>
              Não preciso mais / cancelar
            </button>

            <button type="button" className="secondary" onClick={handleResolviSozinho}>
              Resolvi sozinho
            </button>

            <label>
              Fui ajudado por colega
              <select value={colegaId} onChange={(e) => setColegaId(e.target.value)}>
                <option value="">Selecione quem ajudou</option>
                {colegasPossiveis.map((aluno) => (
                  <option key={aluno.id} value={aluno.id}>
                    {aluno.nome_completo}
                  </option>
                ))}
              </select>
            </label>

            <button type="button" onClick={handleFuiAjudado}>
              Registrar ajuda do colega
            </button>
          </div>
        )}
      </div>

      {cadastroAlunoAberto && (
        <div
          className="modal-backdrop"
          onClick={() => setCadastroAlunoAberto(false)}
        >
          <div
            className="modal card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="section-header">
              <h2>Cadastro de aluno</h2>
              <button
                type="button"
                className="ghost"
                onClick={() => setCadastroAlunoAberto(false)}
              >
                Fechar
              </button>
            </div>

            <form className="form" onSubmit={handleCadastrarAluno}>
              <label>
                Nome completo
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                />
              </label>

              <label>
                Matrícula
                <input
                  value={matricula}
                  onChange={(e) => setMatricula(e.target.value)}
                  required
                />
              </label>

              <label>
                Turma
                <select
                  value={turmaId}
                  onChange={(e) => setTurmaId(e.target.value)}
                  required
                >
                  <option value="">
                    {turmas.length === 0 ? 'Carregando turmas...' : 'Selecione a turma'}
                  </option>
                  {turmas.map((turma) => (
                    <option key={turma.id} value={turma.id}>
                      {turma.apelido} — {turma.nome}
                    </option>
                  ))}
                </select>
              </label>

              <button type="submit">Salvar cadastro</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}