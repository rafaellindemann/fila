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

export async function buscarUsuarioPorId(userId) {
  if (!userId) return null

  const { data, error } = await supabase
    .from('fila_usuarios')
    .select(`
      *,
      turma:fila_turmas (*)
    `)
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  return data || null
}

export async function buscarMeuUsuario() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) throw userError
  if (!user) return null

  return buscarUsuarioPorId(user.id)
}

export async function listarUsuariosDaTurma(turmaId) {
  const { data, error } = await supabase
    .from('fila_usuarios')
    .select('*')
    .eq('turma_id', turmaId)
    .eq('papel', 'aluno')
    .order('nome_completo')

  if (error) throw error
  return data || []
}