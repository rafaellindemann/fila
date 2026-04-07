import { useEffect, useMemo, useState } from 'react'
import './App.css'

import QueueBoard from './components/QueueBoard'
import StudentForm from './components/StudentForm'
import AdminPanel from './components/AdminPanel'
import AuthForm from './components/AuthForm'
import CadastroPerfil from './pages/CadastroPerfil'

import { listarFilaAtiva } from './services/chamados'
import { listarSessoesAtivas } from './services/sessoes'
import { buscarMeuUsuario } from './services/usuarios'
import { getSession, onAuthStateChange, signOut } from './services/auth'
import { supabase } from './lib/supabase'

export default function App() {
  const [fila, setFila] = useState([])
  const [sessoes, setSessoes] = useState([])

  const [session, setSession] = useState(null)
  const [usuario, setUsuario] = useState(null)

  const [authLoading, setAuthLoading] = useState(true)
  const [appLoading, setAppLoading] = useState(true)

  const [aba, setAba] = useState('publico')

  const sessaoAtiva = useMemo(() => sessoes[0] || null, [sessoes])
  const isAdmin = usuario?.papel === 'admin'

  async function carregarTudo() {
    try {
      const [filaData, sessoesData] = await Promise.all([
        listarFilaAtiva(),
        listarSessoesAtivas(),
      ])

      setFila(filaData || [])
      setSessoes(sessoesData || [])
    } catch (err) {
      console.error('Erro ao carregar dados da fila:', err)
    } finally {
      setAppLoading(false)
    }
  }

async function carregarAuth() {
  try {
    /// *** debug
    console.log('antes getSession')
const sessao = await getSession()
console.log('depois getSession', sessao)

if (sessao?.user) {
  console.log('antes buscarMeuUsuario')
  const meuUsuario = await buscarMeuUsuario()
  console.log('depois buscarMeuUsuario', meuUsuario)
}
    /// *** debug




    console.log('Iniciando carregarAuth...')

    // const sessao = await getSession()
    // console.log('Sessão:', sessao)

    // setSession(sessao)

    // if (sessao?.user) {
    //   const meuUsuario = await buscarMeuUsuario()
    //   console.log('Usuário do sistema:', meuUsuario)
    //   setUsuario(meuUsuario || null)
    // } else {
    //   setUsuario(null)
    // }
  } catch (err) {
    console.error('Erro ao carregar autenticação:', err)
    setSession(null)
    setUsuario(null)
  } finally {
    console.log('Finalizando authLoading')
    setAuthLoading(false)
  }
}

  useEffect(() => {
    carregarAuth()
    carregarTudo()
  }, [])

useEffect(() => {
  const {
    data: { subscription },
  } = onAuthStateChange(async (_event, sessao) => {
    console.log('Auth state mudou:', _event, sessao)

    setSession(sessao)

    if (sessao?.user) {
      try {
        const meuUsuario = await buscarMeuUsuario()
        setUsuario(meuUsuario || null)
      } catch (err) {
        console.error('Erro ao buscar usuário autenticado:', err)
        setUsuario(null)
      }
    } else {
      setUsuario(null)
    }

    setAuthLoading(false)
  })

  return () => {
    subscription.unsubscribe()
  }
}, [])

  useEffect(() => {
    let ativo = true

    const recarregar = async () => {
      if (!ativo) return
      await carregarTudo()
    }

    const channel = supabase
      .channel('fila-realtime-global')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fila_chamados' }, recarregar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fila_sessoes' }, recarregar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fila_interacoes' }, recarregar)
      .subscribe((status) => {
        console.log('STATUS REALTIME:', status)
      })

    return () => {
      ativo = false
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    const intervalId = setInterval(() => {
      carregarTudo()
    }, 5000)

    return () => clearInterval(intervalId)
  }, [])

  useEffect(() => {
    if (isAdmin && aba !== 'publico' && aba !== 'aluno' && aba !== 'admin') {
      setAba('publico')
    }

    if (!isAdmin && aba === 'admin') {
      setAba('publico')
    }
  }, [aba, isAdmin])

  async function handleLogout() {
    try {
      await signOut()
      setSession(null)
      setUsuario(null)
      setAba('publico')
    } catch (err) {
      console.error('Erro ao sair:', err)
    }
  }

  if (authLoading) {
    return (
      <div className="app-shell">
        <div className="card">
          <p>Carregando autenticação...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="app-shell">
        <header className="topbar">
          <div>
            <h1>Fila de Atendimento</h1>
            <p className="muted">Entre para usar o sistema.</p>
          </div>
        </header>

        <main className="main-grid">
          <AuthForm onAuthSuccess={carregarAuth} />
        </main>
      </div>
    )
  }

  if (session && !usuario) {
    return (
      <div className="app-shell">
        <header className="topbar">
          <div>
            <h1>Fila de Atendimento</h1>
            <p className="muted">Complete seu cadastro para continuar.</p>
          </div>

          <div className="toolbar">
            <button className="secondary" onClick={handleLogout}>
              Sair
            </button>
          </div>
        </header>

        <main className="main-grid">
          <CadastroPerfil onDone={carregarAuth} />
        </main>
      </div>
    )
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

          <p className="muted">
            Logado como <strong>{usuario.nome_completo}</strong>
            {isAdmin ? ' (admin)' : ''}
          </p>
        </div>

        <nav className="tabs">
          <button
            className={aba === 'publico' ? 'active' : ''}
            onClick={() => setAba('publico')}
          >
            Painel
          </button>

          <button
            className={aba === 'aluno' ? 'active' : ''}
            onClick={() => setAba('aluno')}
          >
            Meu chamado
          </button>

          {isAdmin && (
            <button
              className={aba === 'admin' ? 'active' : ''}
              onClick={() => setAba('admin')}
            >
              Admin
            </button>
          )}

          <button className="secondary" onClick={handleLogout}>
            Sair
          </button>
        </nav>
      </header>

      <main className="main-grid">
        {appLoading ? (
          <div className="card">
            <p>Carregando fila...</p>
          </div>
        ) : (
          <>
            {aba === 'publico' && <QueueBoard fila={fila} />}

            {aba === 'aluno' && (
              <StudentForm
                onRefresh={carregarTudo}
                usuario={usuario}
              />
            )}

            {aba === 'admin' && isAdmin && (
              <AdminPanel
                fila={fila}
                sessaoAtiva={sessaoAtiva}
                onRefresh={carregarTudo}
                usuario={usuario}
              />
            )}
          </>
        )}
      </main>
    </div>
  )
}