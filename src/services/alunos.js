import { supabase } from './supabase'

export async function listarAlunos() {
  const { data, error } = await supabase
    .from('fila_alunos')
    .select(`
      *,
      turma:fila_turmas (
        id,
        nome,
        apelido
      )
    `)
    .order('nome_completo')

  if (error) throw error
  return data
}

export async function criarAluno({ matricula, nome_completo, turma_id }) {
  const { data, error } = await supabase
    .from('fila_alunos')
    .insert([{ matricula, nome_completo, turma_id }])
    .select(`
      *,
      turma:fila_turmas (
        id,
        nome,
        apelido
      )
    `)
    .single()

  if (error) throw error
  return data
}