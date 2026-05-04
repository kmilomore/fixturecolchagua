import { CampeonatoForm } from '@/components/CampeonatoForm'

export function CampeonatoNewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-primary">Nuevo campeonato</h1>
        <p className="text-sm text-muted">Asistente corto: general → disciplinas → publicación.</p>
      </div>
      <CampeonatoForm />
    </div>
  )
}
