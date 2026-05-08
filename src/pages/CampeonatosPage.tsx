import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '@/api/gasClient'
import { hasGasUrl } from '@/config'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { isAdminSessionActive, useAdminSession } from '@/stores/adminSession'

export function CampeonatosPage() {
  const isAdmin = useAdminSession((s) => isAdminSessionActive(s))
  const q = useQuery({
    queryKey: ['campeonatos'],
    queryFn: () => api.campeonatos.getAll(),
    enabled: hasGasUrl,
    staleTime: 5 * 60 * 1000,
  })

  if (!hasGasUrl) {
    return <p className="text-muted">Configura VITE_GAS_URL en .env.local</p>
  }

  if (q.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (q.isError) {
    return <p className="text-accent">{(q.error as Error).message}</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-primary sm:text-4xl">Campeonatos</h1>
          <p className="text-sm text-muted">Listado público sincronizado con Google Sheets.</p>
        </div>
        {isAdmin ? (
          <Button asChild className="w-full md:w-auto">
            <Link to="/campeonatos/nuevo">Nuevo campeonato</Link>
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {(q.data || []).map((c) => (
          <Card key={c.id} className="border-primary/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,250,255,0.94))]">
            <CardHeader>
              <CardTitle className="text-xl">{c.nombre}</CardTitle>
              <CardDescription>
                {c.año} · {c.estado}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button asChild size="sm" className="w-full sm:w-auto">
                <Link to={`/campeonatos/${c.id}`}>Ver</Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="w-full sm:w-auto">
                <Link to={`/campeonatos/${c.id}/calendario`}>Calendario</Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="w-full sm:w-auto">
                <Link to={`/campeonatos/${c.id}/partidos`}>Partidos</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
