import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/gasClient'
import { hasGasUrl } from '@/config'
import { useAdminSession } from '@/stores/adminSession'
import { MatchCard } from '@/components/MatchCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import type { Partido } from '@/types'

export function AdminResultadosPage() {
  const qc = useQueryClient()
  const { ok } = useAdminSession()
  const [campeonatoId, setCampeonatoId] = useState<string>('')
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Partido | null>(null)
  const [ml, setMl] = useState('0')
  const [mv, setMv] = useState('0')

  const campeonatosQ = useQuery({
    queryKey: ['campeonatos'],
    queryFn: () => api.campeonatos.getAll(),
    enabled: hasGasUrl && ok,
    staleTime: 5 * 60 * 1000,
  })

  const partidosQ = useQuery({
    queryKey: ['partidos', campeonatoId, 'admin-dia'],
    queryFn: () => api.partidos.query({ campeonatoId }),
    enabled: hasGasUrl && ok && Boolean(campeonatoId),
    staleTime: 60 * 1000,
  })

  const programados = useMemo(() => {
    return (partidosQ.data || []).filter((p) => p.estado === 'programado' || p.estado === 'en_curso')
  }, [partidosQ.data])

  const mut = useMutation({
    mutationFn: async () => {
      if (!selected) return
      return api.partidos.registrarResultado(selected.id, Number(ml), Number(mv))
    },
    onSuccess: async () => {
      setOpen(false)
      setSelected(null)
      await qc.invalidateQueries({ queryKey: ['partidos'] })
      await qc.invalidateQueries({ queryKey: ['tabla'] })
    },
  })

  if (!ok) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sesión requerida</CardTitle>
          <CardDescription>Primero ingresa al panel admin.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link to="/admin">Ir a /admin</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!hasGasUrl) return <p className="text-muted">Configura VITE_GAS_URL</p>

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-primary">Ingreso de resultados</h1>
          <p className="text-sm text-muted">Selecciona un campeonato y registra marcadores.</p>
        </div>
        <Button asChild variant="outline">
          <Link to="/admin">Volver</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campeonato</CardTitle>
          <CardDescription>Filtra partidos pendientes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {campeonatosQ.isLoading ? <Skeleton className="h-10 w-full" /> : null}
          <label className="text-sm font-semibold text-primary" htmlFor="campeonato">
            Seleccionar
          </label>
          <select
            id="campeonato"
            className="h-10 w-full max-w-xl rounded-lg border border-black/10 bg-white px-3 text-sm"
            value={campeonatoId}
            onChange={(e) => setCampeonatoId(e.target.value)}
          >
            <option value="">—</option>
            {(campeonatosQ.data || []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {partidosQ.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : partidosQ.isError ? (
        <p className="text-accent">{(partidosQ.error as Error).message}</p>
      ) : (
        <div className="stagger-children space-y-3">
          {programados.map((p) => (
            <MatchCard
              key={p.id}
              partido={p as Partido}
              onClick={(pp) => {
                setSelected(pp)
                setMl('0')
                setMv('0')
                setOpen(true)
              }}
            />
          ))}
          {!programados.length ? <p className="text-muted">No hay partidos programados/en curso.</p> : null}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar resultado</DialogTitle>
            <DialogDescription>
              {selected ? `${selected.localNombre} vs ${selected.visitaNombre}` : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Local</Label>
              <Input inputMode="numeric" className="font-score text-3xl font-bold tabular-nums" value={ml} onChange={(e) => setMl(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Visita</Label>
              <Input inputMode="numeric" className="font-score text-3xl font-bold tabular-nums" value={mv} onChange={(e) => setMv(e.target.value)} />
            </div>
          </div>

          {mut.isError ? <p className="text-sm text-accent">{(mut.error as Error).message}</p> : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={mut.isPending}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => mut.mutate()}
              disabled={mut.isPending || !selected || Number.isNaN(Number(ml)) || Number.isNaN(Number(mv))}
            >
              Guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
