import type { Partido } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatPartidoDateKey, formatPartidoTime } from '@/utils/formatDate'

function score(partido: Partido | undefined, side: 'local' | 'visita') {
  if (!partido || partido.estado !== 'finalizado') return '·'
  const value = side === 'local' ? partido.marcadorLocal : partido.marcadorVisita
  return value === '' || value === null ? '·' : String(value)
}

function isWinner(partido: Partido | undefined, side: 'local' | 'visita') {
  if (!partido || partido.estado !== 'finalizado') return false
  const local = Number(partido.marcadorLocal)
  const visita = Number(partido.marcadorVisita)
  if (Number.isNaN(local) || Number.isNaN(visita) || local === visita) return false
  return side === 'local' ? local > visita : visita > local
}

function teamRow(partido: Partido | undefined, side: 'local' | 'visita') {
  const nombre = partido ? (side === 'local' ? partido.localNombre : partido.visitaNombre) : 'Por definir'
  const winner = isWinner(partido, side)

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 rounded-lg border px-3 py-2',
        winner ? 'border-secondary/40 bg-secondary/10' : 'border-black/10 bg-white',
      )}
    >
      <span className={cn('truncate text-sm font-semibold', winner ? 'text-primary' : 'text-slate-700')}>
        {nombre}
      </span>
      <span className="font-score min-w-6 text-right text-lg font-bold tabular-nums text-primary">
        {score(partido, side)}
      </span>
    </div>
  )
}

function phaseCard(title: string, partido?: Partido, highlight = false) {
  return (
    <div
      className={cn(
        'rounded-2xl border bg-white p-3 shadow-sm transition',
        highlight ? 'border-secondary/40 shadow-md' : 'border-black/10',
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>
          <p className="text-xs text-muted">
            {partido ? `${formatPartidoDateKey(partido.fecha)} · ${formatPartidoTime(partido.hora)}` : 'Sin partido cargado'}
          </p>
        </div>
        {partido ? <Badge variant={partido.estado === 'finalizado' ? 'muted' : 'default'}>{partido.estado}</Badge> : null}
      </div>
      <div className="space-y-2">
        {teamRow(partido, 'local')}
        {teamRow(partido, 'visita')}
      </div>
      {partido?.lugar ? <p className="mt-3 text-xs text-muted">{partido.lugar}</p> : null}
    </div>
  )
}

export interface BracketViewProps {
  semifinales: Partido[]
  final?: Partido
  tercer?: Partido
  className?: string
}

export function BracketView({ semifinales, final, tercer, className }: BracketViewProps) {
  const [s1, s2] = [semifinales[0], semifinales[1]]
  const hasFases = Boolean(s1 || s2 || final || tercer)

  if (!hasFases) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fases eliminatorias</CardTitle>
          <CardDescription>
            Todavía no hay semifinales, final o tercer lugar cargados para los filtros actuales.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className={cn('space-y-8', className)}>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Fases eliminatorias</CardTitle>
          <CardDescription>Semifinales, final y tercer lugar conectados por resultados reales.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="min-w-[900px]">
            <div className="grid grid-cols-[1fr_80px_1fr_80px_1fr] items-center gap-0">
              <div className="space-y-8">
                {phaseCard('Semifinal 1', s1)}
                {phaseCard('Semifinal 2', s2)}
              </div>

              <div className="relative h-full">
                <div className="absolute left-1/2 top-[25%] h-px w-1/2 bg-primary/25" />
                <div className="absolute left-1/2 top-[25%] h-1/2 w-px bg-primary/25" />
                <div className="absolute left-1/2 bottom-[25%] h-px w-1/2 bg-primary/25" />
              </div>

              <div>{phaseCard('Final', final, true)}</div>

              <div className="relative h-full">
                <div className="absolute right-1/2 top-1/2 h-px w-full bg-primary/25" />
              </div>

              <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Campeón</p>
                <p className="mt-2 font-display text-2xl font-semibold text-primary">{winnerName(final)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tercer lugar</CardTitle>
        </CardHeader>
        <CardContent className="md:max-w-xl">{phaseCard('Definición', tercer)}</CardContent>
      </Card>
    </div>
  )
}

function winnerName(partido?: Partido) {
  if (!partido || partido.estado !== 'finalizado') return 'Por definir'
  const local = Number(partido.marcadorLocal)
  const visita = Number(partido.marcadorVisita)
  if (Number.isNaN(local) || Number.isNaN(visita) || local === visita) return 'Por definir'
  return local > visita ? partido.localNombre : partido.visitaNombre
}
