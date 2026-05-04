import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/gasClient'
import { hasGasUrl } from '@/config'
import { useCampeonatoOutlet } from '@/pages/campeonato/outletContext'
import { GroupTableBlock } from '@/pages/campeonato/GroupTableBlock'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
      <Card className="border-primary/10 bg-[linear-gradient(135deg,rgba(37,48,107,0.08),rgba(255,255,255,1))]">
        <CardHeader>
          <CardTitle className="text-2xl text-primary">Panorama de grupos</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge>{grupos.length} grupo(s)</Badge>
          <Badge variant="secondary">Genero: {genero}</Badge>
          <Badge variant="muted">Cada grupo combina tabla, lectura rápida y liderazgo provisional.</Badge>
        </CardContent>
      </Card>

      {grupos.map((g) => (
        <GroupTableBlock key={g.id} grupoId={g.id} titulo={`${g.nombre} · ${g.categoria}`} />
      ))}
    </div>
  )
}
