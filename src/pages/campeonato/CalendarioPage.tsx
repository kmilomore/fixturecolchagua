import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/gasClient'
import { hasGasUrl } from '@/config'
import { useCampeonatoOutlet } from '@/pages/campeonato/outletContext'
import { CalendarView } from '@/components/CalendarView'
import { Skeleton } from '@/components/ui/skeleton'
import type { Partido } from '@/types'
import { buildMatchDetailSearch } from '@/utils/matchLinks'

export function CalendarioPage() {
  const { campeonatoId, disciplinaId } = useCampeonatoOutlet()
  const [params, setParams] = useSearchParams()
  const genero = params.get('genero') || 'Damas'
  const categoria = params.get('categoria') || ''
  const fase = params.get('fase') || 'grupos'

  const q = useQuery({
    queryKey: ['partidos', campeonatoId, disciplinaId, genero, categoria, fase, 'cal'],
    queryFn: () =>
      api.partidos.query({
        campeonatoId,
        disciplinaId,
        genero,
        fase,
      }),
    enabled: hasGasUrl && Boolean(campeonatoId) && Boolean(disciplinaId),
    staleTime: 5 * 60 * 1000,
  })

  const filtrados = useMemo(() => {
    const rows = q.data || []
    if (!categoria) return rows
    return rows.filter((p) => String(p.categoria) === categoria)
  }, [q.data, categoria])

  if (q.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    )
  }

  if (q.isError) return <p className="text-accent">{(q.error as Error).message}</p>

  return (
    <CalendarView
      partidos={filtrados as Partido[]}
      onSelectMatch={(partido) => {
        const next = buildMatchDetailSearch(params.toString(), partido)
        setParams(new URLSearchParams(next), { replace: true })
      }}
    />
  )
}
