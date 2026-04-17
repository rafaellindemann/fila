import { supabase } from '../lib/supabase'

export async function listarSessoesAtivas() {
  const { data, error } = await supabase
    .from('fila_sessoes')
    .select(`
      *,
      turma:fila_turmas (
        id,
        nome,
        apelido
      )
    `)
    .eq('ativa', true)
    .order('iniciada_em', { ascending: false })

  if (error) throw error
  return data
}

export async function criarSessao({ turma_id, titulo }) {
  const { data, error } = await supabase
    .from('fila_sessoes')
    .insert([{ turma_id, titulo, ativa: true }])
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

export async function encerrarSessao(id) {
  const { data, error } = await supabase
    .from('fila_sessoes')
    .update({
      ativa: false,
      encerrada_em: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}