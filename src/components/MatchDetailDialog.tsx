import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Copy, MapPin, ShieldEllipsis, TimerReset, Trophy, Users } from 'lucide-react'
import type { Partido } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { buildCanonicalCalendarMatchHref, buildCanonicalMatchHref } from '@/utils/matchLinks'
import { formatPartidoDateLabel, formatPartidoTime } from '@/utils/formatDate'

interface MatchDetailDialogProps {
  open: boolean
  partido: Partido | null
  isLoading?: boolean
  onOpenChange: (open: boolean) => void
}

function estadoBadge(estado: Partido['estado']) {
  switch (estado) {
    case 'en_curso':
      return <Badge variant="live">En vivo</Badge>
    case 'finalizado':
      return <Badge variant="secondary">Finalizado</Badge>
    case 'postergado':
      return <Badge variant="warn">Postergado</Badge>
    default:
      return <Badge>Programado</Badge>
  }
}

export function MatchDetailDialog({ open, partido, isLoading = false, onOpenChange }: MatchDetailDialogProps) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return undefined
    const id = window.setTimeout(() => setCopied(false), 1600)
    return () => window.clearTimeout(id)
  }, [copied])

  const marcadorVisible =
    partido &&
    partido.estado === 'finalizado' &&
    partido.marcadorLocal !== '' &&
    partido.marcadorLocal !== null &&
    partido.marcadorVisita !== '' &&
    partido.marcadorVisita !== null

  async function handleCopyLink() {
    if (!partido || typeof window === 'undefined' || !navigator.clipboard) return
    const url = `${window.location.origin}${buildCanonicalMatchHref(partido)}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl overflow-hidden rounded-[28px] border border-primary/10 p-0 shadow-[0_28px_70px_-38px_rgba(20,30,75,0.7)]">
        {isLoading ? (
          <div className="space-y-4 p-6">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : partido ? (
          <div className="bg-[linear-gradient(180deg,rgba(248,251,255,0.98),rgba(255,255,255,0.96))]">
            <div className="border-b border-primary/10 bg-[image:var(--gradient-brand)] px-6 py-5 text-white">
              <DialogHeader className="space-y-3 text-left">
                <div className="flex flex-wrap items-center gap-2">
                  {estadoBadge(partido.estado)}
                  <Badge className="border border-white/20 bg-white/15 text-white">{partido.disciplina}</Badge>
                  <Badge className="border border-white/20 bg-white/15 text-white">{partido.genero}</Badge>
                  <Badge className="border border-white/20 bg-white/15 text-white">{partido.categoria}</Badge>
                  <Badge className="border border-white/20 bg-white/15 text-white">{partido.grupo || partido.fase}</Badge>
                </div>
                <DialogTitle className="text-2xl text-white sm:text-3xl">Detalle del partido</DialogTitle>
                <DialogDescription className="max-w-2xl text-sm text-white/78">
                  Accede rápido a la jornada, comparte este encuentro y revisa sus datos operativos sin salir del flujo actual.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="space-y-6 p-6">
              <div className="grid gap-4 rounded-[24px] border border-primary/10 bg-white p-5 shadow-[var(--shadow-soft)] md:grid-cols-[1fr_auto_1fr] md:items-center">
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Local</p>
                  <p className="font-display text-2xl font-semibold text-primary sm:text-3xl">{partido.localNombre}</p>
                </div>
                <div className="text-center">
                  {marcadorVisible ? (
                    <div className="font-score inline-flex items-center gap-2 rounded-2xl bg-primary/6 px-4 py-2 text-4xl font-bold text-primary">
                      <span>{Number(partido.marcadorLocal)}</span>
                      <span className="text-2xl text-muted">:</span>
                      <span>{Number(partido.marcadorVisita)}</span>
                    </div>
                  ) : (
                    <div className="font-display inline-flex rounded-full border border-primary/10 bg-primary/5 px-5 py-2 text-2xl font-bold text-primary/75">
                      {partido.estado === 'en_curso' ? 'En juego' : formatPartidoTime(partido.hora) || 'VS'}
                    </div>
                  )}
                </div>
                <div className="md:text-right">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Visita</p>
                  <p className="font-display text-2xl font-semibold text-primary sm:text-3xl">{partido.visitaNombre}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
                  <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/70">
                    <CalendarDays className="h-4 w-4" />
                    Fecha
                  </p>
                  <p className="mt-2 text-sm font-semibold text-primary">{formatPartidoDateLabel(partido.fecha)}</p>
                </div>
                <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
                  <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/70">
                    <TimerReset className="h-4 w-4" />
                    Hora
                  </p>
                  <p className="mt-2 text-sm font-semibold text-primary">{formatPartidoTime(partido.hora) || 'Por definir'}</p>
                </div>
                <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
                  <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/70">
                    <MapPin className="h-4 w-4" />
                    Recinto
                  </p>
                  <p className="mt-2 text-sm font-semibold text-primary">{partido.lugar || 'Sin recinto'}</p>
                </div>
                <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
                  <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/70">
                    <Trophy className="h-4 w-4" />
                    Fase
                  </p>
                  <p className="mt-2 text-sm font-semibold text-primary">{partido.grupo || partido.fase}</p>
                </div>
              </div>

              <div className="grid gap-3 rounded-[24px] border border-primary/10 bg-white p-5 shadow-[var(--shadow-soft)] sm:grid-cols-2">
                <div>
                  <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/70">
                    <Users className="h-4 w-4" />
                    Contexto deportivo
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge>{partido.disciplina}</Badge>
                    <Badge variant="damas">{partido.genero}</Badge>
                    <Badge variant="muted">Jornada {partido.jornada || 'N/A'}</Badge>
                  </div>
                </div>
                <div>
                  <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/70">
                    <ShieldEllipsis className="h-4 w-4" />
                    Acciones rápidas
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button asChild size="sm">
                      <Link to={buildCanonicalMatchHref(partido)}>Abrir en Partidos</Link>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link to={buildCanonicalCalendarMatchHref(partido)}>Ver en calendario</Link>
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={handleCopyLink}>
                      <Copy className="h-4 w-4" />
                      {copied ? 'Enlace copiado' : 'Copiar enlace'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2 p-6">
            <DialogHeader className="text-left">
              <DialogTitle>Partido no encontrado</DialogTitle>
              <DialogDescription>
                El enlace sigue siendo válido, pero no pudimos resolver el partido con los datos públicos actuales.
              </DialogDescription>
            </DialogHeader>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
