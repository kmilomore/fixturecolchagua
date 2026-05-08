import { Link, useLocation, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/gasClient'
import { hasGasUrl } from '@/config'
import { Badge } from '@/components/ui/badge'
import { useCampeonatoOutlet } from '@/pages/campeonato/outletContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatPartidoDateKey, formatPartidoTime } from '@/utils/formatDate'
import type { Partido } from '@/types'

export function CampeonatoHome() {
  const { id } = useParams()
  const location = useLocation()
  const { campeonatoId, disciplinaId, disciplinas } = useCampeonatoOutlet()

  const campeonatoQ = useQuery({
    queryKey: ['campeonato', id],
    queryFn: () => api.campeonatos.getById(id!),
    enabled: hasGasUrl && Boolean(id),
    staleTime: 5 * 60 * 1000,
  })

  const partidosQ = useQuery({
    queryKey: ['partidos', campeonatoId, disciplinaId, 'preview'],
    queryFn: () =>
      api.partidos.query({
        campeonatoId,
        disciplinaId,
      }),
    enabled: hasGasUrl && Boolean(campeonatoId) && Boolean(disciplinaId),
    staleTime: 5 * 60 * 1000,
  })

  if (campeonatoQ.isLoading) return <Skeleton className="h-40 w-full" />
  const c = campeonatoQ.data
  const rows = (partidosQ.data || []) as Partido[]
  const now = new Date().toISOString()
  const todayKey = formatPartidoDateKey(now)
  const disciplinaActual = disciplinas.find((disciplina) => disciplina.id === disciplinaId) || null

  const partidosDeHoy = rows.filter((partido) => formatPartidoDateKey(partido.fecha) === todayKey)
  const proximos = [...rows]
    .filter((partido) => partido.estado !== 'finalizado' && partido.estado !== 'postergado')
    .sort((a, b) => `${formatPartidoDateKey(a.fecha)} ${formatPartidoTime(a.hora)}`.localeCompare(`${formatPartidoDateKey(b.fecha)} ${formatPartidoTime(b.hora)}`))

  const siguiente =
    rows.find((partido) => partido.estado === 'en_curso') ||
    proximos.find((partido) => `${formatPartidoDateKey(partido.fecha)}T${formatPartidoTime(partido.hora) || '00:00'}:00` >= now) ||
    proximos[0] ||
    null

  const finalizados = rows.filter((partido) => partido.estado === 'finalizado').length
  const enCurso = rows.filter((partido) => partido.estado === 'en_curso').length
  const recintosActivos = new Set(partidosDeHoy.map((partido) => partido.lugar).filter(Boolean)).size
  const faseActiva =
    rows.find((partido) => partido.estado === 'en_curso')?.fase ||
    proximos[0]?.fase ||
    rows[0]?.fase ||
    'grupos'

  const kpis = [
    { label: 'Partidos hoy', value: partidosDeHoy.length, tone: 'text-primary' },
    { label: 'En vivo', value: enCurso, tone: 'text-emerald-700' },
    { label: 'Finalizados', value: finalizados, tone: 'text-secondary' },
    { label: 'Recintos activos', value: recintosActivos, tone: 'text-primary' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="overflow-hidden border-primary/10 bg-[linear-gradient(135deg,rgba(37,48,107,0.08),rgba(0,107,185,0.05),rgba(255,255,255,0.96))]">
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-primary text-white">Dashboard</Badge>
              {disciplinaActual ? <Badge variant="secondary">{disciplinaActual.nombre}</Badge> : null}
              <Badge variant="muted">Fase dominante: {faseActiva}</Badge>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl text-primary sm:text-3xl">{c?.nombre}</CardTitle>
              <CardDescription className="max-w-2xl text-sm text-muted">
                {c?.descripcion || 'Este campeonato ya tiene una vista pública estructurada por disciplina, fases y calendario.'}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {kpis.map((item) => (
              <div key={item.label} className="rounded-2xl border border-primary/10 bg-white/90 p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{item.label}</p>
                <p className={`mt-2 font-score text-3xl font-bold sm:text-4xl ${item.tone}`}>{item.value}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-primary/10">
          <CardHeader>
            <CardTitle className="text-xl">Accesos rápidos</CardTitle>
            <CardDescription>Entradas priorizadas según la disciplina seleccionada.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Button asChild className="w-full justify-center">
              <Link to={{ pathname: `/campeonatos/${campeonatoId}/partidos`, search: location.search }}>Seguir jornada</Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-center">
              <Link to={{ pathname: `/campeonatos/${campeonatoId}/calendario`, search: location.search }}>Ver calendario completo</Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-center">
              <Link to={{ pathname: `/campeonatos/${campeonatoId}/grupos`, search: location.search }}>Ir a grupos y tablas</Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-center">
              <Link to={{ pathname: `/campeonatos/${campeonatoId}/fases`, search: location.search }}>Explorar fases</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-primary/10 shadow-sm">
          <CardHeader>
            <CardTitle>Próximo foco del campeonato</CardTitle>
            <CardDescription>
              {siguiente ? 'El dashboard prioriza el partido en curso o el siguiente programado.' : 'Todavía no hay partidos próximos para esta disciplina.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {siguiente ? (
              <div className="space-y-4 rounded-2xl border border-primary/10 bg-primary/5 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{siguiente.genero}</Badge>
                  <Badge variant="secondary">{siguiente.categoria}</Badge>
                  <Badge variant="muted">{siguiente.grupo || siguiente.fase}</Badge>
                  <Badge variant={siguiente.estado === 'en_curso' ? 'live' : 'default'}>{siguiente.estado}</Badge>
                </div>
                <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
                  <p className="font-display text-xl font-semibold leading-tight text-primary sm:text-2xl">{siguiente.localNombre}</p>
                  <div className="text-center">
                    <p className="font-score text-3xl font-bold text-secondary">{formatPartidoTime(siguiente.hora) || 'VS'}</p>
                    <p className="text-sm text-muted">{formatPartidoDateKey(siguiente.fecha)}</p>
                  </div>
                  <p className="font-display text-xl font-semibold leading-tight text-primary sm:text-2xl md:text-right">{siguiente.visitaNombre}</p>
                </div>
                <p className="text-sm text-muted">{siguiente.lugar}</p>
              </div>
            ) : (
              <p className="text-sm text-muted">No hay un partido destacado con los filtros actuales.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-sm">
          <CardHeader>
            <CardTitle>Hoy en esta disciplina</CardTitle>
            <CardDescription>
              {partidosDeHoy.length ? `Hay ${partidosDeHoy.length} partido(s) programados para hoy.` : 'No hay partidos para hoy con la disciplina activa.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {partidosDeHoy.slice(0, 4).map((partido) => (
              <div key={partido.id} className="rounded-xl border border-primary/10 bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-score text-xl font-bold text-secondary">{formatPartidoTime(partido.hora)}</p>
                  <Badge variant={partido.estado === 'en_curso' ? 'live' : 'default'}>{partido.estado}</Badge>
                </div>
                <p className="mt-2 font-semibold text-primary">{partido.localNombre} vs {partido.visitaNombre}</p>
                <p className="text-sm text-muted">{partido.lugar}</p>
              </div>
            ))}
            {!partidosDeHoy.length ? <p className="text-sm text-muted">No hay actividad cargada para hoy.</p> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
