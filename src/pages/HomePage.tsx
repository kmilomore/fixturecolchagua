import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '@/api/gasClient'
import { hasGasUrl } from '@/config'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { MatchCard } from '@/components/MatchCard'
import { formatPartidoDateKey, formatPartidoTime } from '@/utils/formatDate'

export function HomePage() {
  const q = useQuery({
    queryKey: ['campeonatos'],
    queryFn: () => api.campeonatos.getAll(),
    enabled: hasGasUrl,
    staleTime: 5 * 60 * 1000,
  })
  const activos = (q.data || []).filter((c) => c.estado === 'activo')
  const destacado = activos[0] || q.data?.[0]

  const partidosQ = useQuery({
    queryKey: ['partidos', destacado?.id, 'resumen-home'],
    queryFn: () => api.partidos.getResumen({ campeonatoId: destacado!.id }),
    enabled: hasGasUrl && Boolean(destacado?.id),
    staleTime: 5 * 60 * 1000,
  })

  if (!hasGasUrl) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Configura la API</CardTitle>
          <CardDescription>
            Crea <code className="rounded bg-black/5 px-1">frontend/.env.local</code> con{' '}
            <code className="rounded bg-black/5 px-1">VITE_GAS_URL</code> apuntando a tu Web App de Google Apps Script.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <a href="https://developers.google.com/apps-script/guides/web">Guía Web App</a>
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (q.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (q.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No se pudo cargar</CardTitle>
          <CardDescription>{(q.error as Error).message}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const siguiente = partidosQ.data?.siguiente || null
  const hoy = partidosQ.data?.hoy || []
  const heroStats = [
    { label: 'Campeonatos activos', value: activos.length || (q.data || []).length || 0 },
    { label: 'Partidos hoy', value: partidosQ.data?.totalHoy || 0 },
    { label: 'Próxima disciplina', value: siguiente?.disciplina || 'Por definir' },
  ]

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[28px] border border-white/10 bg-[image:var(--gradient-brand)] p-[1px] shadow-[0_30px_80px_-38px_rgba(20,30,75,0.7)]">
        <div className="relative rounded-[28px] bg-[image:linear-gradient(135deg,rgba(37,48,107,0.96),rgba(0,107,185,0.88))] px-4 py-8 text-white sm:px-6 sm:py-10">
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.16),transparent_58%)] md:block" />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-center">
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-white p-3 shadow-lg sm:h-24 sm:w-24">
              <img src="/SLEPCOLCHAGUA.webp" alt="SLEP Colchagua" className="h-full w-full object-contain" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/65">Portal oficial del fixture</p>
              <p className="mt-2 font-display text-2xl font-semibold tracking-wide sm:text-3xl md:text-5xl">Campeonato Deportivo</p>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80 md:text-base">
                Encuentra rápidamente tus partidos, revisa el calendario y sigue resultados del campeonato.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button asChild variant="secondary" className="w-full bg-white text-primary hover:bg-white/90 sm:w-auto">
                  <Link to="/campeonatos">Ver campeonatos</Link>
                </Button>
                <Button asChild variant="outline" className="w-full border-white/30 bg-white/5 text-white hover:bg-white/10 sm:w-auto">
                  <Link to="/mis-partidos">Buscar mis partidos</Link>
                </Button>
                <Button asChild variant="outline" className="w-full border-white/30 bg-white/5 text-white hover:bg-white/10 sm:w-auto">
                  <Link to="/kiosco">Modo kiosco</Link>
                </Button>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {heroStats.map((item) => (
                  <div key={item.label} className="glass-strip rounded-2xl border border-white/15 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">{item.label}</p>
                    <p className="mt-2 font-display text-xl font-semibold text-white sm:text-2xl">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-primary/10">
          <CardHeader>
            <CardTitle className="text-xl sm:text-2xl">Buscar mi colegio</CardTitle>
            <CardDescription>Vista rápida por establecimiento.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/mis-partidos">Ir a Mis partidos</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="border-primary/10">
          <CardHeader>
            <CardTitle className="text-xl sm:text-2xl">Ver fixture completo</CardTitle>
            <CardDescription>Calendario, partidos y grupos.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link to={destacado ? `/campeonatos/${destacado.id}/calendario` : '/campeonatos'}>Abrir calendario</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="border-primary/10">
          <CardHeader>
            <CardTitle className="text-xl sm:text-2xl">Pantalla del gimnasio</CardTitle>
            <CardDescription>Modo proyector para jornadas.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link to="/kiosco">Abrir kiosco</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {destacado ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Campeonato destacado</CardTitle>
              <CardDescription>Acceso rápido al fixture activo.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="font-display text-xl font-semibold text-primary sm:text-2xl">{destacado.nombre}</p>
                <p className="text-sm text-muted">
                  Año {destacado.año} · {destacado.estado}
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button asChild className="w-full sm:w-auto">
                  <Link to={`/campeonatos/${destacado.id}`}>Ir al campeonato</Link>
                </Button>
                <Button asChild variant="outline" className="w-full sm:w-auto">
                  <Link to={`/campeonatos/${destacado.id}/calendario`}>Calendario</Link>
                </Button>
                <Button asChild variant="outline" className="w-full sm:w-auto">
                  <Link to={`/campeonatos/${destacado.id}/grupos`}>Grupos</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <Card className="border-primary/10">
              <CardHeader>
                <CardTitle>Próximo partido</CardTitle>
                <CardDescription>El siguiente encuentro programado del campeonato activo.</CardDescription>
              </CardHeader>
              <CardContent>
                {partidosQ.isLoading ? (
                  <Skeleton className="h-32 w-full" />
                ) : siguiente ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <Badge className="px-3 py-1 text-[11px] uppercase tracking-wide">{siguiente.disciplina}</Badge>
                      <Badge>{siguiente.genero}</Badge>
                      <Badge variant="secondary">{siguiente.grupo || siguiente.fase}</Badge>
                      <Badge variant="muted">{siguiente.categoria}</Badge>
                    </div>
                    <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
                      <p className="font-display text-xl font-semibold text-primary sm:text-2xl">{siguiente.localNombre}</p>
                      <div className="text-center">
                        <p className="font-display text-3xl font-bold text-secondary">VS</p>
                        <p className="text-xs font-semibold text-muted">
                          {formatPartidoDateKey(siguiente.fecha)} · {formatPartidoTime(siguiente.hora)}
                        </p>
                      </div>
                      <p className="font-display text-xl font-semibold text-primary sm:text-2xl md:text-right">
                        {siguiente.visitaNombre}
                      </p>
                    </div>
                    <p className="text-sm text-muted">{siguiente.lugar}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted">No hay próximos partidos programados.</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-primary/10">
              <CardHeader>
                <CardTitle>Partidos de hoy</CardTitle>
                <CardDescription>{partidosQ.data?.totalHoy || 0} partidos para la fecha actual.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {partidosQ.isLoading ? (
                  <Skeleton className="h-28 w-full" />
                ) : hoy.length ? (
                  hoy.slice(0, 3).map((p) => <MatchCard key={p.id} partido={p} />)
                ) : (
                  <p className="text-sm text-muted">No hay partidos programados para hoy.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Sin datos todavía</CardTitle>
            <CardDescription>El fixture público aparecerá cuando el administrador publique un campeonato.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/admin">Ir a administración</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
