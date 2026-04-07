import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

import QueueBoard from './components/QueueBoard'
import StudentForm from './components/StudentForm'
import AdminPanel from './components/AdminPanel'
import AuthForm from './components/AuthForm'
import CadastroPerfil from './pages/CadastroPerfil'

import { listarFilaAtiva, limparChamadoLocal } from './services/chamados'
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
  const [perfilChecked, setPerfilChecked] = useState(false)
  const [appLoading, setAppLoading] = useState(true)

  const [aba, setAba] = useState('publico')
  const [loadingMsg, setLoadingMsg] = useState('Carregando autenticação...')
  const [resettingSession, setResettingSession] = useState(false)

  const authBootstrapRef = useRef(false)

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

  async function carregarPerfilUsuario() {
    try {
      setPerfilChecked(false)
      setLoadingMsg('Carregando perfil do usuário...')

      const meuUsuario = await buscarMeuUsuario()
      setUsuario(meuUsuario || null)

      return meuUsuario || null
    } catch (err) {
      console.error('Erro ao buscar perfil do usuário:', err)
      setUsuario(null)
      return null
    } finally {
      setPerfilChecked(true)
    }
  }

  async function bootstrapAuth() {
    try {
      setAuthLoading(true)
      setPerfilChecked(false)
      setLoadingMsg('Carregando autenticação...')

      const sessao = await getSession()
      setSession(sessao)

      if (!sessao?.user) {
        setUsuario(null)
        setPerfilChecked(true)
        return
      }

      await carregarPerfilUsuario()
    } catch (err) {
      console.error('Erro ao carregar autenticação:', err)
      setSession(null)
      setUsuario(null)
      setPerfilChecked(true)
    } finally {
      setAuthLoading(false)
      setLoadingMsg('Carregando autenticação...')
    }
  }

  function limparStoragesDoSupabase() {
    const prefixes = ['sb-', 'supabase']
    const storageKeys = []

    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (!key) continue

      const lowerKey = key.toLowerCase()
      if (prefixes.some((prefix) => lowerKey.includes(prefix))) {
        storageKeys.push(key)
      }
    }

    storageKeys.forEach((key) => localStorage.removeItem(key))

    const sessionStorageKeys = []
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i)
      if (!key) continue

      const lowerKey = key.toLowerCase()
      if (prefixes.some((prefix) => lowerKey.includes(prefix))) {
        sessionStorageKeys.push(key)
      }
    }

    sessionStorageKeys.forEach((key) => sessionStorage.removeItem(key))
  }

  async function handleResetSessao() {
    try {
      setResettingSession(true)

      try {
        await signOut()
      } catch (err) {
        console.warn('Falha ao encerrar sessão remotamente, limpando sessão local.', err)
      }

      limparChamadoLocal()
      limparStoragesDoSupabase()

      setSession(null)
      setUsuario(null)
      setPerfilChecked(true)
      setAuthLoading(false)
      setAba('publico')

      window.location.reload()
    } catch (err) {
      console.error('Erro ao resetar sessão:', err)
    } finally {
      setResettingSession(false)
    }
  }

  useEffect(() => {
    if (authBootstrapRef.current) return
    authBootstrapRef.current = true

    let ativo = true

    const timeoutId = setTimeout(() => {
      if (!ativo) return

      console.warn('Timeout de autenticação acionado.')
      setLoadingMsg('A autenticação está demorando mais do que o esperado.')
      setAuthLoading(false)
      setPerfilChecked(true)
    }, 8000)

    bootstrapAuth().finally(() => {
      clearTimeout(timeoutId)
    })

    carregarTudo()

    return () => {
      ativo = false
      clearTimeout(timeoutId)
    }
  }, [])

  useEffect(() => {
    const {
      data: { subscription },
    } = onAuthStateChange(async (event, sessao) => {
      console.log('Auth state mudou:', event, sessao)

      setSession(sessao)

      if (!sessao?.user) {
        setUsuario(null)
        setPerfilChecked(true)
        setAba('publico')
        return
      }

      await carregarPerfilUsuario()
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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fila_chamados' },
        recarregar
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fila_sessoes' },
        recarregar
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fila_interacoes' },
        recarregar
      )
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
      limparChamadoLocal()
      setSession(null)
      setUsuario(null)
      setPerfilChecked(true)
      setAba('publico')
    } catch (err) {
      console.error('Erro ao sair:', err)
    }
  }

  if (authLoading) {
    return (
      <div className="app-shell">
        <div className="card">
          <h2>Autenticação</h2>
          <p>{loadingMsg}</p>

          <div className="toolbar" style={{ marginTop: '1rem' }}>
            <button
              type="button"
              className="secondary"
              onClick={handleResetSessao}
              disabled={resettingSession}
            >
              {resettingSession ? 'Limpando sessão...' : 'Cancelar e voltar ao login'}
            </button>
          </div>
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
          <AuthForm />
        </main>
      </div>
    )
  }

  if (!perfilChecked) {
    return (
      <div className="app-shell">
        <div className="card">
          <h2>Perfil</h2>
          <p>Carregando perfil do usuário...</p>

          <div className="toolbar" style={{ marginTop: '1rem' }}>
            <button
              type="button"
              className="secondary"
              onClick={handleResetSessao}
              disabled={resettingSession}
            >
              {resettingSession ? 'Limpando sessão...' : 'Cancelar e voltar ao login'}
            </button>
          </div>
        </div>
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
          <CadastroPerfil
            onDone={async () => {
              await carregarPerfilUsuario()
            }}
          />
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