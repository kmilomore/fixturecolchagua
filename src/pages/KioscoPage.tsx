import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity, Clock, MapPin } from 'lucide-react'
import { api } from '@/api/gasClient'
import { hasGasUrl } from '@/config'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatPartidoDateKey, formatPartidoTime } from '@/utils/formatDate'
import { getTodayMatches, getUpcomingMatch, sortMatches } from '@/utils/matches'

export function KioscoPage() {
  const [clock, setClock] = useState(new Date())

  useEffect(() => {
    const id = window.setInterval(() => setClock(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const campeonatosQ = useQuery({
    queryKey: ['campeonatos'],
    queryFn: () => api.campeonatos.getAll(),
    enabled: hasGasUrl,
    staleTime: 5 * 60 * 1000,
  })

  const campeonato = useMemo(() => {
    const rows = campeonatosQ.data || []
    return rows.find((c) => c.estado === 'activo') || rows[0]
  }, [campeonatosQ.data])

  const partidosQ = useQuery({
    queryKey: ['partidos', campeonato?.id, 'kiosco'],
    queryFn: () => api.partidos.query({ campeonatoId: campeonato!.id }),
    enabled: hasGasUrl && Boolean(campeonato?.id),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  })

  const { siguiente, hoy, proximos } = useMemo(() => {
    const rows = partidosQ.data || []
    return {
      siguiente: getUpcomingMatch(rows),
      hoy: getTodayMatches(rows),
      proximos: [...rows]
        .filter((p) => p.estado !== 'finalizado' && p.estado !== 'postergado')
        .sort(sortMatches)
        .slice(0, 8),
    }
  }, [partidosQ.data])

  if (!hasGasUrl) return <p className="p-6 text-muted">Configura VITE_GAS_URL.</p>

  return (
    <div className="min-h-dvh bg-[image:var(--gradient-brand)] p-4 text-white md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-20 w-20 place-items-center rounded-2xl bg-white p-3 shadow-lg">
              <img src="/SLEPCOLCHAGUA.webp" alt="SLEP Colchagua" className="h-full w-full object-contain" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-white/70">Modo kiosco</p>
              <h1 className="font-display text-4xl font-semibold md:text-5xl">Fixture en vivo</h1>
              <p className="text-white/75">{campeonato?.nombre || 'Campeonato Deportivo SLEP Colchagua'}</p>
            </div>
          </div>
          <div className="text-left md:text-right">
            <p className="font-score text-4xl font-bold tabular-nums">{formatPartidoTime(clock.toISOString())}</p>
            <p className="text-sm text-white/70">Actualiza cada 60 segundos</p>
          </div>
        </header>

        {campeonatosQ.isLoading || partidosQ.isLoading ? (
          <Skeleton className="h-96 w-full bg-white/20" />
        ) : partidosQ.isError ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-accent">{(partidosQ.error as Error).message}</CardTitle>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
            <Card className="border-white/20 bg-white/95 shadow-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-display text-3xl text-primary">
                  <Activity className="h-5 w-5" />
                  Próximo partido
                </CardTitle>
              </CardHeader>
              <CardContent>
                {siguiente ? (
                  <div className="space-y-6">
                    <div className="flex flex-wrap gap-2">
                      <Badge>{siguiente.genero}</Badge>
                      <Badge variant="secondary">{siguiente.grupo || siguiente.fase}</Badge>
                      <Badge variant="muted">{siguiente.categoria}</Badge>
                    </div>
                    <div className="grid gap-6 md:grid-cols-[1fr_auto_1fr] md:items-center">
                      <p className="font-display text-5xl font-semibold leading-none text-primary xl:text-6xl">
                        {siguiente.localNombre}
                      </p>
                      <div className="text-center">
                        <p className="font-display text-6xl font-bold text-secondary xl:text-7xl">VS</p>
                        <p className="mt-2 text-base font-semibold text-muted">
                          {formatPartidoDateKey(siguiente.fecha)} · {formatPartidoTime(siguiente.hora)}
                        </p>
                      </div>
                      <p className="font-display text-5xl font-semibold leading-none text-primary md:text-right xl:text-6xl">
                        {siguiente.visitaNombre}
                      </p>
                    </div>
                    <p className="flex items-center gap-2 text-lg font-semibold text-muted">
                      <MapPin className="h-5 w-5" />
                      {siguiente.lugar}
                    </p>
                  </div>
                ) : (
                  <p className="text-muted">No hay próximos partidos programados.</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-white/20 bg-white/95 shadow-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-display text-3xl text-primary">
                  <Clock className="h-5 w-5" />
                  Partidos de hoy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {hoy.length ? (
                  hoy.slice(0, 6).map((p) => (
                    <div key={p.id} className="rounded-xl border border-primary/10 bg-surface p-4">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="font-score text-2xl font-bold text-primary">{formatPartidoTime(p.hora)}</span>
                        <Badge variant={p.estado === 'en_curso' ? 'live' : 'default'}>{p.estado}</Badge>
                      </div>
                      <p className="text-lg font-semibold text-primary">
                        {p.localNombre} vs {p.visitaNombre}
                      </p>
                      <p className="text-xs text-muted">{p.genero} · {p.grupo || p.fase}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-muted">No hay partidos para hoy.</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-white/20 bg-white/95 shadow-2xl xl:col-span-2">
              <CardHeader>
                <CardTitle className="font-display text-3xl text-primary">Próximos encuentros</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {proximos.map((p) => (
                  <div key={p.id} className="rounded-xl border border-primary/10 bg-white p-3">
                    <p className="font-score text-sm font-bold text-secondary">
                      {formatPartidoDateKey(p.fecha)} · {formatPartidoTime(p.hora)}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm font-semibold text-primary">
                      {p.localNombre} vs {p.visitaNombre}
                    </p>
                    <p className="mt-1 text-xs text-muted">{p.lugar}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
