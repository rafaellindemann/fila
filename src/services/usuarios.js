import { supabase } from '../lib/supabase'

export async function criarPerfil({ id, nome, matricula, turma_id }) {
  const { error } = await supabase.from('fila_usuarios').insert({
    id,
    nome_completo: nome,
    matricula,
    turma_id,
  })

  if (error) throw error
}

export async function buscarMeuUsuario() {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data, error } = await supabase
    .from('fila_usuarios')
    .select(`
      *,
      turma:fila_turmas (*)
    `)
    .eq('id', user.id)
    .single()

  if (error) throw error
  return data
}

export async function listarUsuariosDaTurma(turmaId) {
  const { data, error } = await supabase
    .from('fila_usuarios')
    .select('*')
    .eq('turma_id', turmaId)

  if (error) throw error
  return data || []
}