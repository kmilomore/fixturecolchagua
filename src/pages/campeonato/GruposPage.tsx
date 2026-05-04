import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/gasClient'
import { hasGasUrl } from '@/config'
import { useCampeonatoOutlet } from '@/pages/campeonato/outletContext'
import { GroupTableBlock } from '@/pages/campeonato/GroupTableBlock'
import { Skeleton } from '@/components/ui/skeleton'

export function GruposPage() {
  const { campeonatoId, disciplinaId } = useCampeonatoOutlet()
  const [params] = useSearchParams()
  const genero = params.get('genero') || 'Damas'

  const gruposQ = useQuery({
    queryKey: ['grupos', campeonatoId, disciplinaId, genero],
    queryFn: () =>
      api.grupos.query({
        campeonatoId,
        disciplinaId,
        genero,
      }),
    enabled: hasGasUrl && Boolean(campeonatoId) && Boolean(disciplinaId),
    staleTime: 5 * 60 * 1000,
  })

  if (gruposQ.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    )
  }

  if (gruposQ.isError) return <p className="text-accent">{(gruposQ.error as Error).message}</p>

  const grupos = gruposQ.data || []
  if (!grupos.length) {
    return <p className="text-muted">No hay grupos registrados para estos filtros.</p>
  }

  return (
    <div className="space-y-8">
      {grupos.map((g) => (
        <GroupTableBlock key={g.id} grupoId={g.id} titulo={`${g.nombre} · ${g.categoria}`} />
      ))}
    </div>
  )
}
