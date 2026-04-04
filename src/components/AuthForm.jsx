import { useEffect, useState } from 'react'
import { signIn, signUp } from '../services/auth'
import { criarUsuario } from '../services/usuarios'
import { listarTurmasAtivas } from '../services/turmas'

export default function AuthForm({ onAuthSuccess }) {
  const [modo, setModo] = useState('login')
  const [turmas, setTurmas] = useState([])

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')

  const [nome, setNome] = useState('')
  const [matricula, setMatricula] = useState('')
  const [turmaId, setTurmaId] = useState('')

  const [erro, setErro] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    carregarTurmas()
  }, [])

  async function carregarTurmas() {
    try {
      const data = await listarTurmasAtivas()
      setTurmas(data)
    } catch (err) {
      setErro(err.message)
    }
  }

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

      onAuthSuccess?.()
    } catch (err) {
      setErro(err.message)
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

      await criarUsuario({
        id: user.id,
        nome_completo: nome,
        matricula,
        turma_id: Number(turmaId),
        papel: 'aluno',
      })

      setMsg('Cadastro realizado com sucesso. Você já pode usar o sistema.')
      onAuthSuccess?.()
    } catch (err) {
      setErro(err.message)
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
              onClick={() => setModo('login')}
            >
              Login
            </button>

            <button
              type="button"
              className={modo === 'cadastro' ? 'secondary active' : 'secondary'}
              onClick={() => setModo('cadastro')}
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
              Entrar
            </button>
          </form>
        ) : (
          <form className="form" onSubmit={handleCadastro}>
            <label>
              Nome completo
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </label>

            <label>
              Matrícula
              <input
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
                required
              />
            </label>

            <label>
              Turma
              <select
                value={turmaId}
                onChange={(e) => setTurmaId(e.target.value)}
                required
              >
                <option value="">Selecione a turma</option>
                {turmas.map((turma) => (
                  <option key={turma.id} value={turma.id}>
                    {turma.apelido} — {turma.nome}
                  </option>
                ))}
              </select>
            </label>

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
              Criar conta
            </button>
          </form>
        )}
      </div>
    </div>
  )
}