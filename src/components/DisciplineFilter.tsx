import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Disciplina } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

export interface DisciplineFilterProps {
  disciplinas: Disciplina[]
  categoriasDisponibles: string[]
  className?: string
}

export function DisciplineFilter({ disciplinas, categoriasDisponibles, className }: DisciplineFilterProps) {
  const [params, setParams] = useSearchParams()
  const [mobileOpen, setMobileOpen] = useState(false)

  const disciplinaId = params.get('disciplinaId') || disciplinas[0]?.id || ''
  const disciplinaActual = disciplinas.find((disciplina) => disciplina.id === disciplinaId) || disciplinas[0] || null
  const genero = (params.get('genero') as 'Damas' | 'Varones' | null) || 'Damas'
  const categoria = params.get('categoria') || categoriasDisponibles[0] || ''
  const fase = params.get('fase') || 'grupos'

  const set = useCallback(
    (patch: Record<string, string>) => {
      const next = new URLSearchParams(params)
      Object.entries(patch).forEach(([k, v]) => {
        if (!v) next.delete(k)
        else next.set(k, v)
      })
      setParams(next, { replace: true })
    },
    [params, setParams],
  )

  const disciplinaTabs = useMemo(() => {
    if (!disciplinas.length) return null
    return (
      <Tabs
        value={disciplinaId}
        onValueChange={(v) => set({ disciplinaId: v, categoria: '' })}
        className="shrink-0"
      >
        <TabsList className="h-9 w-auto justify-start bg-transparent p-0">
          {disciplinas.map((d) => (
            <TabsTrigger
              key={d.id}
              value={d.id}
              className="border border-primary/10 bg-white text-primary/75 data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              {d.nombre}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    )
  }, [disciplinas, disciplinaId, set])

  if (!disciplinas.length) {
    return <p className="text-sm text-muted">No hay disciplinas cargadas para este campeonato.</p>
  }

  return (
    <div className={cn('rounded-xl border border-primary/10 bg-white p-3 shadow-sm', className)}>
      <div className="flex flex-col gap-3 border-b border-primary/10 px-1 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/55">Disciplina activa</p>
          <p className="text-sm font-semibold text-primary">{disciplinaActual?.nombre || 'Sin disciplina'}</p>
          <p className="mt-1 text-xs text-muted">Desliza para cambiar filtros en pantallas pequeñas.</p>
        </div>
        <div className="flex items-center gap-2">
          {disciplinaActual ? <Badge className="px-3 py-1 text-[11px] uppercase tracking-wide">{disciplinaActual.nombre}</Badge> : null}
          <Button type="button" size="sm" variant="outline" className="md:hidden" onClick={() => setMobileOpen(true)}>
            Filtros
          </Button>
        </div>
      </div>

      <div className="mt-3 hidden space-y-3 md:block">
        <div className="no-scrollbar overflow-x-auto pb-1">
          <div className="flex min-w-max items-center gap-2 whitespace-nowrap">{disciplinaTabs}</div>
        </div>

        <div className="no-scrollbar overflow-x-auto pb-1">
          <div className="flex min-w-max items-center gap-2 whitespace-nowrap">
            {(['Damas', 'Varones'] as const).map((g) => (
              <Button
                key={g}
                type="button"
                size="sm"
                className="h-9 shrink-0"
                variant={genero === g ? 'default' : 'outline'}
                onClick={() => set({ genero: g })}
              >
                {g}
              </Button>
            ))}

            {categoriasDisponibles.length ? <div className="h-7 w-px shrink-0 bg-primary/10" aria-hidden /> : null}

            {categoriasDisponibles.map((c) => (
              <Button
                key={c}
                type="button"
                size="sm"
                className="h-9 shrink-0"
                variant={categoria === c ? 'default' : 'outline'}
                onClick={() => set({ categoria: c })}
              >
                {c}
              </Button>
            ))}

            <div className="h-7 w-px shrink-0 bg-primary/10" aria-hidden />

            {[
              { id: 'grupos', label: 'Grupos' },
              { id: 'semifinal', label: 'Semis' },
              { id: 'final', label: 'Final' },
            ].map((f) => (
              <Button
                key={f.id}
                type="button"
                size="sm"
                className="h-9 shrink-0"
                variant={fase === f.id ? 'default' : 'outline'}
                onClick={() => set({ fase: f.id })}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 md:hidden">
        <Badge>Genero: {genero}</Badge>
        {categoria ? <Badge variant="secondary">Categoria: {categoria}</Badge> : null}
        <Badge variant="muted">Fase: {fase}</Badge>
      </div>

      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent className="top-auto bottom-0 max-h-[88vh] w-full max-w-none translate-x-[-50%] translate-y-0 rounded-t-[28px] rounded-b-none border border-primary/10 p-5 sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Filtros del campeonato</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 overflow-y-auto pr-1">
            <section className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/60">Disciplina</p>
              <div className="flex flex-wrap gap-2">
                {disciplinas.map((d) => (
                  <Button
                    key={d.id}
                    type="button"
                    size="sm"
                    variant={disciplinaId === d.id ? 'default' : 'outline'}
                    onClick={() => set({ disciplinaId: d.id, categoria: '' })}
                  >
                    {d.nombre}
                  </Button>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/60">Genero</p>
              <div className="flex flex-wrap gap-2">
                {(['Damas', 'Varones'] as const).map((g) => (
                  <Button key={g} type="button" size="sm" variant={genero === g ? 'default' : 'outline'} onClick={() => set({ genero: g })}>
                    {g}
                  </Button>
                ))}
              </div>
            </section>

            {categoriasDisponibles.length ? (
              <section className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/60">Categoria</p>
                <div className="flex flex-wrap gap-2">
                  {categoriasDisponibles.map((c) => (
                    <Button
                      key={c}
                      type="button"
                      size="sm"
                      variant={categoria === c ? 'default' : 'outline'}
                      onClick={() => set({ categoria: c })}
                    >
                      {c}
                    </Button>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/60">Fase</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'grupos', label: 'Grupos' },
                  { id: 'semifinal', label: 'Semis' },
                  { id: 'final', label: 'Final' },
                ].map((f) => (
                  <Button key={f.id} type="button" size="sm" variant={fase === f.id ? 'default' : 'outline'} onClick={() => set({ fase: f.id })}>
                    {f.label}
                  </Button>
                ))}
              </div>
            </section>

            <Button type="button" className="w-full" onClick={() => setMobileOpen(false)}>
              Listo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
