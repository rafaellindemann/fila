import { useEffect, useState } from 'react'
import { getSession } from './services/auth'
import { buscarMeuPerfil } from './services/usuarios'

import AuthPage from './pages/AuthPage'
import CadastroPerfil from './pages/CadastroPerfil'
import Dashboard from './pages/Dashboard'

function App() {
  const [session, setSession] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    init()
  }, [])

  async function init() {
    const sess = await getSession()
    setSession(sess)

    if (sess) {
      const p = await buscarMeuPerfil()
      setPerfil(p)
    }

    setLoading(false)
  }

  if (loading) return <p>Carregando...</p>

  if (!session) return <AuthPage onLogin={init} />

  if (!perfil) return <CadastroPerfil onDone={init} />

  return <Dashboard usuario={perfil} />
}

export default App

// import { useEffect, useMemo, useState } from 'react'
// import './App.css'
// import StudentForm from './components/StudentForm'
// import QueueBoard from './components/QueueBoard'
// import AdminPanel from './components/AdminPanel'
// import AuthForm from './components/AuthForm'
// import { listarFilaAtiva } from './services/chamados'
// import { listarSessoesAtivas } from './services/sessoes'
// import { supabase } from './services/supabase'
// import { getSession, onAuthStateChange, signOut } from './services/auth'
// import { buscarMeuUsuario } from './services/usuarios'

// export default function App() {
//   const [fila, setFila] = useState([])
//   const [sessoes, setSessoes] = useState([])
//   const [aba, setAba] = useState('publico')
//   const [cadastroAlunoAberto, setCadastroAlunoAberto] = useState(false)

//   const [session, setSession] = useState(null)
//   const [usuario, setUsuario] = useState(null)
//   const [authLoading, setAuthLoading] = useState(true)

//   const sessaoAtiva = useMemo(() => sessoes[0] || null, [sessoes])
//   const isAdmin = usuario?.papel === 'admin'

//   async function carregarTudo() {
//     try {
//       const [filaData, sessoesData] = await Promise.all([
//         listarFilaAtiva(),
//         listarSessoesAtivas(),
//       ])

//       setFila(filaData)
//       setSessoes(sessoesData)
//     } catch (err) {
//       console.error('Erro ao carregar dados da fila:', err)
//     }
//   }

//   async function carregarAuth() {
//     try {
//       const sessao = await getSession()
//       setSession(sessao)

//       if (sessao?.user) {
//         const meuUsuario = await buscarMeuUsuario()
//         setUsuario(meuUsuario || null)
//       } else {
//         setUsuario(null)
//       }
//     } catch (err) {
//       console.error('Erro ao carregar autenticação:', err)
//       setSession(null)
//       setUsuario(null)
//     } finally {
//       setAuthLoading(false)
//     }
//   }

//   useEffect(() => {
//     carregarTudo()
//     carregarAuth()
//   }, [])

//   useEffect(() => {
//     const {
//       data: { subscription },
//     } = onAuthStateChange(async (_event, sessao) => {
//       setSession(sessao)

//       if (sessao?.user) {
//         const meuUsuario = await buscarMeuUsuario()
//         setUsuario(meuUsuario || null)
//       } else {
//         setUsuario(null)
//       }
//     })

//     return () => {
//       subscription.unsubscribe()
//     }
//   }, [])

//   useEffect(() => {
//     let ativo = true

//     const recarregar = async () => {
//       if (!ativo) return
//       await carregarTudo()
//     }

//     const channel = supabase
//       .channel('fila-realtime-global')
//       .on('postgres_changes', { event: '*', schema: 'public', table: 'fila_chamados' }, recarregar)
//       .on('postgres_changes', { event: '*', schema: 'public', table: 'fila_sessoes' }, recarregar)
//       .on('postgres_changes', { event: '*', schema: 'public', table: 'fila_interacoes' }, recarregar)
//       .subscribe((status) => {
//         console.log('STATUS REALTIME:', status)
//       })

//     return () => {
//       ativo = false
//       supabase.removeChannel(channel)
//     }
//   }, [])

//   useEffect(() => {
//     const intervalId = setInterval(() => {
//       carregarTudo()
//     }, 5000)

//     return () => clearInterval(intervalId)
//   }, [])

//   async function handleLogout() {
//     await signOut()
//     setSession(null)
//     setUsuario(null)
//     setAba('publico')
//   }

//   function abrirCadastroAluno() {
//     setAba('aluno')
//     setCadastroAlunoAberto(true)
//   }

//   if (authLoading) {
//     return (
//       <div className="app-shell">
//         <div className="card">
//           <p>Carregando autenticação...</p>
//         </div>
//       </div>
//     )
//   }

//   if (!session || !usuario) {
//     return (
//       <div className="app-shell">
//         <header className="topbar">
//           <div>
//             <h1>Fila de Atendimento</h1>
//             <p className="muted">Entre para usar o sistema.</p>
//           </div>
//         </header>

//         <main className="main-grid">
//           <AuthForm onAuthSuccess={carregarAuth} />
//         </main>
//       </div>
//     )
//   }

//   return (
//     <div className="app-shell">
//       <header className="topbar">
//         <div>
//           <h1>Fila de Atendimento</h1>
//           <p className="muted">
//             {sessaoAtiva
//               ? `Sessão ativa: ${sessaoAtiva.turma?.apelido || sessaoAtiva.turma?.nome}${sessaoAtiva.titulo ? ` — ${sessaoAtiva.titulo}` : ''}`
//               : 'Nenhuma sessão ativa no momento'}
//           </p>
//           <p className="muted">
//             Logado como <strong>{usuario.nome_completo}</strong>
//             {isAdmin ? ' (admin)' : ''}
//           </p>
//         </div>

//         <nav className="tabs">
//           <button
//             className={aba === 'publico' ? 'active' : ''}
//             onClick={() => setAba('publico')}
//           >
//             Painel
//           </button>

//           <button
//             className={aba === 'aluno' ? 'active' : ''}
//             onClick={() => setAba('aluno')}
//           >
//             Meu chamado
//           </button>

//           {!isAdmin && (
//             <button
//               className="icon-button"
//               onClick={abrirCadastroAluno}
//               title="Editar cadastro"
//               aria-label="Editar cadastro"
//             >
//               <span aria-hidden="true">👤</span>
//             </button>
//           )}

//           {isAdmin && (
//             <button
//               className={aba === 'admin' ? 'active' : ''}
//               onClick={() => setAba('admin')}
//             >
//               Admin
//             </button>
//           )}

//           <button className="secondary" onClick={handleLogout}>
//             Sair
//           </button>
//         </nav>
//       </header>

//       <main className="main-grid">
//         {aba === 'publico' && <QueueBoard fila={fila} />}

//         {aba === 'aluno' && (
//           <StudentForm
//             onRefresh={carregarTudo}
//             cadastroAlunoAberto={cadastroAlunoAberto}
//             setCadastroAlunoAberto={setCadastroAlunoAberto}
//             usuario={usuario}
//           />
//         )}

//         {aba === 'admin' && isAdmin && (
//           <AdminPanel
//             fila={fila}
//             sessaoAtiva={sessaoAtiva}
//             onRefresh={carregarTudo}
//             usuario={usuario}
//           />
//         )}
//       </main>
//     </div>
//   )
// }