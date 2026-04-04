import { useEffect, useState } from 'react'
import { criarPerfil } from '../services/usuarios'
import { supabase } from '../lib/supabase'

export default function CadastroPerfil({ onDone }) {
  const [nome, setNome] = useState('')
  const [matricula, setMatricula] = useState('')
  const [turmas, setTurmas] = useState([])
  const [turmaId, setTurmaId] = useState('')

  useEffect(() => {
    carregarTurmas()
  }, [])

  async function carregarTurmas() {
    const { data } = await supabase.from('fila_turmas').select('*')
    setTurmas(data || [])
  }

  async function handleSubmit(e) {
    e.preventDefault()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    await criarPerfil({
      id: user.id,
      nome,
      matricula,
      turma_id: turmaId,
    })

    onDone()
  }

  return (
    <div>
      <h1>Complete seu cadastro</h1>

      <form onSubmit={handleSubmit}>
        <input
          placeholder="Nome completo"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />

        <input
          placeholder="Matrícula"
          value={matricula}
          onChange={(e) => setMatricula(e.target.value)}
        />

        <select
          value={turmaId}
          onChange={(e) => setTurmaId(e.target.value)}
        >
          <option value="">Selecione a turma</option>

          {turmas.map((t) => (
            <option key={t.id} value={t.id}>
              {t.apelido}
            </option>
          ))}
        </select>

        <button>Salvar</button>
      </form>
    </div>
  )
}