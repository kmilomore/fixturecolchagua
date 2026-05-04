import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/gasClient'
import { hasGasUrl } from '@/config'
import { useCampeonatoOutlet } from '@/pages/campeonato/outletContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export function CampeonatoHome() {
  const { id } = useParams()
  const { campeonatoId, disciplinaId } = useCampeonatoOutlet()

  const campeonatoQ = useQuery({
    queryKey: ['campeonato', id],
    queryFn: () => api.campeonatos.getById(id!),
    enabled: hasGasUrl && Boolean(id),
    staleTime: 5 * 60 * 1000,
  })

  const partidosQ = useQuery({
    queryKey: ['partidos', campeonatoId, disciplinaId, 'preview'],
    queryFn: () =>
      api.partidos.query({
        campeonatoId,
        disciplinaId,
      }),
    enabled: hasGasUrl && Boolean(campeonatoId) && Boolean(disciplinaId),
    staleTime: 5 * 60 * 1000,
  })

  if (campeonatoQ.isLoading) return <Skeleton className="h-40 w-full" />
  const c = campeonatoQ.data

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Descripción</CardTitle>
          <CardDescription>Información general publicada en Sheets.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted">
          <p>{c?.descripcion || 'Sin descripción.'}</p>
          <p>
            <span className="font-semibold text-primary">Disciplinas (CSV):</span> {c?.disciplinas}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resumen de partidos</CardTitle>
          <CardDescription>
            Total cargados para la disciplina seleccionada: {partidosQ.data?.length ?? '…'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to={`/campeonatos/${campeonatoId}/calendario`}>Ver calendario</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to={`/campeonatos/${campeonatoId}/grupos`}>Ver grupos</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to={`/campeonatos/${campeonatoId}/partidos`}>Filtrar partidos</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
