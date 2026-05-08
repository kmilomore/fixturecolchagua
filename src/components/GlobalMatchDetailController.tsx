import { useMemo } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/gasClient'
import { MatchDetailDialog } from '@/components/MatchDetailDialog'
import { hasGasUrl } from '@/config'
import { clearMatchDetailSearch, inferCampeonatoIdFromPath } from '@/utils/matchLinks'

export function GlobalMatchDetailController() {
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const partidoId = params.get('partidoId') || ''
  const campeonatoId = params.get('campeonatoId') || inferCampeonatoIdFromPath(location.pathname)

  const partidoQ = useQuery({
    queryKey: ['partidos', campeonatoId, 'detail-dialog'],
    queryFn: () => api.partidos.query({ campeonatoId }),
    enabled: hasGasUrl && Boolean(partidoId) && Boolean(campeonatoId),
    staleTime: 5 * 60 * 1000,
  })

  const partido = useMemo(
    () => (partidoQ.data || []).find((row) => row.id === partidoId) || null,
    [partidoId, partidoQ.data],
  )

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) return
    const next = clearMatchDetailSearch(params.toString())
    setParams(next ? new URLSearchParams(next) : new URLSearchParams(), { replace: true })
  }

  return (
    <MatchDetailDialog
      open={Boolean(partidoId)}
      partido={partido}
      isLoading={partidoQ.isLoading}
      onOpenChange={handleOpenChange}
    />
  )
}
