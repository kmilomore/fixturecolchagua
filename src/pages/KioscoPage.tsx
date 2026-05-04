import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity, Clock, Expand, History, MapPin, Minimize, Sparkles, Timeline, Trophy } from 'lucide-react'
import { api } from '@/api/gasClient'
import { hasGasUrl } from '@/config'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { Partido } from '@/types'
import { formatPartidoDateKey, formatPartidoDateLabel, formatPartidoTime } from '@/utils/formatDate'
import { sortMatches } from '@/utils/matches'

const ROTATING_PANELS = ['timeline', 'recent', 'history', 'alerts'] as const

type RotatingPanel = (typeof ROTATING_PANELS)[number]

function partidoTimestamp(partido: Partido) {
  return `${formatPartidoDateKey(partido.fecha)}T${formatPartidoTime(partido.hora) || '00:00'}:00`
}

function smartTodaySort(a: Partido, b: Partido) {
  const rank = (partido: Partido) => {
    if (partido.estado === 'en_curso') return 0
    if (partido.estado === 'programado') return 1
    if (partido.estado === 'finalizado') return 2
    return 3
  }

  const rankDiff = rank(a) - rank(b)
  if (rankDiff !== 0) return rankDiff

  if (a.estado === 'finalizado' && b.estado === 'finalizado') {
    return partidoTimestamp(b).localeCompare(partidoTimestamp(a))
  }

  return sortMatches(a, b)
}

function getRelativeUpdateText(updatedAt: string | undefined, now: number) {
  if (!updatedAt) return 'Sin sincronizar'

  const diffMs = Math.max(0, now - new Date(updatedAt).getTime())
  const diffSeconds = Math.floor(diffMs / 1000)

  if (diffSeconds < 10) return 'Actualizado hace instantes'
  if (diffSeconds < 60) return `Actualizado hace ${diffSeconds} s`

  const diffMinutes = Math.floor(diffSeconds / 60)
  if (diffMinutes < 60) return `Actualizado hace ${diffMinutes} min`

  return `Actualizado a las ${formatPartidoTime(updatedAt)}`
}

function buildOperationalNotes(partidos: Partido[], highlighted: Partido | null) {
  const enCurso = partidos.filter((partido) => partido.estado === 'en_curso')
  const sedes = new Set(partidos.map((partido) => partido.lugar).filter(Boolean))
  const disciplinas = new Set(partidos.map((partido) => partido.disciplina).filter(Boolean))
  const notes = [] as string[]

  if (enCurso.length) {
    notes.push(`${enCurso.length} partido(s) en curso en este momento.`)
  }
  if (sedes.size > 1) {
    notes.push(`La jornada se distribuye en ${sedes.size} recintos.`)
  }
  if (disciplinas.size > 1) {
    notes.push(`El kiosco está mostrando ${disciplinas.size} disciplinas activas.`)
  }
  if (highlighted?.lugar) {
    notes.push(`Próxima atención sugerida: ${highlighted.lugar}.`)
  }

  return notes.slice(0, 4)
}

function KioscoClock() {
  const [clock, setClock] = useState(new Date())

  useEffect(() => {
    const id = window.setInterval(() => setClock(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className="text-left md:text-right">
      <p className="font-score text-4xl font-bold tabular-nums">{formatPartidoTime(clock.toISOString())}</p>
      <p className="text-sm text-white/70">Actualiza cada 60 segundos</p>
    </div>
  )
}

export function KioscoPage() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const previousSnapshotRef = useRef<Map<string, string>>(new Map())
  const highlightTimerRef = useRef<number | null>(null)
  const [selectedDisciplineId, setSelectedDisciplineId] = useState<string>('all')
  const [activePanel, setActivePanel] = useState<RotatingPanel>('timeline')
  const [updatedMatchIds, setUpdatedMatchIds] = useState<string[]>([])
  const [changePulse, setChangePulse] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => {
      setActivePanel((current) => {
        const index = ROTATING_PANELS.indexOf(current)
        return ROTATING_PANELS[(index + 1) % ROTATING_PANELS.length]
      })
    }, 12000)

    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
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

  const disciplinasQ = useQuery({
    queryKey: ['disciplinas', campeonato?.id, 'kiosco'],
    queryFn: () => api.disciplinas.getByCampeonato(campeonato!.id),
    enabled: hasGasUrl && Boolean(campeonato?.id),
    staleTime: 5 * 60 * 1000,
  })

  const disciplinas = useMemo(() => disciplinasQ.data || [], [disciplinasQ.data])
  const effectiveDisciplineId =
    selectedDisciplineId !== 'all' && disciplinas.some((disciplina) => disciplina.id === selectedDisciplineId)
      ? selectedDisciplineId
      : undefined

  const partidosQ = useQuery({
    queryKey: ['partidos', campeonato?.id, effectiveDisciplineId, 'resumen-kiosco'],
    queryFn: () => api.partidos.getResumen({ campeonatoId: campeonato!.id, disciplinaId: effectiveDisciplineId }),
    enabled: hasGasUrl && Boolean(campeonato?.id),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  })

  const allMatchesQ = useQuery({
    queryKey: ['partidos', campeonato?.id, effectiveDisciplineId, 'kiosco-all'],
    queryFn: () => api.partidos.query({ campeonatoId: campeonato!.id, disciplinaId: effectiveDisciplineId }),
    enabled: hasGasUrl && Boolean(campeonato?.id),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  })

  const { siguiente, proximos } = useMemo(() => {
    return {
      siguiente: partidosQ.data?.siguiente || null,
      proximos: partidosQ.data?.proximos || [],
    }
  }, [partidosQ.data])

  const allMatches = useMemo(() => allMatchesQ.data || [], [allMatchesQ.data])

  useEffect(() => {
    if (!allMatches.length) {
      previousSnapshotRef.current = new Map()
      return
    }

    const nextSnapshot = new Map(
      allMatches.map((partido) => [
        partido.id,
        [partido.estado, partido.marcadorLocal, partido.marcadorVisita, partido.hora, partido.lugar].join('|'),
      ]),
    )
    const previousSnapshot = previousSnapshotRef.current

    if (!previousSnapshot.size) {
      previousSnapshotRef.current = nextSnapshot
      return
    }

    const changedIds = allMatches
      .filter((partido) => previousSnapshot.get(partido.id) && previousSnapshot.get(partido.id) !== nextSnapshot.get(partido.id))
      .map((partido) => partido.id)

    previousSnapshotRef.current = nextSnapshot

    if (!changedIds.length) return

    setUpdatedMatchIds(changedIds)
    setChangePulse(`${changedIds.length} cambio(s) detectado(s) en la última sincronización.`)

    if (highlightTimerRef.current) {
      window.clearTimeout(highlightTimerRef.current)
    }

    highlightTimerRef.current = window.setTimeout(() => {
      setUpdatedMatchIds([])
      setChangePulse(null)
    }, 15000)
  }, [allMatches])

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) {
        window.clearTimeout(highlightTimerRef.current)
      }
    }
  }, [])

  const partidosDeHoy = useMemo(() => {
    const todayKey = formatPartidoDateKey(new Date(now).toISOString())
    return allMatches
      .filter((partido) => formatPartidoDateKey(partido.fecha) === todayKey)
      .sort(smartTodaySort)
  }, [allMatches, now])

  const partidoEnCurso = useMemo(
    () => partidosDeHoy.find((partido) => partido.estado === 'en_curso') || null,
    [partidosDeHoy],
  )

  const partidoDestacado = partidoEnCurso || siguiente

  const resultadosRecientes = useMemo(() => {
    return [...allMatches]
      .filter((partido) => partido.estado === 'finalizado')
      .sort((a, b) => partidoTimestamp(b).localeCompare(partidoTimestamp(a)))
      .slice(0, 6)
  }, [allMatches])

  const proximoMismoRecinto = useMemo(() => {
    if (!partidoDestacado?.lugar) return null
    return [...allMatches]
      .filter((partido) => {
        if (partido.id === partidoDestacado.id) return false
        if (partido.lugar !== partidoDestacado.lugar) return false
        if (partido.estado === 'finalizado' || partido.estado === 'postergado') return false
        return partidoTimestamp(partido) > partidoTimestamp(partidoDestacado)
      })
      .sort((a, b) => partidoTimestamp(a).localeCompare(partidoTimestamp(b)))[0] || null
  }, [allMatches, partidoDestacado])

  const historialCruce = useMemo(() => {
    if (!partidoDestacado) return [] as Partido[]

    return [...allMatches]
      .filter((partido) => {
        if (partido.id === partidoDestacado.id) return false
        if (partido.estado !== 'finalizado') return false

        const sameDirection = partido.localId === partidoDestacado.localId && partido.visitaId === partidoDestacado.visitaId
        const oppositeDirection = partido.localId === partidoDestacado.visitaId && partido.visitaId === partidoDestacado.localId
        return sameDirection || oppositeDirection
      })
      .sort((a, b) => partidoTimestamp(b).localeCompare(partidoTimestamp(a)))
      .slice(0, 3)
  }, [allMatches, partidoDestacado])

  const avisosOperativos = useMemo(() => buildOperationalNotes(partidosDeHoy, partidoDestacado), [partidosDeHoy, partidoDestacado])

  const relativeUpdatedText = getRelativeUpdateText(partidosQ.data?.updatedAt, now)

  const toggleFullscreen = async () => {
    if (!containerRef.current) return

    if (document.fullscreenElement) {
      await document.exitFullscreen()
      return
    }

    await containerRef.current.requestFullscreen()
  }

  if (!hasGasUrl) return <p className="p-6 text-muted">Configura VITE_GAS_URL.</p>

  return (
    <div ref={containerRef} className="relative min-h-dvh overflow-hidden bg-slate-950 text-white">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/auth.webp')" }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(11,18,43,0.88),rgba(37,48,107,0.78),rgba(0,107,185,0.48))]" aria-hidden />

      <div className="relative mx-auto max-w-7xl space-y-6 p-4 md:p-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-20 w-20 place-items-center rounded-2xl bg-white p-3 shadow-lg">
              <img src="/SLEPCOLCHAGUA.webp" alt="SLEP Colchagua" className="h-full w-full object-contain" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-white/70">Modo kiosco</p>
              <h1 className="font-display text-4xl font-semibold md:text-5xl">Fixture en vivo</h1>
              <p className="text-white/75">{campeonato?.nombre || 'Campeonato Deportivo SLEP Colchagua'}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/85">
                <Badge className="border border-white/15 bg-white/10 px-3 py-1 text-white">{relativeUpdatedText}</Badge>
                {changePulse ? <Badge className="border border-emerald-300/30 bg-emerald-400/15 px-3 py-1 text-emerald-100">{changePulse}</Badge> : null}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 md:items-end">
            <Button
              type="button"
              variant="outline"
              className="border-white/25 bg-white/10 text-white hover:bg-white/15"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
              {isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            </Button>
            <KioscoClock />
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur-sm">
          <Badge className="border border-white/15 bg-white/5 px-3 py-1 text-white">Disciplina visible</Badge>
          <Button
            type="button"
            size="sm"
            variant={selectedDisciplineId === 'all' ? 'secondary' : 'outline'}
            className={selectedDisciplineId === 'all' ? 'bg-white text-primary' : 'border-white/25 bg-transparent text-white hover:bg-white/10'}
            onClick={() => setSelectedDisciplineId('all')}
          >
            Todas
          </Button>
          {disciplinas.map((disciplina) => (
            <Button
              key={disciplina.id}
              type="button"
              size="sm"
              variant={selectedDisciplineId === disciplina.id ? 'secondary' : 'outline'}
              className={selectedDisciplineId === disciplina.id ? 'bg-white text-primary' : 'border-white/25 bg-transparent text-white hover:bg-white/10'}
              onClick={() => setSelectedDisciplineId(disciplina.id)}
            >
              {disciplina.nombre}
            </Button>
          ))}
        </div>

        {campeonatosQ.isLoading || partidosQ.isLoading || allMatchesQ.isLoading || disciplinasQ.isLoading ? (
          <Skeleton className="h-96 w-full bg-white/20" />
        ) : partidosQ.isError || allMatchesQ.isError || disciplinasQ.isError ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-accent">
                {(partidosQ.error as Error)?.message || (allMatchesQ.error as Error)?.message || (disciplinasQ.error as Error)?.message}
              </CardTitle>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
            <Card className="border-white/20 bg-white/95 shadow-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-display text-3xl text-primary">
                  <Activity className="h-5 w-5" />
                  {partidoEnCurso ? 'Partido en vivo' : 'Próximo partido'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {partidoDestacado ? (
                  <div className="space-y-6">
                    <div className="flex flex-wrap gap-2">
                      <Badge className="px-3 py-1 text-[11px] uppercase tracking-wide">{partidoDestacado.disciplina}</Badge>
                      <Badge>{partidoDestacado.genero}</Badge>
                      <Badge variant="secondary">{partidoDestacado.grupo || partidoDestacado.fase}</Badge>
                      <Badge variant="muted">{partidoDestacado.categoria}</Badge>
                      {updatedMatchIds.includes(partidoDestacado.id) ? <Badge variant="live">Actualizado</Badge> : null}
                    </div>
                    <div className="grid gap-6 md:grid-cols-[1fr_auto_1fr] md:items-center">
                      <p className="font-display text-5xl font-semibold leading-none text-primary xl:text-6xl">
                        {partidoDestacado.localNombre}
                      </p>
                      <div className="text-center">
                        {partidoDestacado.estado === 'finalizado' || partidoDestacado.estado === 'en_curso' ? (
                          <div className="font-score text-6xl font-bold tabular-nums text-secondary xl:text-7xl">
                            {Number(partidoDestacado.marcadorLocal || 0)}:{Number(partidoDestacado.marcadorVisita || 0)}
                          </div>
                        ) : (
                          <p className="font-display text-6xl font-bold text-secondary xl:text-7xl">VS</p>
                        )}
                        <p className="mt-2 text-base font-semibold text-muted">
                          {formatPartidoDateKey(partidoDestacado.fecha)} · {formatPartidoTime(partidoDestacado.hora)}
                        </p>
                      </div>
                      <p className="font-display text-5xl font-semibold leading-none text-primary md:text-right xl:text-6xl">
                        {partidoDestacado.visitaNombre}
                      </p>
                    </div>
                    <p className="flex items-center gap-2 text-lg font-semibold text-muted">
                      <MapPin className="h-5 w-5" />
                      {partidoDestacado.lugar}
                    </p>
                    {proximoMismoRecinto ? (
                      <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Después de este partido</p>
                        <p className="mt-1 text-lg font-semibold text-primary">
                          {proximoMismoRecinto.localNombre} vs {proximoMismoRecinto.visitaNombre}
                        </p>
                        <p className="text-sm text-muted">
                          {formatPartidoDateKey(proximoMismoRecinto.fecha)} · {formatPartidoTime(proximoMismoRecinto.hora)} · {proximoMismoRecinto.lugar}
                        </p>
                      </div>
                    ) : null}
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
                {partidosDeHoy.length ? (
                  partidosDeHoy.slice(0, 6).map((p) => (
                    <div key={p.id} className={`rounded-xl border border-primary/10 bg-surface p-4 transition ${updatedMatchIds.includes(p.id) ? 'ring-2 ring-emerald-300/70 shadow-lg shadow-emerald-200/40' : ''}`}>
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="font-score text-2xl font-bold text-primary">{formatPartidoTime(p.hora)}</span>
                        <Badge variant={p.estado === 'en_curso' ? 'live' : 'default'}>{p.estado}</Badge>
                      </div>
                      <div className="mb-2 flex flex-wrap gap-2">
                        <Badge className="px-2.5 py-1 text-[11px] uppercase tracking-wide">{p.disciplina}</Badge>
                        <Badge variant="muted">{p.categoria}</Badge>
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
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <CardTitle className="font-display text-3xl text-primary">Panel rotativo</CardTitle>
                  <div className="flex flex-wrap gap-2">
                    {ROTATING_PANELS.map((panel) => (
                      <Button
                        key={panel}
                        type="button"
                        size="sm"
                        variant={activePanel === panel ? 'secondary' : 'outline'}
                        onClick={() => setActivePanel(panel)}
                      >
                        {panel === 'timeline' ? 'Timeline' : panel === 'recent' ? 'Resultados' : panel === 'history' ? 'Historial' : 'Avisos'}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {activePanel === 'timeline' ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-primary">
                      <Timeline className="h-5 w-5" />
                      <p className="text-sm font-semibold">Línea de tiempo de hoy</p>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {partidosDeHoy.length ? (
                        partidosDeHoy.map((p) => (
                          <div key={p.id} className={`min-w-[260px] rounded-2xl border border-primary/10 bg-white p-4 ${updatedMatchIds.includes(p.id) ? 'ring-2 ring-emerald-300/70' : ''}`}>
                            <p className="font-score text-lg font-bold text-secondary">{formatPartidoTime(p.hora)}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Badge className="px-2.5 py-1 text-[11px] uppercase tracking-wide">{p.disciplina}</Badge>
                              <Badge variant="muted">{p.lugar}</Badge>
                            </div>
                            <p className="mt-3 text-lg font-semibold text-primary">{p.localNombre}</p>
                            <p className="text-sm text-muted">vs {p.visitaNombre}</p>
                            <p className="mt-2 text-xs text-muted">{p.genero} · {p.grupo || p.fase}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted">No hay partidos en la línea de tiempo de hoy.</p>
                      )}
                    </div>
                  </div>
                ) : null}

                {activePanel === 'recent' ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-primary">
                      <Trophy className="h-5 w-5" />
                      <p className="text-sm font-semibold">Últimos resultados registrados</p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {resultadosRecientes.length ? (
                        resultadosRecientes.map((p) => (
                          <div key={p.id} className={`rounded-xl border border-primary/10 bg-white p-4 ${updatedMatchIds.includes(p.id) ? 'ring-2 ring-emerald-300/70' : ''}`}>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/60">{formatPartidoDateLabel(p.fecha)}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Badge className="px-2.5 py-1 text-[11px] uppercase tracking-wide">{p.disciplina}</Badge>
                              <Badge variant="muted">{p.categoria}</Badge>
                            </div>
                            <p className="mt-3 text-sm font-semibold text-primary">{p.localNombre} vs {p.visitaNombre}</p>
                            <p className="font-score mt-2 text-3xl font-bold text-secondary">
                              {Number(p.marcadorLocal || 0)}:{Number(p.marcadorVisita || 0)}
                            </p>
                            <p className="text-xs text-muted">{p.lugar}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted">Todavía no hay resultados finalizados para mostrar.</p>
                      )}
                    </div>
                  </div>
                ) : null}

                {activePanel === 'history' ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-primary">
                      <History className="h-5 w-5" />
                      <p className="text-sm font-semibold">Historial del cruce destacado</p>
                    </div>
                    {partidoDestacado ? (
                      <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
                        <p className="text-lg font-semibold text-primary">{partidoDestacado.localNombre} vs {partidoDestacado.visitaNombre}</p>
                        <p className="text-sm text-muted">Se muestran sus últimos cruces finalizados dentro del campeonato filtrado.</p>
                      </div>
                    ) : null}
                    <div className="grid gap-3 md:grid-cols-3">
                      {historialCruce.length ? (
                        historialCruce.map((p) => (
                          <div key={p.id} className="rounded-xl border border-primary/10 bg-white p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/60">{formatPartidoDateLabel(p.fecha)}</p>
                            <p className="mt-2 text-sm font-semibold text-primary">{p.localNombre} vs {p.visitaNombre}</p>
                            <p className="font-score mt-2 text-3xl font-bold text-secondary">
                              {Number(p.marcadorLocal || 0)}:{Number(p.marcadorVisita || 0)}
                            </p>
                            <p className="text-xs text-muted">{p.disciplina} · {p.lugar}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted">No hay historial previo suficiente para este cruce.</p>
                      )}
                    </div>
                  </div>
                ) : null}

                {activePanel === 'alerts' ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-primary">
                      <Sparkles className="h-5 w-5" />
                      <p className="text-sm font-semibold">Avisos operativos de la jornada</p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {avisosOperativos.length ? (
                        avisosOperativos.map((note) => (
                          <div key={note} className="rounded-xl border border-primary/10 bg-white p-4 text-sm font-medium text-primary">
                            {note}
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted">Sin avisos logísticos relevantes por ahora.</p>
                      )}
                    </div>
                    <div className="rounded-2xl border border-dashed border-primary/20 bg-primary/5 p-4 text-sm text-muted">
                      El bloque meteorológico no se activó porque hoy la app no tiene una fuente externa de clima. Si quieres eso en producción, hay que conectar una API adicional.
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="border-white/20 bg-white/95 shadow-2xl xl:col-span-2">
              <CardHeader>
                <CardTitle className="font-display text-3xl text-primary">Próximos encuentros</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {proximos.length ? (
                  proximos.map((p) => (
                    <div key={p.id} className={`rounded-xl border border-primary/10 bg-white p-3 ${updatedMatchIds.includes(p.id) ? 'ring-2 ring-emerald-300/70' : ''}`}>
                      <p className="font-score text-sm font-bold text-secondary">
                        {formatPartidoDateKey(p.fecha)} · {formatPartidoTime(p.hora)}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge className="px-2.5 py-1 text-[11px] uppercase tracking-wide">{p.disciplina}</Badge>
                        <Badge variant="muted">{p.categoria}</Badge>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm font-semibold text-primary">
                        {p.localNombre} vs {p.visitaNombre}
                      </p>
                      <p className="mt-1 text-xs text-muted">{p.lugar}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted">No hay próximos encuentros con el filtro actual.</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
