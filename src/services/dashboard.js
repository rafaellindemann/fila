import { supabase } from '../lib/supabase'

export async function listarResumoTurmas() {
  const { data, error } = await supabase
    .from('fila_dashboard_turmas_resumo')
    .select('*')
    .order('turma_apelido')

  if (error) throw error
  return data || []
}

export async function listarFechamentosTurmas() {
  const { data, error } = await supabase
    .from('fila_dashboard_turmas_fechamentos')
    .select('*')

  if (error) throw error
  return data || []
}

export async function listarResumoAlunosDaTurma(turmaId) {
  const { data, error } = await supabase
    .from('fila_dashboard_alunos_resumo')
    .select('*')
    .eq('turma_id', turmaId)
    .order('nome_completo')

  if (error) throw error
  return data || []
}

export async function listarFechamentosDaTurma(turmaId) {
  const { data, error } = await supabase
    .from('fila_dashboard_turmas_fechamentos')
    .select('*')
    .eq('turma_id', turmaId)

  if (error) throw error
  return data || []
}