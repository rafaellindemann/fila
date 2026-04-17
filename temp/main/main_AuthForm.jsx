import { useEffect, useMemo, useState } from 'react'
import {
  signIn,
  signUp,
  sendPasswordReset,
  updatePassword,
  onAuthStateChange,
} from '../services/auth'

function getBaseUrl() {
  return window.location.origin
}

export default function AuthForm({
  initialMode = 'login',
  onPasswordResetComplete,
}) {
  const [modo, setModo] = useState(initialMode)

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')

  const [erro, setErro] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const titulo = useMemo(() => {
    if (modo === 'cadastro') return 'Criar conta'
    if (modo === 'recuperar') return 'Recuperar senha'
    if (modo === 'redefinir') return 'Definir nova senha'
    return 'Entrar'
  }, [modo])

  useEffect(() => {
    setModo(initialMode)
  }, [initialMode])

  useEffect(() => {
    const hash = window.location.hash || ''
    const search = window.location.search || ''
    const fullUrl = `${search}${hash}`.toLowerCase()

    if (
      fullUrl.includes('type=recovery') ||
      (fullUrl.includes('access_token') && fullUrl.includes('refresh_token'))
    ) {
      setModo('redefinir')
      setErro('')
      setMsg('Digite sua nova senha.')
    }

    const {
      data: { subscription },
    } = onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setModo('redefinir')
        setErro('')
        setMsg('Digite sua nova senha.')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  function limparMensagens() {
    setErro('')
    setMsg('')
  }

  async function handleLogin(e) {
    e.preventDefault()
    limparMensagens()
    setLoading(true)

    try {
      await signIn({
        email,
        password: senha,
      })
    } catch (err) {
      setErro(err.message || 'Não foi possível entrar.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCadastro(e) {
    e.preventDefault()
    limparMensagens()
    setLoading(true)

    try {
      const authData = await signUp({
        email,
        password: senha,
      })

      const user = authData?.user
      if (!user?.id) {
        throw new Error('Usuário criado sem ID válido no Auth.')
      }

      setMsg('Conta criada com sucesso. Agora complete seu cadastro no sistema.')
      setModo('login')
      setSenha('')
      setConfirmarSenha('')
    } catch (err) {
      setErro(err.message || 'Não foi possível criar a conta.')
    } finally {
      setLoading(false)
    }
  }

  async function handleRecuperarSenha(e) {
    e.preventDefault()
    limparMensagens()
    setLoading(true)

    try {
      const redirectTo = getBaseUrl()

      await sendPasswordReset(email, redirectTo)

      setMsg('Se este e-mail estiver cadastrado, você receberá um link para redefinir sua senha.')
    } catch (err) {
      setErro(err.message || 'Não foi possível enviar o link de recuperação.')
    } finally {
      setLoading(false)
    }
  }

  async function handleRedefinirSenha(e) {
    e.preventDefault()
    limparMensagens()

    if (!senha || senha.length < 6) {
      setErro('A nova senha deve ter pelo menos 6 caracteres.')
      return
    }

    if (senha !== confirmarSenha) {
      setErro('As senhas não coincidem.')
      return
    }

    setLoading(true)

    try {
      await updatePassword(senha)

      window.history.replaceState({}, document.title, window.location.pathname)

      setMsg('Senha alterada com sucesso.')

      if (onPasswordResetComplete) {
        await onPasswordResetComplete()
      } else {
        setModo('login')
      }

      setSenha('')
      setConfirmarSenha('')
    } catch (err) {
      setErro(err.message || 'Não foi possível atualizar a senha.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <div className="section-header">
          <h2>{titulo}</h2>

          {modo !== 'redefinir' && (
            <div className="switch-row">
              <button
                type="button"
                className={modo === 'login' ? 'secondary active' : 'secondary'}
                onClick={() => {
                  setModo('login')
                  limparMensagens()
                }}
              >
                Login
              </button>

              <button
                type="button"
                className={modo === 'cadastro' ? 'secondary active' : 'secondary'}
                onClick={() => {
                  setModo('cadastro')
                  limparMensagens()
                }}
              >
                Cadastro
              </button>

              <button
                type="button"
                className={modo === 'recuperar' ? 'secondary active' : 'secondary'}
                onClick={() => {
                  setModo('recuperar')
                  limparMensagens()
                }}
              >
                Esqueci a senha
              </button>
            </div>
          )}
        </div>

        {modo === 'login' && (
          <form className="form" onSubmit={handleLogin}>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            <label>
              Senha
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
            </label>

            {msg && <p className="success">{msg}</p>}
            {erro && <p className="error">{erro}</p>}

            <button type="submit" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>

            <button
              type="button"
              className="ghost"
              onClick={() => {
                setModo('recuperar')
                limparMensagens()
              }}
            >
              Esqueci minha senha
            </button>
          </form>
        )}

        {modo === 'cadastro' && (
          <form className="form" onSubmit={handleCadastro}>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            <label>
              Senha
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
            </label>

            {msg && <p className="success">{msg}</p>}
            {erro && <p className="error">{erro}</p>}

            <button type="submit" disabled={loading}>
              {loading ? 'Criando conta...' : 'Criar conta'}
            </button>
          </form>
        )}

        {modo === 'recuperar' && (
          <form className="form" onSubmit={handleRecuperarSenha}>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            <p className="muted">
              Vamos enviar um link para você redefinir sua senha.
            </p>

            {msg && <p className="success">{msg}</p>}
            {erro && <p className="error">{erro}</p>}

            <button type="submit" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar link de recuperação'}
            </button>

            <button
              type="button"
              className="ghost"
              onClick={() => {
                setModo('login')
                limparMensagens()
              }}
            >
              Voltar para login
            </button>
          </form>
        )}

        {modo === 'redefinir' && (
          <form className="form" onSubmit={handleRedefinirSenha}>
            <label>
              Nova senha
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
            </label>

            <label>
              Confirmar nova senha
              <input
                type="password"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                required
              />
            </label>

            {msg && <p className="success">{msg}</p>}
            {erro && <p className="error">{erro}</p>}

            <button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}