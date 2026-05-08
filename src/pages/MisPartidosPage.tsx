import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, Star } from 'lucide-react'
import { api } from '@/api/gasClient'
import { hasGasUrl } from '@/config'
import { MatchCard } from '@/components/MatchCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { matchesTeamSearch, sortMatches } from '@/utils/matches'

const FAVORITES_KEY = 'slep_mis_partidos_favorites_v1'

function readFavorites() {
  if (typeof window === 'undefined') return [] as string[]
  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : []
  } catch {
    return []
  }
}

function writeFavorites(values: string[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(values))
}

export function MisPartidosPage() {
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState(params.get('search') || '')
  const [favorites, setFavorites] = useState<string[]>(() => readFavorites())

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

  const equiposQ = useQuery({
    queryKey: ['equipos', campeonato?.id, 'mis-partidos'],
    queryFn: () => api.equipos.getByCampeonato(campeonato!.id),
    enabled: hasGasUrl && Boolean(campeonato?.id),
    staleTime: 5 * 60 * 1000,
  })

  const establecimientoByTeamId = useMemo(() => {
    return Object.fromEntries((equiposQ.data || []).map((equipo) => [equipo.id, equipo.establecimiento]))
  }, [equiposQ.data])

  const establecimientos = useMemo(() => {
    return Array.from(new Set((equiposQ.data || []).map((equipo) => equipo.establecimiento).filter(Boolean))).sort((a, b) => a.localeCompare(b))
  }, [equiposQ.data])

  const suggestions = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return establecimientos.slice(0, 8)
    return establecimientos.filter((item) => item.toLowerCase().includes(q)).slice(0, 8)
  }, [establecimientos, search])

  useEffect(() => {
    setSearch(params.get('search') || '')
  }, [params])

  function updateSearch(value: string) {
    setSearch(value)
    const next = new URLSearchParams(params)
    if (value.trim()) next.set('search', value.trim())
    else next.delete('search')
    setParams(next, { replace: true })
  }

  function toggleFavorite(value: string) {
    const normalized = value.trim()
    if (!normalized) return
    const next = favorites.includes(normalized)
      ? favorites.filter((item) => item !== normalized)
      : [normalized, ...favorites].slice(0, 6)
    setFavorites(next)
    writeFavorites(next)
  }

  const resultados = useMemo(() => {
    const rows = partidosQ.data || []
    if (!search.trim()) return []
    const q = search.trim().toLowerCase()
    return rows
      .filter((p) => {
        const localEst = String(establecimientoByTeamId[p.localId] || '').toLowerCase()
        const visitaEst = String(establecimientoByTeamId[p.visitaId] || '').toLowerCase()
        return matchesTeamSearch(p, search) || localEst.includes(q) || visitaEst.includes(q)
      })
      .sort(sortMatches)
  }, [establecimientoByTeamId, partidosQ.data, search])

  if (!hasGasUrl) return <p className="text-muted">Configura VITE_GAS_URL en .env.local</p>

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-white/20 bg-[image:var(--gradient-brand)] px-4 py-6 text-white shadow-sm sm:px-5 sm:py-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Vista pública</p>
            <h1 className="font-display text-3xl font-semibold sm:text-4xl">Mis partidos</h1>
            <p className="mt-1 max-w-2xl text-sm text-white/75">
              Busca tu establecimiento para ver solo sus partidos programados y resultados.
            </p>
          </div>
          {campeonato ? (
            <Button asChild className="w-full bg-white text-primary hover:bg-white/90 md:w-auto">
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
              onChange={(e) => updateSearch(e.target.value)}
              placeholder="Nombre del colegio o establecimiento"
              className="pl-9"
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant={favorites.includes(search.trim()) ? 'default' : 'outline'} onClick={() => toggleFavorite(search)}>
              <Star className="h-4 w-4" />
              {favorites.includes(search.trim()) ? 'Quitar favorito' : 'Guardar favorito'}
            </Button>
            {search.trim() ? (
              <Button type="button" size="sm" variant="outline" onClick={() => updateSearch('')}>
                Limpiar
              </Button>
            ) : null}
          </div>

          {favorites.length ? (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/60">Favoritos</p>
              <div className="flex flex-wrap gap-2">
                {favorites.map((item) => (
                  <Button key={item} type="button" size="sm" variant="outline" onClick={() => updateSearch(item)}>
                    {item}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}

          {suggestions.length ? (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/60">Sugerencias</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((item) => (
                  <Button key={item} type="button" size="sm" variant="outline" onClick={() => updateSearch(item)}>
                    {item}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
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
            <CardContent className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setSearch('')}>
                Limpiar búsqueda
              </Button>
              <Button asChild className="w-full sm:w-auto">
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
          <CardContent className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setSearch('Liceo')}>
              Probar con “Liceo”
            </Button>
            <Button asChild className="w-full sm:w-auto">
              <Link to={`/campeonatos/${campeonato.id}/calendario`}>Ir al calendario</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
