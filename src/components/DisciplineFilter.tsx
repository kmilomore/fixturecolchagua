import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Disciplina } from '@/types'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface DisciplineFilterProps {
  disciplinas: Disciplina[]
  categoriasDisponibles: string[]
  className?: string
}

export function DisciplineFilter({ disciplinas, categoriasDisponibles, className }: DisciplineFilterProps) {
  const [params, setParams] = useSearchParams()

  const disciplinaId = params.get('disciplinaId') || disciplinas[0]?.id || ''
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
            <TabsTrigger key={d.id} value={d.id}>
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
    <div className={cn('rounded-xl border border-primary/10 bg-white p-2 shadow-sm', className)}>
      <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1">
        {disciplinaTabs}

        <div className="h-7 w-px shrink-0 bg-primary/10" aria-hidden />

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

        {categoriasDisponibles.length ? (
          <>
            <div className="h-7 w-px shrink-0 bg-primary/10" aria-hidden />
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
          </>
        ) : null}

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
  )
}
