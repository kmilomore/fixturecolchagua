import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { CalendarDays, Copy, Eye, MapPin, Radio, TriangleAlert } from 'lucide-react'
import type { Partido } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { buildCanonicalMatchHref, buildCurrentMatchHref } from '@/utils/matchLinks'
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
  const location = useLocation()
  const [copied, setCopied] = useState(false)
  const ml = partido.marcadorLocal
  const mv = partido.marcadorVisita
  const fecha = formatPartidoDateKey(partido.fecha)
  const hora = formatPartidoTime(partido.hora)
  const detailHref = buildCurrentMatchHref(location.pathname, location.search, partido)
  const hasScore =
    partido.estado === 'finalizado' &&
    ml !== '' &&
    ml !== null &&
    mv !== '' &&
    mv !== null &&
    !Number.isNaN(Number(ml)) &&
    !Number.isNaN(Number(mv))

  useEffect(() => {
    if (!copied) return undefined
    const id = window.setTimeout(() => setCopied(false), 1500)
    return () => window.clearTimeout(id)
  }, [copied])

  async function handleCopyLink(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    if (typeof window === 'undefined' || !navigator.clipboard) return
    await navigator.clipboard.writeText(`${window.location.origin}${buildCanonicalMatchHref(partido)}`)
    setCopied(true)
  }

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
        'cursor-default overflow-hidden border-l-4 shadow-sm transition will-change-transform hover:-translate-y-0.5 hover:shadow-md',
        estadoStyle(partido.estado),
        onClick && 'cursor-pointer',
        className,
      )}
    >
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {estadoBadge(String(partido.estado))}
            {generoBadge(partido.genero)}
            <Badge variant="secondary">{partido.fase}</Badge>
            <Badge variant="muted">{partido.categoria}</Badge>
            {partido.grupo ? <Badge variant="secondary">{partido.grupo}</Badge> : null}
          </div>
          <div className="rounded-2xl border border-primary/10 bg-primary/5 px-3 py-2 text-left sm:text-right">
            <p className="font-score text-base font-bold text-primary tabular-nums">{hora || '--:--'}</p>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">{fecha}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
          <div className="text-left">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Local</p>
            <p className="font-display text-lg font-semibold leading-tight text-primary sm:text-xl md:text-2xl">{partido.localNombre}</p>
          </div>

          <div className="flex flex-col items-center justify-center gap-2">
            {hasScore ? (
              <div className="font-score flex items-baseline gap-2 rounded-2xl bg-primary/5 px-4 py-2 text-3xl font-bold tabular-nums text-primary sm:text-4xl md:text-5xl">
                <span>{Number(ml)}</span>
                <span className="text-2xl text-muted">:</span>
                <span>{Number(mv)}</span>
              </div>
            ) : (
              <div className="font-display rounded-full border border-primary/10 bg-primary/5 px-4 py-2 text-xl font-bold text-primary/70 sm:text-2xl">
                VS
              </div>
            )}
            <div className="flex flex-wrap items-center justify-center gap-2 text-center">
              {partido.estado === 'en_curso' ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-800">
                  <Radio className="h-3.5 w-3.5" />
                  En vivo
                </span>
              ) : null}
              {partido.estado === 'postergado' ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
                  <TriangleAlert className="h-3.5 w-3.5" />
                  Postergado
                </span>
              ) : null}
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">{partido.disciplina}</p>
            </div>
          </div>

          <div className="text-left md:text-right">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted md:text-right">Visita</p>
            <p className="font-display text-lg font-semibold leading-tight text-primary sm:text-xl md:text-2xl">{partido.visitaNombre}</p>
          </div>
        </div>

        <div className="grid gap-3 border-t border-black/5 pt-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {partido.lugar || 'Sin recinto'}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" />
              {fecha} · {hora || '--:--'}
            </span>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Button asChild type="button" size="sm" onClick={(event) => event.stopPropagation()}>
              <Link to={detailHref}>
                <Eye className="h-4 w-4" />
                Ver detalle
              </Link>
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={handleCopyLink}>
              <Copy className="h-4 w-4" />
              {copied ? 'Copiado' : 'Copiar link'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
