import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/gasClient'
import { hasGasUrl } from '@/config'
import { useCampeonatoOutlet } from '@/pages/campeonato/outletContext'
import { MatchCard } from '@/components/MatchCard'
import { Skeleton } from '@/components/ui/skeleton'
import type { Partido } from '@/types'

export function PartidosPage() {
  const { campeonatoId, disciplinaId } = useCampeonatoOutlet()
  const [params] = useSearchParams()
  const genero = params.get('genero') || 'Damas'
  const categoria = params.get('categoria') || ''
  const fase = params.get('fase') || 'grupos'

  const q = useQuery({
    queryKey: ['partidos', campeonatoId, disciplinaId, genero, categoria, fase, 'list'],
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
    const rows = (q.data || []) as Partido[]
    if (!categoria) return rows
    return rows.filter((p) => String(p.categoria) === categoria)
  }, [q.data, categoria])

  if (q.isLoading) {
    return (
      <div className="space-y-3 stagger-children">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    )
  }

  if (q.isError) return <p className="text-accent">{(q.error as Error).message}</p>

  return (
    <div className="stagger-children space-y-3">
      {filtrados.map((p) => (
        <MatchCard key={p.id} partido={p} />
      ))}
    </div>
  )
}
