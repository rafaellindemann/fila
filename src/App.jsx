import { useEffect, useMemo, useState } from 'react'
import './App.css'
import StudentForm from './components/StudentForm'
import QueueBoard from './components/QueueBoard'
import AdminLogin from './components/AdminLogin'
import AdminPanel from './components/AdminPanel'
import { listarFilaAtiva } from './services/chamados'
import { listarSessoesAtivas } from './services/sessoes'
import { supabase } from './services/supabase'

export default function App() {
  const [fila, setFila] = useState([])
  const [sessoes, setSessoes] = useState([])
  const [adminAuth, setAdminAuth] = useState(localStorage.getItem('fila_admin_auth') === 'true')
  const [aba, setAba] = useState('publico')

  const sessaoAtiva = useMemo(() => sessoes[0] || null, [sessoes])

  async function carregarTudo() {
    const [filaData, sessoesData] = await Promise.all([
      listarFilaAtiva(),
      listarSessoesAtivas(),
    ])
    setFila(filaData)
    setSessoes(sessoesData)
  }

  useEffect(() => {
    carregarTudo()
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel('fila-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fila_chamados' }, carregarTudo)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fila_sessoes' }, carregarTudo)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fila_alunos' }, carregarTudo)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fila_interacoes' }, carregarTudo)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  function logout() {
    localStorage.removeItem('fila_admin_auth')
    setAdminAuth(false)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>Fila de Atendimento</h1>
          <p className="muted">
            {sessaoAtiva
              ? `Sessão ativa: ${sessaoAtiva.turma?.apelido || sessaoAtiva.turma?.nome}${sessaoAtiva.titulo ? ` — ${sessaoAtiva.titulo}` : ''}`
              : 'Nenhuma sessão ativa no momento'}
          </p>
        </div>

        <nav className="tabs">
          <button className={aba === 'publico' ? 'active' : ''} onClick={() => setAba('publico')}>
            Painel
          </button>
          <button className={aba === 'aluno' ? 'active' : ''} onClick={() => setAba('aluno')}>
            Entrar na fila
          </button>
          <button className={aba === 'admin' ? 'active' : ''} onClick={() => setAba('admin')}>
            Admin
          </button>
        </nav>
      </header>

      <main className="main-grid">
        {aba === 'publico' && <QueueBoard fila={fila} />}

        {aba === 'aluno' && <StudentForm onRefresh={carregarTudo} />}

        {aba === 'admin' && (
          adminAuth ? (
            <>
              <div className="toolbar">
                <button className="secondary" onClick={logout}>Sair do admin</button>
              </div>
              <AdminPanel fila={fila} sessaoAtiva={sessaoAtiva} onRefresh={carregarTudo} />
            </>
          ) : (
            <AdminLogin onLogin={() => setAdminAuth(true)} />
          )
        )}
      </main>
    </div>
  )
}