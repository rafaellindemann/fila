import { useState } from 'react'
import { signIn, signUp } from '../services/auth'

export default function AuthForm() {
  const [modo, setModo] = useState('login')

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')

  const [erro, setErro] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setErro('')
    setMsg('')
    setLoading(true)

    try {
      await signIn({
        email,
        password: senha,
      })
    } catch (err) {
      setErro(err.message || 'Erro ao entrar.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCadastro(e) {
    e.preventDefault()
    setErro('')
    setMsg('')
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
    } catch (err) {
      setErro(err.message || 'Erro ao criar conta.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <div className="section-header">
          <h2>{modo === 'login' ? 'Entrar' : 'Criar conta'}</h2>

          <div className="switch-row">
            <button
              type="button"
              className={modo === 'login' ? 'secondary active' : 'secondary'}
              onClick={() => {
                setModo('login')
                setErro('')
                setMsg('')
              }}
            >
              Login
            </button>

            <button
              type="button"
              className={modo === 'cadastro' ? 'secondary active' : 'secondary'}
              onClick={() => {
                setModo('cadastro')
                setErro('')
                setMsg('')
              }}
            >
              Cadastro
            </button>
          </div>
        </div>

        {modo === 'login' ? (
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
          </form>
        ) : (
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
      </div>
    </div>
  )
}