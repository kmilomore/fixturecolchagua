import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/gasClient'
import { hasGasUrl } from '@/config'
import { GroupTable } from '@/components/GroupTable'
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
  return <GroupTable titulo={titulo} filas={q.data || []} />
}
