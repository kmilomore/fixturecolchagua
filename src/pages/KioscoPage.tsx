import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity, Clock, Expand, History, MapPin, Minimize, Settings2, Sparkles, Timeline, Trophy } from 'lucide-react'
import { api } from '@/api/gasClient'
import { hasGasUrl } from '@/config'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import type { Partido } from '@/types'
import { formatPartidoDateKey, formatPartidoDateLabel, formatPartidoTime } from '@/utils/formatDate'
import { sortMatches } from '@/utils/matches'

const ROTATING_PANELS = ['timeline', 'recent', 'history', 'alerts'] as const
const KIOSK_SETTINGS_STORAGE_KEY = 'slep_kiosk_settings_v1'
const SAN_FERNANDO_WEATHER_URL = '/api/weather'

type RotatingPanel = (typeof ROTATING_PANELS)[number]

interface KioskSettings {
  fixedDisciplineId: string
  rotationSeconds: number
  autoFullscreen: boolean
}

interface OpenMeteoResponse {
  current?: {
    temperature_2m?: number
    apparent_temperature?: number
    weather_code?: number
    wind_speed_10m?: number
  }
  daily?: {
    temperature_2m_max?: number[]
    temperature_2m_min?: number[]
    precipitation_probability_max?: number[]
  }
}

interface WeatherSummary {
  temperature: number
  apparent: number
  wind: number
  label: string
  max: number
  min: number
  rain: number
}

function getDefaultKioskSettings(): KioskSettings {
  return {
    fixedDisciplineId: 'all',
    rotationSeconds: 12,
    autoFullscreen: false,
  }
}

function readStoredKioskSettings(): KioskSettings {
  if (typeof window === 'undefined') return getDefaultKioskSettings()

  try {
    const raw = window.localStorage.getItem(KIOSK_SETTINGS_STORAGE_KEY)
    if (!raw) return getDefaultKioskSettings()

    const parsed = JSON.parse(raw) as Partial<KioskSettings>
    return {
      fixedDisciplineId: typeof parsed.fixedDisciplineId === 'string' && parsed.fixedDisciplineId ? parsed.fixedDisciplineId : 'all',
      rotationSeconds: Number(parsed.rotationSeconds) >= 5 ? Number(parsed.rotationSeconds) : 12,
      autoFullscreen: Boolean(parsed.autoFullscreen),
    }
  } catch {
    return getDefaultKioskSettings()
  }
}

function panelLabel(panel: RotatingPanel) {
  return panel === 'timeline' ? 'Timeline' : panel === 'recent' ? 'Resultados' : panel === 'history' ? 'Historial' : 'Avisos'
}

function weatherCodeLabel(code: number | undefined) {
  switch (code) {
    case 0:
      return 'Despejado'
    case 1:
    case 2:
    case 3:
      return 'Parcial nublado'
    case 45:
    case 48:
      return 'Neblina'
    case 51:
    case 53:
    case 55:
    case 56:
    case 57:
    case 61:
    case 63:
    case 65:
    case 66:
    case 67:
    case 80:
    case 81:
    case 82:
      return 'Lluvia'
    case 71:
    case 73:
    case 75:
    case 77:
    case 85:
    case 86:
      return 'Nieve'
    case 95:
    case 96:
    case 99:
      return 'Tormenta'
    default:
      return 'Variable'
  }
}

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
  const autoFullscreenAttemptedRef = useRef(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [kioskSettings, setKioskSettings] = useState<KioskSettings>(() => readStoredKioskSettings())
  const [activePanel, setActivePanel] = useState<RotatingPanel>('timeline')
  const [updatedMatchIds, setUpdatedMatchIds] = useState<string[]>([])
  const [changePulse, setChangePulse] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [viewportSize, setViewportSize] = useState(() => ({
    width: typeof window === 'undefined' ? 1920 : window.innerWidth,
    height: typeof window === 'undefined' ? 1080 : window.innerHeight,
  }))

  useEffect(() => {
    window.localStorage.setItem(KIOSK_SETTINGS_STORAGE_KEY, JSON.stringify(kioskSettings))
  }, [kioskSettings])

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const updateViewportSize = () => {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight })
    }

    updateViewportSize()
    window.addEventListener('resize', updateViewportSize)
    return () => window.removeEventListener('resize', updateViewportSize)
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => {
      setActivePanel((current) => {
        const index = ROTATING_PANELS.indexOf(current)
        return ROTATING_PANELS[(index + 1) % ROTATING_PANELS.length]
      })
    }, kioskSettings.rotationSeconds * 1000)

    return () => window.clearInterval(id)
  }, [kioskSettings.rotationSeconds])

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  useEffect(() => {
    if (!kioskSettings.autoFullscreen) return
    if (autoFullscreenAttemptedRef.current) return
    autoFullscreenAttemptedRef.current = true

    if (document.fullscreenElement || !containerRef.current) return
    void containerRef.current.requestFullscreen().catch(() => undefined)
  }, [kioskSettings.autoFullscreen])

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
    kioskSettings.fixedDisciplineId !== 'all' && disciplinas.some((disciplina) => disciplina.id === kioskSettings.fixedDisciplineId)
      ? kioskSettings.fixedDisciplineId
      : undefined

  const visibleDisciplineLabel =
    effectiveDisciplineId ? disciplinas.find((disciplina) => disciplina.id === effectiveDisciplineId)?.nombre || 'Disciplina fija' : 'Todas las disciplinas'

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

  const weatherQ = useQuery({
    queryKey: ['weather', 'san-fernando-cl'],
    queryFn: async () => {
      const response = await fetch(SAN_FERNANDO_WEATHER_URL)
      if (!response.ok) throw new Error('No se pudo consultar la meteorología de San Fernando.')
      return (await response.json()) as OpenMeteoResponse
    },
    staleTime: 10 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
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
  const isCompactFullscreen = isFullscreen && (viewportSize.height < 940 || viewportSize.width < 1600)
  const isUltraCompactFullscreen = isFullscreen && (viewportSize.height < 820 || viewportSize.width < 1366)

  const visibleTodayMatches = useMemo(() => {
    if (!isFullscreen) return partidosDeHoy.slice(0, 6)
    if (isUltraCompactFullscreen) return partidosDeHoy.slice(0, 3)
    if (isCompactFullscreen) return partidosDeHoy.slice(0, 4)
    return partidosDeHoy.slice(0, 5)
  }, [isCompactFullscreen, isFullscreen, isUltraCompactFullscreen, partidosDeHoy])

  const visibleUpcomingMatches = useMemo(() => {
    if (!isFullscreen) return proximos
    if (isUltraCompactFullscreen) return proximos.slice(0, 2)
    if (isCompactFullscreen) return proximos.slice(0, 3)
    return proximos.slice(0, 4)
  }, [isCompactFullscreen, isFullscreen, isUltraCompactFullscreen, proximos])

  const visibleRecentResults = useMemo(() => {
    if (!isFullscreen) return resultadosRecientes
    if (isUltraCompactFullscreen) return resultadosRecientes.slice(0, 2)
    if (isCompactFullscreen) return resultadosRecientes.slice(0, 3)
    return resultadosRecientes.slice(0, 4)
  }, [isCompactFullscreen, isFullscreen, isUltraCompactFullscreen, resultadosRecientes])

  const weatherSummary = useMemo<WeatherSummary | null>(() => {
    const current = weatherQ.data?.current
    const daily = weatherQ.data?.daily

    if (!current) return null

    return {
      temperature: Math.round(Number(current.temperature_2m ?? 0)),
      apparent: Math.round(Number(current.apparent_temperature ?? 0)),
      wind: Math.round(Number(current.wind_speed_10m ?? 0)),
      label: weatherCodeLabel(current.weather_code),
      max: Math.round(Number(daily?.temperature_2m_max?.[0] ?? current.temperature_2m ?? 0)),
      min: Math.round(Number(daily?.temperature_2m_min?.[0] ?? current.temperature_2m ?? 0)),
      rain: Math.round(Number(daily?.precipitation_probability_max?.[0] ?? 0)),
    }
  }, [weatherQ.data])

  const weatherStatusLabel = weatherQ.isPending
    ? 'Cargando clima de San Fernando...'
    : weatherQ.isError
      ? 'Clima no disponible en este momento'
      : weatherSummary
        ? `San Fernando, CL · ${weatherSummary.temperature}°C · ${weatherSummary.label} · Lluvia ${weatherSummary.rain}%`
        : 'Sin datos meteorológicos todavía'

  const weatherDetailLabel = weatherQ.isError
    ? (weatherQ.error as Error)?.message || 'La consulta meteorológica falló y el kiosco la estaba ocultando por completo.'
    : weatherQ.isPending
      ? 'La consulta meteorológica sigue en curso. El fixture debe seguir visible mientras tanto.'
      : 'Meteorología gratuita activa con Open-Meteo para San Fernando, Chile.'

  const weatherCards = weatherSummary
    ? [
        { label: 'Meteorología', value: weatherSummary.label },
        { label: 'Temperatura', value: `${weatherSummary.temperature}°C` },
        { label: 'Máx / mín', value: `${weatherSummary.max}° / ${weatherSummary.min}°` },
        { label: 'Lluvia / viento', value: `${weatherSummary.rain}% · ${weatherSummary.wind} km/h` },
      ]
    : [
        { label: 'Meteorología', value: weatherQ.isError ? 'No disponible' : 'Cargando...' },
        { label: 'Temperatura', value: 'Sin dato' },
        { label: 'Máx / mín', value: 'Sin dato' },
        { label: 'Lluvia / viento', value: 'Sin dato' },
      ]

  const fullscreenPaddingClass = isUltraCompactFullscreen
    ? 'max-w-[1880px] gap-2 px-[clamp(10px,1.3vw,18px)] py-[clamp(10px,1.3vh,16px)]'
    : isCompactFullscreen
      ? 'max-w-[1900px] gap-3 px-[clamp(12px,1.5vw,22px)] py-[clamp(12px,1.5vh,20px)]'
      : 'max-w-[1920px] gap-3 px-[clamp(16px,1.8vw,28px)] py-[clamp(14px,1.8vh,24px)]'

  const fullscreenMainGridClass = isUltraCompactFullscreen
    ? 'flex-1 min-h-0 gap-2 xl:grid-cols-12 xl:grid-rows-[minmax(0,1.12fr)_minmax(0,0.88fr)]'
    : isCompactFullscreen
      ? 'flex-1 min-h-0 gap-3 xl:grid-cols-12 xl:grid-rows-[minmax(0,1.15fr)_minmax(0,0.85fr)]'
      : 'flex-1 min-h-0 gap-3 xl:grid-cols-12 xl:grid-rows-[minmax(0,1.2fr)_minmax(0,0.8fr)] 2xl:gap-4'

  const heroTitleClass = isUltraCompactFullscreen
    ? 'text-2xl md:text-3xl'
    : isCompactFullscreen
      ? 'text-3xl md:text-[2.15rem]'
      : 'text-3xl md:text-4xl'

  const heroTeamClass = isUltraCompactFullscreen
    ? 'text-4xl xl:text-5xl'
    : isCompactFullscreen
      ? 'text-5xl xl:text-[3.4rem]'
      : 'text-5xl xl:text-6xl'

  const liveHeroTeamClass = isUltraCompactFullscreen
    ? 'text-5xl xl:text-6xl'
    : isCompactFullscreen
      ? 'text-[3.4rem] xl:text-[4rem]'
      : 'text-6xl xl:text-7xl'

  const scoreClass = isUltraCompactFullscreen
    ? 'text-5xl xl:text-6xl'
    : isCompactFullscreen
      ? 'text-6xl xl:text-[4.5rem]'
      : 'text-6xl xl:text-7xl'

  const liveScoreClass = isUltraCompactFullscreen
    ? 'text-6xl xl:text-7xl'
    : isCompactFullscreen
      ? 'text-[4.5rem] xl:text-[5rem]'
      : 'text-7xl xl:text-8xl'

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

      <div
        className={`relative mx-auto flex min-h-dvh w-full flex-col ${
          isFullscreen
            ? `h-dvh overflow-hidden ${fullscreenPaddingClass}`
            : 'max-w-[1800px] gap-6 p-4 md:p-8'
        }`}
      >
        <header className={`flex flex-col ${isFullscreen ? 'gap-3 md:flex-row md:items-start md:justify-between' : 'gap-4 md:flex-row md:items-center md:justify-between'}`}>
          <div className="flex items-center gap-4">
            <div className={`grid place-items-center rounded-2xl bg-white p-3 shadow-lg ${isUltraCompactFullscreen ? 'h-14 w-14' : isCompactFullscreen ? 'h-16 w-16' : 'h-20 w-20'}`}>
              <img src="/SLEPCOLCHAGUA.webp" alt="SLEP Colchagua" className="h-full w-full object-contain" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-white/70">Modo kiosco</p>
              <h1 className={`font-display font-semibold ${isFullscreen ? heroTitleClass : 'text-4xl md:text-5xl'}`}>Fixture en vivo</h1>
              <p className="text-white/75">{campeonato?.nombre || 'Campeonato Deportivo SLEP Colchagua'}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/85">
                <Badge className="border border-white/15 bg-white/10 px-3 py-1 text-white">{relativeUpdatedText}</Badge>
                {changePulse ? <Badge className="border border-emerald-300/30 bg-emerald-400/15 px-3 py-1 text-emerald-100">{changePulse}</Badge> : null}
                <Badge className={`border px-3 py-1 ${weatherQ.isError ? 'border-amber-300/35 bg-amber-400/15 text-amber-50' : 'border-white/15 bg-white/10 text-white'}`}>
                  {weatherStatusLabel}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 md:items-end">
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-white/25 bg-white/10 text-white hover:bg-white/15"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings2 className="h-4 w-4" />
                Operador
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-white/25 bg-white/10 text-white hover:bg-white/15"
                onClick={toggleFullscreen}
              >
                {isFullscreen ? <Minimize className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
                {isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
              </Button>
            </div>
            <KioscoClock />
          </div>
        </header>

        <div className={`flex flex-wrap items-center gap-2 rounded-2xl border border-white/15 bg-white/10 backdrop-blur-sm ${isUltraCompactFullscreen ? 'p-2' : isFullscreen ? 'p-2.5' : 'p-3'}`}>
          <Badge className="border border-white/15 bg-white/5 px-3 py-1 text-white">Disciplina visible</Badge>
          <Badge className="border border-white/15 bg-white/5 px-3 py-1 text-white">{visibleDisciplineLabel}</Badge>
          <Badge className="border border-white/15 bg-white/5 px-3 py-1 text-white">Rotación {kioskSettings.rotationSeconds}s</Badge>
          {kioskSettings.autoFullscreen ? <Badge className="border border-white/15 bg-white/5 px-3 py-1 text-white">Fullscreen auto</Badge> : null}
          <Button
            type="button"
            size="sm"
            variant={kioskSettings.fixedDisciplineId === 'all' ? 'secondary' : 'outline'}
            className={kioskSettings.fixedDisciplineId === 'all' ? 'bg-white text-primary' : 'border-white/25 bg-transparent text-white hover:bg-white/10'}
            onClick={() => setKioskSettings((current) => ({ ...current, fixedDisciplineId: 'all' }))}
          >
            Todas
          </Button>
          {disciplinas.map((disciplina) => (
            <Button
              key={disciplina.id}
              type="button"
              size="sm"
              variant={kioskSettings.fixedDisciplineId === disciplina.id ? 'secondary' : 'outline'}
              className={kioskSettings.fixedDisciplineId === disciplina.id ? 'bg-white text-primary' : 'border-white/25 bg-transparent text-white hover:bg-white/10'}
              onClick={() => setKioskSettings((current) => ({ ...current, fixedDisciplineId: disciplina.id }))}
            >
              {disciplina.nombre}
            </Button>
          ))}
        </div>

        <div className={`grid gap-3 ${isUltraCompactFullscreen ? 'grid-cols-2 xl:grid-cols-4' : 'grid-cols-2 md:grid-cols-4'}`}>
          {weatherCards.map((item) => (
            <div
              key={item.label}
              className={`rounded-2xl border px-4 py-3 backdrop-blur-sm transition-all duration-500 ${
                weatherQ.isError ? 'border-amber-300/25 bg-amber-400/10' : 'border-white/15 bg-white/10'
              }`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">{item.label}</p>
              <p className={`mt-1 font-semibold text-white ${isUltraCompactFullscreen ? 'text-base' : 'text-lg'}`}>{item.value}</p>
            </div>
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
          <div className={`grid min-h-0 ${isFullscreen ? fullscreenMainGridClass : 'gap-6 xl:grid-cols-[1.25fr_0.75fr]'}`}>
            <Card className={`border-white/20 bg-white/95 shadow-2xl transition-all duration-500 ${partidoEnCurso ? 'ring-4 ring-emerald-300/60 shadow-emerald-200/50' : ''} ${isFullscreen ? 'h-full xl:col-span-7' : ''}`}>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 font-display text-primary ${isUltraCompactFullscreen ? 'text-2xl' : 'text-3xl'}`}>
                  <Activity className="h-5 w-5" />
                  {partidoEnCurso ? 'Partido en vivo' : 'Próximo partido'}
                </CardTitle>
              </CardHeader>
              <CardContent className={isFullscreen ? `min-h-0 overflow-hidden ${isUltraCompactFullscreen ? 'space-y-3' : 'space-y-4'}` : ''}>
                {partidoDestacado ? (
                  <div className={`transition-all duration-500 ${isUltraCompactFullscreen ? 'space-y-3' : isFullscreen ? 'space-y-4' : 'space-y-6'} ${partidoEnCurso ? 'rounded-2xl bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.18),transparent_55%)] p-2' : ''}`}>
                    <div className="flex flex-wrap gap-2">
                      <Badge className="px-3 py-1 text-[11px] uppercase tracking-wide">{partidoDestacado.disciplina}</Badge>
                      <Badge>{partidoDestacado.genero}</Badge>
                      <Badge variant="secondary">{partidoDestacado.grupo || partidoDestacado.fase}</Badge>
                      <Badge variant="muted">{partidoDestacado.categoria}</Badge>
                      {updatedMatchIds.includes(partidoDestacado.id) ? <Badge variant="live">Actualizado</Badge> : null}
                      {partidoEnCurso ? <Badge variant="live">Se prioriza automáticamente</Badge> : null}
                    </div>
                    <div className={`grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center ${isUltraCompactFullscreen ? 'gap-3' : isFullscreen ? 'gap-4' : 'gap-6'}`}>
                      <p className={`line-clamp-2 font-display font-semibold leading-none text-primary transition-all duration-500 ${partidoEnCurso ? liveHeroTeamClass : heroTeamClass}`}>
                        {partidoDestacado.localNombre}
                      </p>
                      <div className="text-center">
                        {partidoDestacado.estado === 'finalizado' || partidoDestacado.estado === 'en_curso' ? (
                          <div className={`font-score font-bold tabular-nums text-secondary transition-all duration-500 ${partidoEnCurso ? liveScoreClass : scoreClass}`}>
                            {Number(partidoDestacado.marcadorLocal || 0)}:{Number(partidoDestacado.marcadorVisita || 0)}
                          </div>
                        ) : (
                          <p className={`font-display font-bold text-secondary ${scoreClass}`}>VS</p>
                        )}
                        <p className={`mt-2 font-semibold text-muted ${isUltraCompactFullscreen ? 'text-sm' : 'text-base'}`}>
                          {formatPartidoDateKey(partidoDestacado.fecha)} · {formatPartidoTime(partidoDestacado.hora)}
                        </p>
                      </div>
                      <p className={`line-clamp-2 font-display font-semibold leading-none text-primary transition-all duration-500 md:text-right ${partidoEnCurso ? liveHeroTeamClass : heroTeamClass}`}>
                        {partidoDestacado.visitaNombre}
                      </p>
                    </div>
                    <p className={`flex items-center gap-2 font-semibold text-muted ${isUltraCompactFullscreen ? 'text-base' : 'text-lg'}`}>
                      <MapPin className="h-5 w-5" />
                      {partidoDestacado.lugar}
                    </p>
                    {proximoMismoRecinto ? (
                      <div className={`rounded-2xl border border-primary/10 bg-primary/5 ${isUltraCompactFullscreen ? 'p-3' : 'p-4'}`}>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Después de este partido</p>
                        <p className={`mt-1 font-semibold text-primary ${isUltraCompactFullscreen ? 'text-base' : 'text-lg'}`}>
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

            <Card className={`border-white/20 bg-white/95 shadow-2xl ${isFullscreen ? 'h-full xl:col-span-5' : ''}`}>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 font-display text-primary ${isUltraCompactFullscreen ? 'text-2xl' : 'text-3xl'}`}>
                  <Clock className="h-5 w-5" />
                  Partidos de hoy
                </CardTitle>
              </CardHeader>
              <CardContent className={`space-y-3 ${isFullscreen ? 'min-h-0 overflow-hidden' : ''}`}>
                {visibleTodayMatches.length ? (
                  <div className="stagger-children space-y-3">
                    {visibleTodayMatches.map((p) => (
                    <div key={p.id} className={`rounded-xl border border-primary/10 bg-surface transition ${updatedMatchIds.includes(p.id) ? 'ring-2 ring-emerald-300/70 shadow-lg shadow-emerald-200/40' : ''} ${isUltraCompactFullscreen ? 'p-2.5' : isFullscreen ? 'p-3' : 'p-4'}`}>
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className={`font-score font-bold text-primary ${isUltraCompactFullscreen ? 'text-xl' : 'text-2xl'}`}>{formatPartidoTime(p.hora)}</span>
                        <Badge variant={p.estado === 'en_curso' ? 'live' : 'default'}>{p.estado}</Badge>
                      </div>
                      <div className="mb-2 flex flex-wrap gap-2">
                        <Badge className="px-2.5 py-1 text-[11px] uppercase tracking-wide">{p.disciplina}</Badge>
                        <Badge variant="muted">{p.categoria}</Badge>
                      </div>
                      <p className={`line-clamp-2 font-semibold text-primary ${isUltraCompactFullscreen ? 'text-base' : 'text-lg'}`}>
                        {p.localNombre} vs {p.visitaNombre}
                      </p>
                      <p className="text-xs text-muted">{p.genero} · {p.grupo || p.fase}</p>
                    </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted">No hay partidos para hoy.</p>
                )}
              </CardContent>
            </Card>

            <Card className={`border-white/20 bg-white/95 shadow-2xl ${isFullscreen ? 'h-full xl:col-span-7' : 'xl:col-span-2'}`}>
              <CardHeader>
                <CardTitle className={`font-display text-primary ${isUltraCompactFullscreen ? 'text-2xl' : 'text-3xl'}`}>Próximos encuentros</CardTitle>
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <CardTitle className={`font-display text-primary ${isUltraCompactFullscreen ? 'text-2xl' : 'text-3xl'}`}>Panel rotativo</CardTitle>
                  <div className="flex flex-wrap gap-2">
                    {ROTATING_PANELS.map((panel) => (
                      <Button
                        key={panel}
                        type="button"
                        size="sm"
                        variant={activePanel === panel ? 'secondary' : 'outline'}
                        onClick={() => setActivePanel(panel)}
                      >
                        {panelLabel(panel)}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className={`overflow-hidden ${isFullscreen ? 'flex h-full min-h-0 flex-col' : ''}`}>
                <div key={activePanel} className={`animate-fade-up transition-all duration-700 ${isUltraCompactFullscreen ? 'min-h-[220px]' : isCompactFullscreen ? 'min-h-[260px]' : isFullscreen ? 'min-h-[320px]' : 'min-h-[260px]'}`}>
                {activePanel === 'timeline' ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-primary">
                      <Timeline className="h-5 w-5" />
                      <p className="text-sm font-semibold">Línea de tiempo de hoy</p>
                    </div>
                    <div className={`${isFullscreen ? `grid gap-3 md:grid-cols-2 ${isUltraCompactFullscreen ? 'xl:grid-cols-3' : 'xl:grid-cols-4'}` : 'flex gap-3 overflow-x-auto pb-2'} stagger-children`}>
                      {visibleTodayMatches.length ? (
                        visibleTodayMatches.map((p) => (
                          <div key={p.id} className={`rounded-2xl border border-primary/10 bg-white ${isUltraCompactFullscreen ? 'p-2.5' : isFullscreen ? 'p-3' : 'min-w-[260px] p-4'} ${updatedMatchIds.includes(p.id) ? 'ring-2 ring-emerald-300/70' : ''}`}>
                            <p className={`font-score font-bold text-secondary ${isUltraCompactFullscreen ? 'text-base' : 'text-lg'}`}>{formatPartidoTime(p.hora)}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Badge className="px-2.5 py-1 text-[11px] uppercase tracking-wide">{p.disciplina}</Badge>
                              <Badge variant="muted">{p.lugar}</Badge>
                            </div>
                            <p className={`mt-3 line-clamp-2 font-semibold text-primary ${isUltraCompactFullscreen ? 'text-base' : 'text-lg'}`}>{p.localNombre}</p>
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
                    <div className={`stagger-children grid gap-3 md:grid-cols-2 ${isUltraCompactFullscreen ? 'xl:grid-cols-2' : 'xl:grid-cols-3'}`}>
                      {visibleRecentResults.length ? (
                        visibleRecentResults.map((p) => (
                          <div key={p.id} className={`rounded-xl border border-primary/10 bg-white ${isUltraCompactFullscreen ? 'p-2.5' : isFullscreen ? 'p-3' : 'p-4'} ${updatedMatchIds.includes(p.id) ? 'ring-2 ring-emerald-300/70' : ''}`}>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/60">{formatPartidoDateLabel(p.fecha)}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Badge className="px-2.5 py-1 text-[11px] uppercase tracking-wide">{p.disciplina}</Badge>
                              <Badge variant="muted">{p.categoria}</Badge>
                            </div>
                            <p className="mt-3 line-clamp-2 text-sm font-semibold text-primary">{p.localNombre} vs {p.visitaNombre}</p>
                            <p className={`font-score mt-2 font-bold text-secondary ${isUltraCompactFullscreen ? 'text-2xl' : 'text-3xl'}`}>
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
                    <div className={`stagger-children grid gap-3 ${isUltraCompactFullscreen ? 'md:grid-cols-2 xl:grid-cols-2' : 'md:grid-cols-3'}`}>
                      {historialCruce.length ? (
                        historialCruce.map((p) => (
                          <div key={p.id} className={`rounded-xl border border-primary/10 bg-white ${isUltraCompactFullscreen ? 'p-3' : 'p-4'}`}>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/60">{formatPartidoDateLabel(p.fecha)}</p>
                            <p className="mt-2 text-sm font-semibold text-primary">{p.localNombre} vs {p.visitaNombre}</p>
                            <p className={`font-score mt-2 font-bold text-secondary ${isUltraCompactFullscreen ? 'text-2xl' : 'text-3xl'}`}>
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
                    <div className={`stagger-children grid gap-3 ${isUltraCompactFullscreen ? 'md:grid-cols-1 xl:grid-cols-2' : 'md:grid-cols-2'}`}>
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
                    <div className={`rounded-2xl border border-dashed p-4 text-sm ${weatherQ.isError ? 'border-amber-300/35 bg-amber-50 text-amber-900' : 'border-primary/20 bg-primary/5 text-muted'}`}>
                      {weatherDetailLabel} Si luego quieres pronóstico por sede exacta, solo hay que cambiar latitud y longitud.
                    </div>
                  </div>
                ) : null}
                </div>
              </CardContent>
            </Card>

            <Card className={`border-white/20 bg-white/95 shadow-2xl ${isFullscreen ? 'h-full xl:col-span-5' : 'xl:col-span-2'}`}>
              <CardHeader>
                <CardTitle className={`font-display text-primary ${isUltraCompactFullscreen ? 'text-2xl' : 'text-3xl'}`}>Próximos encuentros</CardTitle>
              </CardHeader>
              <CardContent className={`grid gap-3 ${isUltraCompactFullscreen ? 'md:grid-cols-1 xl:grid-cols-1' : isFullscreen ? 'md:grid-cols-2 xl:grid-cols-2' : 'md:grid-cols-2 xl:grid-cols-4'}`}>
                {visibleUpcomingMatches.length ? (
                  visibleUpcomingMatches.map((p) => (
                    <div key={p.id} className={`rounded-xl border border-primary/10 bg-white ${isUltraCompactFullscreen ? 'p-2.5' : 'p-3'} ${updatedMatchIds.includes(p.id) ? 'ring-2 ring-emerald-300/70' : ''}`}>
                      <p className={`font-score font-bold text-secondary ${isUltraCompactFullscreen ? 'text-xs' : 'text-sm'}`}>
                        {formatPartidoDateKey(p.fecha)} · {formatPartidoTime(p.hora)}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge className="px-2.5 py-1 text-[11px] uppercase tracking-wide">{p.disciplina}</Badge>
                        <Badge variant="muted">{p.categoria}</Badge>
                      </div>
                      <p className={`mt-1 line-clamp-2 font-semibold text-primary ${isUltraCompactFullscreen ? 'text-xs' : 'text-sm'}`}>
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

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configuración del operador</DialogTitle>
            <DialogDescription>
              Fija una disciplina, ajusta la rotación del carrusel y define si el kiosco debe intentar abrir en pantalla completa.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="kiosk-discipline">Disciplina fija</Label>
              <select
                id="kiosk-discipline"
                className="h-10 w-full rounded-lg border border-black/10 bg-white px-3 text-sm"
                value={kioskSettings.fixedDisciplineId}
                onChange={(e) => setKioskSettings((current) => ({ ...current, fixedDisciplineId: e.target.value }))}
              >
                <option value="all">Todas las disciplinas</option>
                {disciplinas.map((disciplina) => (
                  <option key={disciplina.id} value={disciplina.id}>
                    {disciplina.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="kiosk-rotation">Rotación del carrusel (segundos)</Label>
              <Input
                id="kiosk-rotation"
                type="number"
                min={5}
                max={60}
                value={kioskSettings.rotationSeconds}
                onChange={(e) => {
                  const next = Math.min(60, Math.max(5, Number(e.target.value || 12)))
                  setKioskSettings((current) => ({ ...current, rotationSeconds: next }))
                }}
              />
            </div>

            <label className="flex items-center justify-between gap-3 rounded-xl border border-primary/10 bg-primary/5 px-4 py-3 text-sm font-medium text-primary">
              <span>Intentar pantalla completa al abrir</span>
              <input
                type="checkbox"
                className="h-4 w-4 accent-[#25306B]"
                checked={kioskSettings.autoFullscreen}
                onChange={(e) => setKioskSettings((current) => ({ ...current, autoFullscreen: e.target.checked }))}
              />
            </label>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setKioskSettings(getDefaultKioskSettings())}>
                Restablecer
              </Button>
              <Button type="button" onClick={() => setSettingsOpen(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
