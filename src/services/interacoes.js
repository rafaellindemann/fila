import { supabase } from '../lib/supabase'
import { lerChamadoLocal, limparChamadoLocal } from './chamados'

export async function registrarInteracao({
  chamado_id,
  tipo_resultado,
  resolvido_por_aluno_id = null,
  duracao_atendimento_segundos = null,
  comentario = null,
}) {
  const { data, error } = await supabase
    .from('fila_interacoes')
    .insert([{
      chamado_id,
      tipo_resultado,
      resolvido_por_aluno_id,
      duracao_atendimento_segundos,
      comentario,
    }])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function registrarAjudaDoColega({ resolvido_por_aluno_id }) {
  const meuChamado = lerChamadoLocal()
  if (!meuChamado) throw new Error('Nenhum chamado ativo encontrado neste dispositivo.')

  const { data: chamado, error: erroChamado } = await supabase
    .from('fila_chamados')
    .update({
      status: 'finalizado',
      finalizado_em: new Date().toISOString(),
    })
    .eq('id', meuChamado.chamadoId)
    .eq('token_edicao', meuChamado.token)
    .in('status', ['aguardando', 'em_atendimento'])
    .select()
    .single()

  if (erroChamado) throw erroChamado

  const { data, error } = await supabase
    .from('fila_interacoes')
    .insert([{
      chamado_id: chamado.id,
      tipo_resultado: 'ajudado_colega',
      resolvido_por_aluno_id,
    }])
    .select()
    .single()

  if (error) throw error

  limparChamadoLocal()
  return data
}

export async function registrarResolvidoSozinho() {
  const meuChamado = lerChamadoLocal()
  if (!meuChamado) throw new Error('Nenhum chamado ativo encontrado neste dispositivo.')

  const { data: chamado, error: erroChamado } = await supabase
    .from('fila_chamados')
    .update({
      status: 'finalizado',
      finalizado_em: new Date().toISOString(),
    })
    .eq('id', meuChamado.chamadoId)
    .eq('token_edicao', meuChamado.token)
    .in('status', ['aguardando', 'em_atendimento'])
    .select()
    .single()

  if (erroChamado) throw erroChamado

  const { data, error } = await supabase
    .from('fila_interacoes')
    .insert([{
      chamado_id: chamado.id,
      tipo_resultado: 'resolveu_sozinho',
    }])
    .select()
    .single()

  if (error) throw error

  limparChamadoLocal()
  return data
}