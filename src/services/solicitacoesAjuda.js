import { supabase } from '../lib/supabase'
import { limparChamadoLocal } from './chamados'

export async function solicitarConfirmacaoAjuda({ chamado_id, solicitado_por_usuario_id }) {
  const { data, error } = await supabase
    .from('fila_solicitacoes_ajuda')
    .insert([{ chamado_id, solicitado_por_usuario_id }])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function listarSolicitacoesPendentesDoChamado(chamado_id) {
  if (!chamado_id) return []

  const { data, error } = await supabase
    .from('fila_solicitacoes_ajuda')
    .select(`
      *,
      ajudador:fila_usuarios!fila_solicitacoes_ajuda_solicitado_por_usuario_id_fkey (
        id,
        nome_completo,
        matricula
      )
    `)
    .eq('chamado_id', chamado_id)
    .eq('status', 'pendente')
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

export async function aceitarSolicitacaoAjuda(solicitacao) {
  const agora = new Date().toISOString()

  const { data: solicitacaoAtualizada, error: erroSolicitacao } = await supabase
    .from('fila_solicitacoes_ajuda')
    .update({
      status: 'aceita',
      respondido_em: agora,
    })
    .eq('id', solicitacao.id)
    .eq('status', 'pendente')
    .select()
    .single()

  if (erroSolicitacao) throw erroSolicitacao

  const { error: erroChamado } = await supabase
    .from('fila_chamados')
    .update({
      status: 'finalizado',
      finalizado_em: agora,
    })
    .eq('id', solicitacao.chamado_id)
    .in('status', ['aguardando', 'em_atendimento'])

  if (erroChamado) throw erroChamado

  const { data: interacao, error: erroInteracao } = await supabase
    .from('fila_interacoes')
    .insert([
      {
        chamado_id: solicitacao.chamado_id,
        tipo_resultado: 'ajudado_colega',
        resolvido_por_usuario_id: solicitacao.solicitado_por_usuario_id,
      },
    ])
    .select()
    .single()

  if (erroInteracao) throw erroInteracao

  await supabase
    .from('fila_solicitacoes_ajuda')
    .update({
      status: 'cancelada',
      respondido_em: agora,
    })
    .eq('chamado_id', solicitacao.chamado_id)
    .eq('status', 'pendente')
    .neq('id', solicitacao.id)

  limparChamadoLocal()

  return {
    solicitacao: solicitacaoAtualizada,
    interacao,
  }
}

export async function recusarSolicitacaoAjuda(solicitacaoId) {
  const { data, error } = await supabase
    .from('fila_solicitacoes_ajuda')
    .update({
      status: 'recusada',
      respondido_em: new Date().toISOString(),
    })
    .eq('id', solicitacaoId)
    .eq('status', 'pendente')
    .select()
    .single()

  if (error) throw error
  return data
}