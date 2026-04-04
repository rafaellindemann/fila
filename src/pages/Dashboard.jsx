import StudentForm from '../components/StudentForm'

export default function Dashboard({ usuario }) {
  return (
    <div className="app-shell">
      <h1>Fila de Atendimento</h1>

      <StudentForm usuario={usuario} />
    </div>
  )
}