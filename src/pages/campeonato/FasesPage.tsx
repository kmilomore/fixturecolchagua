import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/gasClient'
import { hasGasUrl } from '@/config'
import { useCampeonatoOutlet } from '@/pages/campeonato/outletContext'
import { BracketView } from '@/components/BracketView'
import { Skeleton } from '@/components/ui/skeleton'
import type { Partido } from '@/types'
import { formatPartidoDateKey, formatPartidoTime } from '@/utils/formatDate'

export function FasesPage() {
  const { campeonatoId, disciplinaId } = useCampeonatoOutlet()
  const [params] = useSearchParams()
  const genero = params.get('genero') || 'Damas'
  const categoria = params.get('categoria') || ''

  const q = useQuery({
    queryKey: ['partidos', campeonatoId, disciplinaId, genero, 'elim'],
    queryFn: () =>
      api.partidos.query({
        campeonatoId,
        disciplinaId,
        genero,
      }),
    enabled: hasGasUrl && Boolean(campeonatoId) && Boolean(disciplinaId),
    staleTime: 5 * 60 * 1000,
  })

  const { semis, final_, tercer } = useMemo(() => {
    const rows = ((q.data || []) as Partido[])
      .filter((p) => !categoria || String(p.categoria) === categoria)
      .sort((a, b) => {
        const fa = formatPartidoDateKey(a.fecha)
        const fb = formatPartidoDateKey(b.fecha)
        if (fa !== fb) return fa.localeCompare(fb)
        return formatPartidoTime(a.hora).localeCompare(formatPartidoTime(b.hora))
      })
    const semis = rows.filter((p) => p.fase === 'semifinal').slice(0, 2)
    const final_ = rows.find((p) => p.fase === 'final')
    const tercer = rows.find((p) => p.fase === 'tercer_lugar')
    return { semis, final_, tercer }
  }, [q.data, categoria])

  if (q.isLoading) return <Skeleton className="h-64 w-full" />
  if (q.isError) return <p className="text-accent">{(q.error as Error).message}</p>

  return <BracketView semifinales={semis} final={final_} tercer={tercer} />
}
