import { supabase } from '../lib/supabase'

const STORAGE_KEY = 'fila_chamado_ativo'

function gerarTokenEdicao() {
  return crypto.randomUUID()
}

export function salvarChamadoLocal({ chamadoId, token }) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      chamadoId,
      token,
    })
  )
}

export function lerChamadoLocal() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function limparChamadoLocal() {
  localStorage.removeItem(STORAGE_KEY)
}

export async function listarFilaAtiva() {
  const { data, error } = await supabase
    .from('fila_view_fila_ativa')
    .select('*')

  if (error) throw error
  return data
}

export async function entrarNaFila({ sessao_id, aluno_id, descricao_problema }) {
  const token_edicao = gerarTokenEdicao()

  const { data, error } = await supabase
    .from('fila_chamados')
    .insert([{
      sessao_id,
      aluno_id,
      descricao_problema: descricao_problema?.trim() || null,
      status: 'aguardando',
      token_edicao,
    }])
    .select()
    .single()

  if (error) throw error

  salvarChamadoLocal({
    chamadoId: data.id,
    token: token_edicao,
  })

  return data
}

export async function iniciarAtendimento(chamadoId) {
  const { data, error } = await supabase
    .from('fila_chamados')
    .update({
      status: 'em_atendimento',
      iniciado_atendimento_em: new Date().toISOString(),
    })
    .eq('id', chamadoId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function finalizarChamado(chamadoId) {
  const { data, error } = await supabase
    .from('fila_chamados')
    .update({
      status: 'finalizado',
      finalizado_em: new Date().toISOString(),
    })
    .eq('id', chamadoId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function cancelarChamadoAdmin(chamadoId) {
  const { data, error } = await supabase
    .from('fila_chamados')
    .update({
      status: 'cancelado',
      finalizado_em: new Date().toISOString(),
    })
    .eq('id', chamadoId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function cancelarMeuChamado() {
  const meuChamado = lerChamadoLocal()
  if (!meuChamado) throw new Error('Nenhum chamado ativo encontrado neste dispositivo.')

  const { data, error } = await supabase
    .from('fila_chamados')
    .update({
      status: 'cancelado',
      finalizado_em: new Date().toISOString(),
    })
    .eq('id', meuChamado.chamadoId)
    .eq('token_edicao', meuChamado.token)
    .in('status', ['aguardando', 'em_atendimento'])
    .select()
    .single()

  if (error) throw error

  limparChamadoLocal()
  return data
}

export async function buscarMeuChamado() {
  const meuChamado = lerChamadoLocal()
  if (!meuChamado) return null

  const { data, error } = await supabase
    .from('fila_chamados')
    .select('*')
    .eq('id', meuChamado.chamadoId)
    .eq('token_edicao', meuChamado.token)
    .maybeSingle()

  if (error) throw error

  if (!data || ['finalizado', 'cancelado'].includes(data.status)) {
    limparChamadoLocal()
    return null
  }

  return data
}