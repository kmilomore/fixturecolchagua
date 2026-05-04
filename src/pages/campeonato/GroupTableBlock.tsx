import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/gasClient'
import { hasGasUrl } from '@/config'
import { GroupTable } from '@/components/GroupTable'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function GroupTableBlock({ grupoId, titulo }: { grupoId: string; titulo: string }) {
  const q = useQuery({
    queryKey: ['tabla', grupoId],
    queryFn: () => api.grupos.getTabla(grupoId),
    enabled: hasGasUrl && Boolean(grupoId),
    staleTime: 5 * 60 * 1000,
  })

  if (q.isLoading) return <Skeleton className="h-56 w-full" />
  if (q.isError) return <p className="text-accent">{(q.error as Error).message}</p>

  const filas = q.data || []
  const lider = filas[0]
  const escolta = filas[1]

  return (
    <div className="space-y-4">
      <Card className="border-primary/10 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl text-primary">Lectura rápida del grupo</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-primary/10 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Líder provisional</p>
            <p className="mt-2 font-display text-xl font-semibold text-primary">{lider?.equipoNombre || 'Sin datos'}</p>
            <p className="text-sm text-muted">{lider ? `${lider.puntos} pts · Dif ${lider.diferencia}` : 'Aún no hay tabla disponible.'}</p>
          </div>
          <div className="rounded-xl border border-primary/10 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Persecución inmediata</p>
            <p className="mt-2 font-display text-xl font-semibold text-primary">{escolta?.equipoNombre || 'Sin escolta'}</p>
            <p className="text-sm text-muted">{escolta ? `${escolta.puntos} pts · PJ ${escolta.pj}` : 'Solo hay un equipo destacado.'}</p>
          </div>
          <div className="rounded-xl border border-primary/10 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Estado competitivo</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge>{filas.length} equipo(s)</Badge>
              <Badge variant="secondary">{filas.reduce((acc, fila) => acc + fila.pg, 0)} triunfo(s)</Badge>
              <Badge variant="muted">{filas.reduce((acc, fila) => acc + fila.pe, 0)} empate(s)</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <GroupTable titulo={titulo} filas={filas} />
    </div>
  )
}
