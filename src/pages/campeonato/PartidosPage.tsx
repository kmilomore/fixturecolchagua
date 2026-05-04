import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/gasClient'
import { hasGasUrl } from '@/config'
import { useCampeonatoOutlet } from '@/pages/campeonato/outletContext'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MatchCard } from '@/components/MatchCard'
import { Skeleton } from '@/components/ui/skeleton'
import type { Partido } from '@/types'
import { formatPartidoDateKey, formatPartidoDateLabel, formatPartidoTime } from '@/utils/formatDate'

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
    const rows = [...((q.data || []) as Partido[])].sort((a, b) => {
      const dateDiff = formatPartidoDateKey(a.fecha).localeCompare(formatPartidoDateKey(b.fecha))
      if (dateDiff !== 0) return dateDiff

      const rank = (estado: Partido['estado']) => {
        if (estado === 'en_curso') return 0
        if (estado === 'programado') return 1
        if (estado === 'finalizado') return 2
        return 3
      }

      const rankDiff = rank(a.estado) - rank(b.estado)
      if (rankDiff !== 0) return rankDiff
      return formatPartidoTime(a.hora).localeCompare(formatPartidoTime(b.hora))
    })
    if (!categoria) return rows
    return rows.filter((p) => String(p.categoria) === categoria)
  }, [q.data, categoria])

  const groupedByDate = useMemo(() => {
    return filtrados.reduce<Record<string, Partido[]>>((acc, partido) => {
      const key = formatPartidoDateKey(partido.fecha)
      acc[key] ||= []
      acc[key].push(partido)
      return acc
    }, {})
  }, [filtrados])

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

  if (!filtrados.length) {
    return <p className="text-muted">No hay partidos para la combinación actual de disciplina, género, categoría y fase.</p>
  }

  return (
    <div className="space-y-6">
      <Card className="border-primary/10 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl text-primary">Jornada filtrada</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge>{filtrados.length} partido(s)</Badge>
          <Badge variant="live">{filtrados.filter((partido) => partido.estado === 'en_curso').length} en vivo</Badge>
          <Badge variant="secondary">{filtrados.filter((partido) => partido.estado === 'programado').length} programado(s)</Badge>
          <Badge variant="muted">{filtrados.filter((partido) => partido.estado === 'finalizado').length} finalizado(s)</Badge>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {Object.entries(groupedByDate).map(([dateKey, partidos]) => (
          <section key={dateKey} className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/10 bg-white p-4 shadow-sm">
              <div>
                <h2 className="font-display text-2xl font-semibold text-primary">{formatPartidoDateLabel(dateKey)}</h2>
                <p className="text-sm text-muted">{partidos.length} partido(s) cargados para esta fecha.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="live">{partidos.filter((partido) => partido.estado === 'en_curso').length} en vivo</Badge>
                <Badge variant="secondary">{partidos.filter((partido) => partido.estado === 'programado').length} programado(s)</Badge>
                <Badge variant="muted">{partidos.filter((partido) => partido.estado === 'finalizado').length} finalizado(s)</Badge>
              </div>
            </div>

            <div className="stagger-children space-y-3">
              {partidos.map((partido) => (
                <MatchCard key={partido.id} partido={partido} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
