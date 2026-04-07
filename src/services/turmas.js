import { supabase } from '../lib/supabase'

export async function listarTurmasAtivas() {
  const { data, error } = await supabase
    .from('fila_turmas')
    .select('*')
    .eq('ativa', true)
    .order('apelido')

  if (error) throw error
  return data
}