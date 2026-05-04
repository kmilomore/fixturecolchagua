import { useEffect, useMemo } from 'react'
import { NavLink, Outlet, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/gasClient'
import { hasGasUrl } from '@/config'
import { DisciplineFilter } from '@/components/DisciplineFilter'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'


export function CampeonatoLayout() {
  const { id } = useParams()
  const [params, setParams] = useSearchParams()

  const campeonatoQ = useQuery({
    queryKey: ['campeonato', id],
    queryFn: () => api.campeonatos.getById(id!),
    enabled: hasGasUrl && Boolean(id),
    staleTime: 5 * 60 * 1000,
  })

  const disciplinasQ = useQuery({
    queryKey: ['disciplinas', id],
    queryFn: () => api.disciplinas.getByCampeonato(id!),
    enabled: hasGasUrl && Boolean(id),
    staleTime: 5 * 60 * 1000,
  })

  const disciplinas = disciplinasQ.data || []
  const disciplinaId = params.get('disciplinaId') || disciplinas[0]?.id || ''
  const disciplinaActual = disciplinas.find((disciplina) => disciplina.id === disciplinaId) || disciplinas[0] || null
  const currentSearch = params.toString()

  const categoriasDisponibles = useMemo(() => {
    const d = disciplinas.find((x) => x.id === disciplinaId)
    if (!d?.categorias) return []
    return String(d.categorias)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }, [disciplinas, disciplinaId])

  useEffect(() => {
    if (!disciplinas.length) return
    const next = new URLSearchParams(params)
    let changed = false

    const currentDisciplinaId = next.get('disciplinaId')
    const disciplinaValida = currentDisciplinaId && disciplinas.some((disciplina) => disciplina.id === currentDisciplinaId)

    if (!disciplinaValida) {
      next.set('disciplinaId', disciplinas[0].id)
      changed = true
    }
    if (!next.get('genero')) {
      next.set('genero', 'Damas')
      changed = true
    }
    if (!next.get('fase')) {
      next.set('fase', 'grupos')
      changed = true
    }

    const curCat = next.get('categoria')
    if (categoriasDisponibles.length) {
      if (!curCat || !categoriasDisponibles.includes(curCat)) {
        next.set('categoria', categoriasDisponibles[0])
        changed = true
      }
    }

    if (changed) setParams(next, { replace: true })
  }, [disciplinas, disciplinaId, categoriasDisponibles, params, setParams])

  if (!hasGasUrl) return <p className="text-muted">Configura VITE_GAS_URL</p>

  if (campeonatoQ.isLoading || disciplinasQ.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-28 w-full" />
      </div>
    )
  }

  if (campeonatoQ.isError) {
    return <p className="text-accent">{(campeonatoQ.error as Error).message}</p>
  }

  const c = campeonatoQ.data

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-white/20 bg-[image:var(--gradient-brand)] shadow-sm">
        <div className="flex flex-col gap-4 px-5 py-6 text-white md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white p-2 shadow">
              <img src="/SLEPCOLCHAGUA.webp" alt="SLEP Colchagua" className="h-full w-full object-contain" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Campeonato</p>
              <h1 className="font-display text-3xl font-semibold">{c?.nombre}</h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-white/75">
                <p>
                  {c?.año} · {c?.estado}
                </p>
                {disciplinaActual ? (
                  <Badge className="border border-white/20 bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
                    {disciplinaActual.nombre}
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>
          <div className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/15">
            Fixture público
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-primary/10 bg-white p-2 shadow-sm">
        <NavLink
          to={{ pathname: `/campeonatos/${id}`, search: currentSearch ? `?${currentSearch}` : '' }}
          end
          className={({ isActive }) =>
            cn(
              'rounded-lg px-3 py-2 text-sm font-semibold',
              isActive ? 'bg-primary text-white' : 'text-primary/70 hover:bg-secondary/5',
            )
          }
        >
          Resumen
        </NavLink>
        {(
          [
            ['calendario', 'Calendario'],
            ['grupos', 'Grupos'],
            ['fases', 'Fases'],
            ['partidos', 'Partidos'],
          ] as const
        ).map(([path, label]) => (
          <NavLink
            key={path}
            to={{ pathname: `/campeonatos/${id}/${path}`, search: currentSearch ? `?${currentSearch}` : '' }}
            className={({ isActive }) =>
              cn(
                'rounded-lg px-3 py-2 text-sm font-semibold',
                isActive ? 'bg-primary text-white' : 'text-primary/70 hover:bg-secondary/5',
              )
            }
          >
            {label}
          </NavLink>
        ))}
      </div>

      <DisciplineFilter disciplinas={disciplinas} categoriasDisponibles={categoriasDisponibles} />

      <Outlet context={{ campeonatoId: id!, disciplinaId, disciplinas }} />
    </div>
  )
}
