import { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import {
  listarResumoTurmas,
  listarFechamentosTurmas,
  listarResumoAlunosDaTurma,
  listarFechamentosDaTurma,
} from '../services/dashboard'

function formatSegundos(valor) {
  const total = Math.round(Number(valor || 0))
  const minutos = Math.floor(total / 60)
  const segundos = total % 60
  return `${minutos}m ${segundos}s`
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null

  return (
    <div className="card" style={{ padding: '10px 12px' }}>
      <strong>{label}</strong>
      <div className="muted small" style={{ marginTop: 6 }}>
        {payload.map((item) => (
          <div key={item.dataKey || item.name}>
            {item.name}: {item.value}
          </div>
        ))}
      </div>
    </div>
  )
}

function compareValues(a, b, direction) {
  if (a == null && b == null) return 0
  if (a == null) return direction === 'asc' ? -1 : 1
  if (b == null) return direction === 'asc' ? 1 : -1

  if (typeof a === 'number' && typeof b === 'number') {
    return direction === 'asc' ? a - b : b - a
  }

  const aText = String(a).toLowerCase()
  const bText = String(b).toLowerCase()

  if (aText < bText) return direction === 'asc' ? -1 : 1
  if (aText > bText) return direction === 'asc' ? 1 : -1
  return 0
}

export default function AdminDashboard() {
  const [turmas, setTurmas] = useState([])
  const [fechamentosGlobais, setFechamentosGlobais] = useState([])
  const [turmaSelecionada, setTurmaSelecionada] = useState(null)
  const [alunosTurma, setAlunosTurma] = useState([])
  const [fechamentosTurma, setFechamentosTurma] = useState([])
  const [loading, setLoading] = useState(true)

  const [sortConfig, setSortConfig] = useState({
    key: 'total_chamados',
    direction: 'desc',
  })

  useEffect(() => {
    carregarMacro()
  }, [])

  async function carregarMacro() {
    try {
      setLoading(true)
      const [resumo, fechamentos] = await Promise.all([
        listarResumoTurmas(),
        listarFechamentosTurmas(),
      ])

      setTurmas(resumo || [])
      setFechamentosGlobais(fechamentos || [])
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  async function abrirTurma(turma) {
    try {
      setTurmaSelecionada(turma)

      const [alunos, fechamentos] = await Promise.all([
        listarResumoAlunosDaTurma(turma.turma_id),
        listarFechamentosDaTurma(turma.turma_id),
      ])

      setAlunosTurma(alunos || [])
      setFechamentosTurma(fechamentos || [])
      setSortConfig({
        key: 'total_chamados',
        direction: 'desc',
      })
    } catch (err) {
      console.error('Erro ao carregar detalhes da turma:', err)
    }
  }

  function voltarResumo() {
    setTurmaSelecionada(null)
    setAlunosTurma([])
    setFechamentosTurma([])
  }

  function handleSort(key) {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        }
      }

      return {
        key,
        direction: key === 'nome_completo' ? 'asc' : 'desc',
      }
    })
  }

  function renderSortIndicator(key) {
    if (sortConfig.key !== key) return '↕'
    return sortConfig.direction === 'asc' ? '↑' : '↓'
  }

  const cardsMacro = useMemo(() => {
    const totalTurmas = turmas.length
    const totalAlunos = turmas.reduce((acc, item) => acc + Number(item.total_alunos || 0), 0)
    const totalChamados = turmas.reduce((acc, item) => acc + Number(item.total_chamados || 0), 0)
    const totalSessoes = turmas.reduce((acc, item) => acc + Number(item.total_sessoes || 0), 0)

    return { totalTurmas, totalAlunos, totalChamados, totalSessoes }
  }, [turmas])

  const dadosChamadosPorTurma = turmas.map((item) => ({
    nome: item.turma_apelido || item.turma_nome,
    chamados: Number(item.total_chamados || 0),
  }))

  const dadosFechamentosGlobais = useMemo(() => {
    return fechamentosGlobais.reduce((acc, item) => {
      const existente = acc.find((x) => x.tipo_resultado === item.tipo_resultado)
      if (existente) {
        existente.total += Number(item.total || 0)
      } else {
        acc.push({
          tipo_resultado: item.tipo_resultado,
          total: Number(item.total || 0),
        })
      }
      return acc
    }, [])
  }, [fechamentosGlobais])

  const dadosChamadosPorAluno = alunosTurma.map((item) => ({
    nome: item.nome_completo,
    chamados: Number(item.total_chamados || 0),
  }))

  const dadosAjudasPorAluno = alunosTurma.map((item) => ({
    nome: item.nome_completo,
    ajudas: Number(item.total_ajudas || 0),
  }))

  const alunosOrdenados = useMemo(() => {
    const copia = [...alunosTurma]

    copia.sort((a, b) => {
      const key = sortConfig.key
      return compareValues(a[key], b[key], sortConfig.direction)
    })

    return copia
  }, [alunosTurma, sortConfig])

  const pieColors = ['#1CA600', '#C0A000', '#AE48C6', '#7D91EC', '#00EEEB', '#F44747']

  if (loading) {
    return (
      <div className="card">
        <h2>Dashboard</h2>
        <p>Carregando métricas...</p>
      </div>
    )
  }

  if (!turmaSelecionada) {
    return (
      <div className="admin-stack">
        <div className="card">
          <h2>Dashboard geral</h2>
          <p className="muted">Resumo macro das turmas cadastradas.</p>
        </div>

        <div className="dashboard-cards-grid">
          <div className="card">
            <h3>Turmas</h3>
            <div className="big-metric">{cardsMacro.totalTurmas}</div>
          </div>

          <div className="card">
            <h3>Alunos</h3>
            <div className="big-metric">{cardsMacro.totalAlunos}</div>
          </div>

          <div className="card">
            <h3>Chamados</h3>
            <div className="big-metric">{cardsMacro.totalChamados}</div>
          </div>

          <div className="card">
            <h3>Sessões</h3>
            <div className="big-metric">{cardsMacro.totalSessoes}</div>
          </div>
        </div>

        <div className="dashboard-grid-2">
          <div className="card">
            <h3>Chamados por turma</h3>
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={dadosChamadosPorTurma}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(191,189,187,0.12)" />
                  <XAxis dataKey="nome" stroke="#BFBDBB" />
                  <YAxis stroke="#BFBDBB" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="chamados" name="Chamados" fill="#1CA600" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <h3>Fechamentos globais</h3>
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={dadosFechamentosGlobais}
                    dataKey="total"
                    nameKey="tipo_resultado"
                    outerRadius={110}
                  >
                    {dadosFechamentosGlobais.map((entry, index) => (
                      <Cell key={entry.tipo_resultado} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="card">
          <h3>Turmas</h3>

          <div className="dashboard-turmas-list">
            {turmas.map((turma) => (
              <div className="dashboard-turma-item" key={turma.turma_id}>
                <div className="dashboard-turma-info">
                  <strong className="dashboard-turma-nome">
                    {turma.turma_apelido || turma.turma_nome}
                  </strong>

                  <p className="muted">
                    {turma.total_alunos} alunos · {turma.total_chamados} chamados · {turma.total_sessoes} sessões
                  </p>

                  <p className="muted small">
                    espera média: {formatSegundos(turma.media_espera_segundos)} · atendimento médio: {formatSegundos(turma.media_atendimento_segundos)}
                  </p>
                </div>

                <div className="dashboard-turma-actions">
                  <button onClick={() => abrirTurma(turma)}>Abrir turma</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-stack">
      <div className="card session-banner">
        <div>
          <h2>{turmaSelecionada.turma_apelido || turmaSelecionada.turma_nome}</h2>
          <p className="muted">Detalhamento da turma</p>
        </div>

        <button className="secondary" onClick={voltarResumo}>
          Voltar ao geral
        </button>
      </div>

      <div className="dashboard-cards-grid">
        <div className="card">
          <h3>Alunos</h3>
          <div className="big-metric">{turmaSelecionada.total_alunos}</div>
        </div>

        <div className="card">
          <h3>Chamados</h3>
          <div className="big-metric">{turmaSelecionada.total_chamados}</div>
        </div>

        <div className="card">
          <h3>Sessões</h3>
          <div className="big-metric">{turmaSelecionada.total_sessoes}</div>
        </div>

        <div className="card">
          <h3>Espera média</h3>
          <div className="big-metric">{formatSegundos(turmaSelecionada.media_espera_segundos)}</div>
        </div>
      </div>

      <div className="dashboard-grid-2">
        <div className="card">
          <h3>Chamados por aluno</h3>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={dadosChamadosPorAluno}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(191,189,187,0.12)" />
                <XAxis dataKey="nome" stroke="#BFBDBB" />
                <YAxis stroke="#BFBDBB" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="chamados" name="Chamados" fill="#1CA600" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3>Ajudas por aluno</h3>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={dadosAjudasPorAluno}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(191,189,187,0.12)" />
                <XAxis dataKey="nome" stroke="#BFBDBB" />
                <YAxis stroke="#BFBDBB" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="ajudas" name="Ajudas" fill="#AE48C6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="dashboard-grid-2">
        <div className="card">
          <h3>Fechamentos da turma</h3>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={fechamentosTurma}
                  dataKey="total"
                  nameKey="tipo_resultado"
                  outerRadius={110}
                >
                  {fechamentosTurma.map((entry, index) => (
                    <Cell key={entry.tipo_resultado} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3>Alunos da turma</h3>

          <div className="table-wrap">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>
                    <button
                      type="button"
                      className="table-sort-button"
                      onClick={() => handleSort('nome_completo')}
                    >
                      Aluno <span>{renderSortIndicator('nome_completo')}</span>
                    </button>
                  </th>

                  <th>
                    <button
                      type="button"
                      className="table-sort-button"
                      onClick={() => handleSort('total_chamados')}
                    >
                      Chamados <span>{renderSortIndicator('total_chamados')}</span>
                    </button>
                  </th>

                  <th>
                    <button
                      type="button"
                      className="table-sort-button"
                      onClick={() => handleSort('total_ajudas')}
                    >
                      Ajudas <span>{renderSortIndicator('total_ajudas')}</span>
                    </button>
                  </th>

                  <th>
                    <button
                      type="button"
                      className="table-sort-button"
                      onClick={() => handleSort('total_resolveu_sozinho')}
                    >
                      Resolveu sozinho <span>{renderSortIndicator('total_resolveu_sozinho')}</span>
                    </button>
                  </th>
                </tr>
              </thead>

              <tbody>
                {alunosOrdenados.map((aluno) => (
                  <tr key={aluno.usuario_id}>
                    <td>{aluno.nome_completo}</td>
                    <td>{aluno.total_chamados}</td>
                    <td>{aluno.total_ajudas}</td>
                    <td>{aluno.total_resolveu_sozinho}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}