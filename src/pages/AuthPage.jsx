import { useState } from 'react'
import { signIn, signUp } from '../services/auth'

export default function AuthPage({ onLogin }) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setErro('')

    try {
      await signIn({ email, password: senha })
      onLogin()
    } catch (err) {
      setErro(err.message)
    }
  }

  async function handleCadastro() {
    setErro('')

    try {
      await signUp({ email, password: senha })
      alert('Conta criada! Agora faça login.')
    } catch (err) {
      setErro(err.message)
    }
  }

  return (
    <div className="auth">
      <h1>Login</h1>

      <form onSubmit={handleLogin}>
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />

        <button>Entrar</button>
      </form>

      <button onClick={handleCadastro}>
        Criar conta
      </button>

      {erro && <p className="error">{erro}</p>}
    </div>
  )
}