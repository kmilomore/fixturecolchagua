import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { api } from '@/api/gasClient'
import { hasGasUrl } from '@/config'
import { MatchCard } from '@/components/MatchCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { matchesTeamSearch, sortMatches } from '@/utils/matches'

export function MisPartidosPage() {
  const [search, setSearch] = useState('')

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
    queryKey: ['partidos', campeonato?.id, 'mis-partidos'],
    queryFn: () => api.partidos.query({ campeonatoId: campeonato!.id }),
    enabled: hasGasUrl && Boolean(campeonato?.id),
    staleTime: 5 * 60 * 1000,
  })

  const resultados = useMemo(() => {
    const rows = partidosQ.data || []
    if (!search.trim()) return []
    return rows.filter((p) => matchesTeamSearch(p, search)).sort(sortMatches)
  }, [partidosQ.data, search])

  if (!hasGasUrl) return <p className="text-muted">Configura VITE_GAS_URL en .env.local</p>

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-white/20 bg-[image:var(--gradient-brand)] px-5 py-7 text-white shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Vista pública</p>
            <h1 className="font-display text-3xl font-semibold">Mis partidos</h1>
            <p className="mt-1 max-w-2xl text-sm text-white/75">
              Busca tu establecimiento para ver solo sus partidos programados y resultados.
            </p>
          </div>
          {campeonato ? (
            <Button asChild className="bg-white text-primary hover:bg-white/90">
              <Link to={`/campeonatos/${campeonato.id}/calendario`}>Ver calendario completo</Link>
            </Button>
          ) : null}
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Buscar establecimiento</CardTitle>
          <CardDescription>
            {campeonato
              ? `Buscas sobre ${campeonato.nombre}. Ejemplo: British, Marista, Angostura, Washington.`
              : 'Ejemplo: British, Marista, Angostura, Washington.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nombre del colegio o establecimiento"
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {campeonatosQ.isLoading || partidosQ.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : partidosQ.isError ? (
        <Card>
          <CardHeader>
            <CardTitle>No se pudo cargar la búsqueda</CardTitle>
            <CardDescription>{(partidosQ.error as Error).message}</CardDescription>
          </CardHeader>
        </Card>
      ) : !campeonato ? (
        <Card>
          <CardHeader>
            <CardTitle>Todavía no hay fixture publicado</CardTitle>
            <CardDescription>Cuando exista un campeonato activo, aquí podrás filtrar por establecimiento.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link to="/campeonatos">Ver campeonatos</Link>
            </Button>
          </CardContent>
        </Card>
      ) : search.trim() ? (
        resultados.length ? (
          <div className="space-y-3">
            <p className="text-sm text-muted">
              {resultados.length} partidos encontrados para “{search.trim()}”.
            </p>
            <div className="stagger-children space-y-3">
              {resultados.map((p) => (
                <MatchCard key={p.id} partido={p} />
              ))}
            </div>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Sin coincidencias</CardTitle>
              <CardDescription>
                No encontramos partidos para “{search.trim()}” en {campeonato.nombre}. Prueba con una parte del nombre del establecimiento.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => setSearch('')}>
                Limpiar búsqueda
              </Button>
              <Button asChild>
                <Link to={`/campeonatos/${campeonato.id}/calendario`}>Ver calendario completo</Link>
              </Button>
            </CardContent>
          </Card>
        )
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Empieza por tu establecimiento</CardTitle>
            <CardDescription>Escribe una parte del nombre y te mostraremos solo sus partidos y resultados.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => setSearch('Liceo')}>
              Probar con “Liceo”
            </Button>
            <Button asChild>
              <Link to={`/campeonatos/${campeonato.id}/calendario`}>Ir al calendario</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
