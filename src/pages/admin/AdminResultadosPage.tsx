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

interface SetScore {
  local: string
  visita: string
}

const EMPTY_SET: SetScore = { local: '', visita: '' }

function esVoleibol(disciplina: string): boolean {
  return /vol[eé]ibol/i.test(disciplina)
}

function setWinner(score: SetScore): 'local' | 'visita' | null {
  const l = Number(score.local)
  const v = Number(score.visita)
  if (score.local === '' || score.visita === '') return null
  if (Number.isNaN(l) || Number.isNaN(v) || l === v) return null
  return l > v ? 'local' : 'visita'
}

function SetScoreRow({
  label,
  score,
  onChange,
}: {
  label: string
  score: SetScore
  onChange: (s: SetScore) => void
}) {
  const winner = setWinner(score)
  return (
    <div className="grid grid-cols-[4rem_1fr_0.75rem_1fr_4rem] items-center gap-x-1.5">
      <span className="text-xs text-muted">{label}</span>
      <Input
        inputMode="numeric"
        className="h-9 px-1 text-center text-lg font-bold tabular-nums"
        value={score.local}
        onChange={(e) => onChange({ ...score, local: e.target.value.replace(/\D+/g, '') })}
        placeholder="—"
      />
      <span className="text-center text-sm text-muted">–</span>
      <Input
        inputMode="numeric"
        className="h-9 px-1 text-center text-lg font-bold tabular-nums"
        value={score.visita}
        onChange={(e) => onChange({ ...score, visita: e.target.value.replace(/\D+/g, '') })}
        placeholder="—"
      />
      <span className={`text-center text-xs font-medium ${winner === 'local' ? 'text-emerald-600' : winner === 'visita' ? 'text-sky-600' : 'text-transparent'}`}>
        {winner === 'local' ? '◀ gana' : winner === 'visita' ? 'gana ▶' : '·'}
      </span>
    </div>
  )
}

export function AdminResultadosPage() {
  const qc = useQueryClient()
  const ok = useAdminSession((s) => isAdminSessionActive(s))
  const [campeonatoId, setCampeonatoId] = useState<string>('')
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Partido | null>(null)
  const [ml, setMl] = useState('')
  const [mv, setMv] = useState('')
  const [hora, setHora] = useState('')
  const [lugar, setLugar] = useState('')
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)
  const [set1, setSet1] = useState<SetScore>(EMPTY_SET)
  const [set2, setSet2] = useState<SetScore>(EMPTY_SET)
  const [set3, setSet3] = useState<SetScore>(EMPTY_SET)

  const isVoleibol = selected ? esVoleibol(selected.disciplina) : false
  const winner1 = setWinner(set1)
  const winner2 = setWinner(set2)
  const winner3 = setWinner(set3)
  const needsSet3 = winner1 !== null && winner2 !== null && winner1 !== winner2
  const voleiLocal = (winner1 === 'local' ? 1 : 0) + (winner2 === 'local' ? 1 : 0) + (needsSet3 && winner3 === 'local' ? 1 : 0)
  const voleiVisita = (winner1 === 'visita' ? 1 : 0) + (winner2 === 'visita' ? 1 : 0) + (needsSet3 && winner3 === 'visita' ? 1 : 0)
  const voleiCompleto = winner1 !== null && winner2 !== null && (!needsSet3 || winner3 !== null)

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

  const scheduleMut = useMutation({
    mutationFn: async () => {
      if (!selected) return
      return api.partidos.update({ id: selected.id, hora, lugar: lugar.trim() })
    },
    onSuccess: async () => {
      const resumen = selected ? `${selected.localNombre} vs ${selected.visitaNombre}` : 'Partido actualizado.'
      setFeedback({ tone: 'success', message: `Horario actualizado: ${resumen} · ${hora || '--:--'} · ${lugar.trim() || 'Sin lugar'}` })
      await qc.invalidateQueries({ queryKey: ['partidos'] })
    },
    onError: (error) => {
      setFeedback({ tone: 'error', message: (error as Error).message })
    },
  })

  const resultMut = useMutation({
    mutationFn: async () => {
      if (!selected) return
      const marcadorLocal = isVoleibol ? voleiLocal : Number(ml)
      const marcadorVisita = isVoleibol ? voleiVisita : Number(mv)
      return api.partidos.registrarResultado(selected.id, marcadorLocal, marcadorVisita)
    },
    onSuccess: async () => {
      const resumen = selected
        ? isVoleibol
          ? `${selected.localNombre} ${voleiLocal}-${voleiVisita} ${selected.visitaNombre} (sets)`
          : `${selected.localNombre} ${ml}-${mv} ${selected.visitaNombre}`
        : 'Resultado guardado.'
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

  const resultadoInvalido = isVoleibol
    ? !voleiCompleto
    : ml === '' || mv === '' || Number.isNaN(Number(ml)) || Number.isNaN(Number(mv))

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
          <p className="text-sm text-muted">Selecciona un campeonato y administra hora, lugar y marcadores de los partidos pendientes.</p>
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
                setMl(pp.marcadorLocal === '' ? '' : String(pp.marcadorLocal))
                setMv(pp.marcadorVisita === '' ? '' : String(pp.marcadorVisita))
                setHora(String(pp.hora || ''))
                setLugar(String(pp.lugar || ''))
                setSet1(EMPTY_SET)
                setSet2(EMPTY_SET)
                setSet3(EMPTY_SET)
                setOpen(true)
              }}
            />
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gestionar partido</DialogTitle>
            <DialogDescription>
              {selected ? `${selected.localNombre} vs ${selected.visitaNombre}` : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="hora">Hora</Label>
              <Input id="hora" type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lugar">Lugar</Label>
              <Input id="lugar" value={lugar} onChange={(e) => setLugar(e.target.value)} placeholder="Ej. Gimnasio Techado" />
            </div>
          </div>

          {isVoleibol ? (
            <div className="space-y-2 border-t border-primary/10 pt-4">
              <p className="mb-3 text-sm font-semibold text-primary">Resultado por sets</p>

              {/* Encabezados de columna alineados con los inputs */}
              <div className="grid grid-cols-[4rem_1fr_0.75rem_1fr_4rem] items-center gap-x-1.5 pb-1">
                <span />
                <span className="truncate text-center text-xs font-medium text-primary">{selected?.localNombre}</span>
                <span />
                <span className="truncate text-center text-xs font-medium text-primary">{selected?.visitaNombre}</span>
                <span />
              </div>

              <SetScoreRow label="Set 1" score={set1} onChange={setSet1} />
              <SetScoreRow label="Set 2" score={set2} onChange={setSet2} />

              {needsSet3 ? (
                <SetScoreRow label="Set 3 · Des." score={set3} onChange={setSet3} />
              ) : null}

              {winner1 !== null && winner2 !== null ? (
                <p className={`pt-1 text-sm font-medium ${needsSet3 ? 'text-amber-600' : 'text-emerald-700'}`}>
                  {needsSet3
                    ? 'Empate 1-1 — se juega set 3'
                    : voleiLocal > voleiVisita
                      ? `${selected?.localNombre} gana ${voleiLocal}-${voleiVisita}`
                      : `${selected?.visitaNombre} gana ${voleiVisita}-${voleiLocal}`}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 border-t border-primary/10 pt-4">
              <div className="space-y-2">
                <Label htmlFor="marcador-local">Local</Label>
                <Input
                  id="marcador-local"
                  inputMode="numeric"
                  className="font-score text-3xl font-bold tabular-nums"
                  value={ml}
                  onChange={(e) => setMl(e.target.value.replace(/\D+/g, ''))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="marcador-visita">Visita</Label>
                <Input
                  id="marcador-visita"
                  inputMode="numeric"
                  className="font-score text-3xl font-bold tabular-nums"
                  value={mv}
                  onChange={(e) => setMv(e.target.value.replace(/\D+/g, ''))}
                />
              </div>
            </div>
          )}

          {scheduleMut.isPending ? <p className="text-sm text-muted">Guardando hora y lugar del partido...</p> : null}
          {resultMut.isPending ? <p className="text-sm text-muted">Guardando resultado y recalculando tabla...</p> : null}

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={scheduleMut.isPending || resultMut.isPending}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => scheduleMut.mutate()}
              disabled={scheduleMut.isPending || resultMut.isPending || !selected || !hora.trim() || !lugar.trim()}
            >
              {scheduleMut.isPending ? 'Guardando...' : 'Guardar hora y lugar'}
            </Button>
            <Button
              type="button"
              onClick={() => resultMut.mutate()}
              disabled={scheduleMut.isPending || resultMut.isPending || !selected || resultadoInvalido}
            >
              {resultMut.isPending ? 'Guardando...' : 'Guardar resultado'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
