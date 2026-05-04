import type { Partido } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatPartidoDateKey, formatPartidoTime } from '@/utils/formatDate'

function estadoBadge(estado: string) {
  switch (estado) {
    case 'programado':
      return <Badge className="bg-primary/10 text-primary">Programado</Badge>
    case 'en_curso':
      return <Badge variant="live">En vivo</Badge>
    case 'finalizado':
      return <Badge className="bg-slate-200 text-slate-700">Finalizado</Badge>
    case 'postergado':
      return <Badge variant="warn">Postergado</Badge>
    default:
      return <Badge variant="muted">{estado}</Badge>
  }
}

function estadoStyle(estado: string) {
  switch (estado) {
    case 'en_curso':
      return 'border-emerald-400 bg-emerald-50/70 ring-2 ring-emerald-300/50'
    case 'finalizado':
      return 'border-slate-200 bg-slate-50 opacity-95'
    case 'postergado':
      return 'border-accent/30 bg-accent/5'
    default:
      return 'border-primary/10 bg-white'
  }
}

function generoBadge(genero: string) {
  return genero === 'Damas' ? <Badge variant="damas">Damas</Badge> : <Badge variant="varones">Varones</Badge>
}

export interface MatchCardProps {
  partido: Partido
  onClick?: (p: Partido) => void
  className?: string
}

export function MatchCard({ partido, onClick, className }: MatchCardProps) {
  const ml = partido.marcadorLocal
  const mv = partido.marcadorVisita
  const fecha = formatPartidoDateKey(partido.fecha)
  const hora = formatPartidoTime(partido.hora)
  const hasScore =
    partido.estado === 'finalizado' &&
    ml !== '' &&
    ml !== null &&
    mv !== '' &&
    mv !== null &&
    !Number.isNaN(Number(ml)) &&
    !Number.isNaN(Number(mv))

  return (
    <Card
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={() => onClick?.(partido)}
      onKeyDown={(e) => {
        if (!onClick) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick(partido)
        }
      }}
      className={cn(
        'cursor-default overflow-hidden border-l-4 transition will-change-transform hover:-translate-y-0.5 hover:shadow-md',
        estadoStyle(partido.estado),
        onClick && 'cursor-pointer',
        className,
      )}
    >
      <CardContent className="space-y-4 p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {estadoBadge(String(partido.estado))}
            {generoBadge(partido.genero)}
            <Badge variant="secondary">{partido.fase}</Badge>
            <Badge variant="muted">{partido.categoria}</Badge>
            {partido.grupo ? <Badge variant="secondary">{partido.grupo}</Badge> : null}
          </div>
          <div className="rounded-full bg-primary px-3 py-1 font-score text-sm font-bold text-white tabular-nums">
            {hora || '--:--'}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
          <div className="text-left">
            <p className="font-display text-xl font-semibold leading-tight text-primary md:text-2xl">{partido.localNombre}</p>
            <p className="text-xs text-muted">Local</p>
          </div>

          <div className="flex flex-col items-center justify-center gap-1">
            {hasScore ? (
              <div className="font-score flex items-baseline gap-2 text-4xl font-bold tabular-nums text-primary md:text-5xl">
                <span>{Number(ml)}</span>
                <span className="text-2xl text-muted">:</span>
                <span>{Number(mv)}</span>
              </div>
            ) : (
              <div className="font-display rounded-full border border-primary/10 bg-primary/5 px-4 py-2 text-2xl font-bold text-primary/70">
                VS
              </div>
            )}
            <p className="text-sm text-muted">
              {fecha}
            </p>
          </div>

          <div className="text-left md:text-right">
            <p className="font-display text-xl font-semibold leading-tight text-primary md:text-2xl">{partido.visitaNombre}</p>
            <p className="text-xs text-muted">Visita</p>
          </div>
        </div>

        <p className="text-sm text-muted">{partido.lugar}</p>
      </CardContent>
    </Card>
  )
}
