import { useState } from 'react'

export default function AdminLogin({ onLogin }) {
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [erro, setErro] = useState('')

  function handleSubmit(e) {
    e.preventDefault()

    const envUser = import.meta.env.VITE_ADMIN_USER
    const envPass = import.meta.env.VITE_ADMIN_PASS

    if (user === envUser && pass === envPass) {
      localStorage.setItem('fila_admin_auth', 'true')
      onLogin()
      return
    }

    setErro('Usuário ou senha inválidos.')
  }

  return (
    <form className="card form" onSubmit={handleSubmit}>
      <h2>Login admin</h2>

      <label>
        Usuário
        <input value={user} onChange={(e) => setUser(e.target.value)} />
      </label>

      <label>
        Senha
        <input
          type="password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
        />
      </label>

      {erro && <p className="error">{erro}</p>}

      <button type="submit">Entrar</button>
    </form>
  )
}