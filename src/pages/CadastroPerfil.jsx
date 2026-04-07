import { useEffect, useState } from 'react'
import { criarPerfil } from '../services/usuarios'
import { supabase } from '../lib/supabase'

export default function CadastroPerfil({ onDone }) {
  const [nome, setNome] = useState('')
  const [matricula, setMatricula] = useState('')
  const [turmas, setTurmas] = useState([])
  const [turmaId, setTurmaId] = useState('')

  const [loadingTurmas, setLoadingTurmas] = useState(true)
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')
  const [erroTurmas, setErroTurmas] = useState('')

  useEffect(() => {
    carregarTurmas()
  }, [])

  async function carregarTurmas() {
    try {
      setLoadingTurmas(true)
      setErroTurmas('')

      const { data, error } = await supabase
        .from('fila_turmas')
        .select('*')
        .order('apelido', { ascending: true })

      if (error) throw error

      setTurmas(data || [])
    } catch (err) {
      console.error('Erro ao carregar turmas:', err)
      setTurmas([])
      setErroTurmas('Não foi possível carregar as turmas.')
    } finally {
      setLoadingTurmas(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')

    if (!nome.trim()) {
      setErro('Informe o nome completo.')
      return
    }

    if (!matricula.trim()) {
      setErro('Informe a matrícula.')
      return
    }

    if (!turmaId) {
      setErro('Selecione a turma.')
      return
    }

    try {
      setSaving(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user?.id) {
        throw new Error('Usuário autenticado não encontrado.')
      }

      await criarPerfil({
        id: user.id,
        nome: nome.trim(),
        matricula: matricula.trim(),
        turma_id: turmaId,
      })

      await onDone?.()
    } catch (err) {
      console.error('Erro ao salvar perfil:', err)
      setErro(err.message || 'Não foi possível salvar o perfil.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card auth-card">
      <div className="section-header">
        <h2>Complete seu cadastro</h2>
        <p className="muted">Preencha seus dados para continuar no sistema.</p>
      </div>

      <form className="form" onSubmit={handleSubmit}>
        <label>
          Nome completo
          <input
            placeholder="Seu nome completo"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
          />
        </label>

        <label>
          Matrícula
          <input
            placeholder="Sua matrícula"
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
            disabled={loadingTurmas}
          >
            <option value="">
              {loadingTurmas ? 'Carregando turmas...' : 'Selecione a turma'}
            </option>

            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.apelido || t.nome}
              </option>
            ))}
          </select>
        </label>

        {erroTurmas && <p className="error">{erroTurmas}</p>}
        {erro && <p className="error">{erro}</p>}

        <button type="submit" disabled={saving || loadingTurmas}>
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </form>
    </div>
  )
}