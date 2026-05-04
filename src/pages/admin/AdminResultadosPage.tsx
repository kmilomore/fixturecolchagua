import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/gasClient'
import { hasGasUrl } from '@/config'
import { isAdminSessionActive, useAdminSession } from '@/stores/adminSession'
import { MatchCard } from '@/components/MatchCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import type { Partido } from '@/types'

interface FeedbackState {
  tone: 'success' | 'error' | 'info'
  message: string
}

export function AdminResultadosPage() {
  const qc = useQueryClient()
  const ok = useAdminSession((s) => isAdminSessionActive(s))
  const [campeonatoId, setCampeonatoId] = useState<string>('')
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Partido | null>(null)
  const [ml, setMl] = useState('0')
  const [mv, setMv] = useState('0')
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)

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
  const finalizados = useMemo(() => {
    return (partidosQ.data || []).filter((p) => p.estado === 'finalizado')
  }, [partidosQ.data])
  const campeonatoSeleccionado = useMemo(() => {
    return (campeonatosQ.data || []).find((c) => c.id === campeonatoId) || null
  }, [campeonatosQ.data, campeonatoId])

  useEffect(() => {
    if (campeonatoId || !campeonatosQ.data?.length) return
    const active = campeonatosQ.data.find((c) => c.estado === 'activo') || campeonatosQ.data[0]
    if (active) setCampeonatoId(active.id)
  }, [campeonatosQ.data, campeonatoId])

  const mut = useMutation({
    mutationFn: async () => {
      if (!selected) return
      return api.partidos.registrarResultado(selected.id, Number(ml), Number(mv))
    },
    onSuccess: async () => {
      const resumen = selected ? `${selected.localNombre} ${ml}-${mv} ${selected.visitaNombre}` : 'Resultado guardado.'
      setOpen(false)
      setSelected(null)
      setFeedback({ tone: 'success', message: `Resultado guardado: ${resumen}` })
      await qc.invalidateQueries({ queryKey: ['partidos'] })
      await qc.invalidateQueries({ queryKey: ['tabla'] })
    },
    onError: (error) => {
      setFeedback({ tone: 'error', message: (error as Error).message })
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
          <p className="text-sm text-muted">Selecciona un campeonato y registra marcadores pendientes con confirmación inmediata.</p>
        </div>
        <Button asChild variant="outline">
          <Link to="/admin">Volver</Link>
        </Button>
      </div>

      {feedback ? (
        <Card className={feedback.tone === 'success' ? 'border-emerald-200 bg-emerald-50' : feedback.tone === 'error' ? 'border-rose-200 bg-rose-50' : 'border-primary/10'}>
          <CardContent className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <p className={feedback.tone === 'success' ? 'text-emerald-800' : feedback.tone === 'error' ? 'text-rose-700' : 'text-primary'}>{feedback.message}</p>
            <Button type="button" variant="ghost" size="sm" onClick={() => setFeedback(null)}>
              Cerrar
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Campeonato</CardTitle>
          <CardDescription>Se prioriza el campeonato activo para acelerar la carga operativa.</CardDescription>
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
          {campeonatoSeleccionado ? (
            <div className="flex flex-wrap gap-2 pt-2">
              <Badge>{campeonatoSeleccionado.estado}</Badge>
              <Badge variant="secondary">{programados.length} pendientes</Badge>
              <Badge variant="muted">{finalizados.length} finalizados</Badge>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {!campeonatosQ.isLoading && !(campeonatosQ.data || []).length ? (
        <Card>
          <CardHeader>
            <CardTitle>No hay campeonatos cargados</CardTitle>
            <CardDescription>Crea o importa un campeonato antes de registrar resultados.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/campeonatos/nuevo">Crear campeonato</Link>
            </Button>
          </CardContent>
        </Card>
      ) : !campeonatoId ? (
        <Card>
          <CardHeader>
            <CardTitle>Selecciona un campeonato</CardTitle>
            <CardDescription>Al elegir uno verás solo partidos pendientes o en curso.</CardDescription>
          </CardHeader>
        </Card>
      ) : partidosQ.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : partidosQ.isError ? (
        <Card>
          <CardHeader>
            <CardTitle>No se pudo cargar la jornada</CardTitle>
            <CardDescription>{(partidosQ.error as Error).message}</CardDescription>
          </CardHeader>
        </Card>
      ) : !programados.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Sin partidos pendientes</CardTitle>
            <CardDescription>
              {finalizados.length
                ? `Todo lo disponible en ${campeonatoSeleccionado?.nombre || 'este campeonato'} ya fue registrado.`
                : 'Todavía no hay partidos programados o en curso para este campeonato.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to="/campeonatos">Ver campeonatos</Link>
            </Button>
            <Button type="button" variant="ghost" onClick={() => setCampeonatoId('')}>
              Cambiar selección
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="stagger-children space-y-3">
          {programados.map((p) => (
            <MatchCard
              key={p.id}
              partido={p as Partido}
              onClick={(pp) => {
                setFeedback(null)
                setSelected(pp)
                setMl('0')
                setMv('0')
                setOpen(true)
              }}
            />
          ))}
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
              <Input
                inputMode="numeric"
                className="font-score text-3xl font-bold tabular-nums"
                value={ml}
                onChange={(e) => setMl(e.target.value.replace(/\D+/g, ''))}
              />
            </div>
            <div className="space-y-2">
              <Label>Visita</Label>
              <Input
                inputMode="numeric"
                className="font-score text-3xl font-bold tabular-nums"
                value={mv}
                onChange={(e) => setMv(e.target.value.replace(/\D+/g, ''))}
              />
            </div>
          </div>

          {mut.isPending ? <p className="text-sm text-muted">Guardando resultado y recalculando tabla...</p> : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={mut.isPending}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => mut.mutate()}
              disabled={mut.isPending || !selected || ml === '' || mv === '' || Number.isNaN(Number(ml)) || Number.isNaN(Number(mv))}
            >
              {mut.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
