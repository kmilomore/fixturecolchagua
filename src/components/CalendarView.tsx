import { useMemo, useState } from 'react'
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { es } from 'date-fns/locale'
import type { Partido } from '@/types'
import { groupByKey } from '@/utils/groupBy'
import {
  formatPartidoDateKey,
  formatPartidoDateLabel,
  formatPartidoTime,
  parsePartidoDate,
} from '@/utils/formatDate'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MatchCard } from '@/components/MatchCard'

export interface CalendarViewProps {
  partidos: Partido[]
  onSelectMatch?: (p: Partido) => void
}

export function CalendarView({ partidos, onSelectMatch }: CalendarViewProps) {
  const [view, setView] = useState<'lista' | 'calendario'>('lista')
  const partidosOrdenados = useMemo(() => {
    return [...partidos].sort((a, b) => {
      const da = parsePartidoDate(a.fecha)?.getTime() ?? 0
      const db = parsePartidoDate(b.fecha)?.getTime() ?? 0
      if (da !== db) return da - db
      const ga = grupoSortValue(a.grupo)
      const gb = grupoSortValue(b.grupo)
      if (ga !== gb) return ga - gb
      return formatPartidoTime(a.hora).localeCompare(formatPartidoTime(b.hora))
    })
  }, [partidos])

  const gruposPorFecha = useMemo(() => {
    return groupByKey(partidosOrdenados, (p) => formatPartidoDateKey(p.fecha))
  }, [partidosOrdenados])

  const meses = useMemo(() => {
    const dates = partidosOrdenados
      .map((p) => parsePartidoDate(p.fecha))
      .filter((d): d is Date => Boolean(d))

    const unique = new Map<string, Date>()
    dates.forEach((d) => {
      const key = format(d, 'yyyy-MM')
      if (!unique.has(key)) unique.set(key, startOfMonth(d))
    })

    return Array.from(unique.values()).sort((a, b) => a.getTime() - b.getTime())
  }, [partidosOrdenados])

  if (!meses.length) {
    return <p className="text-muted">No hay partidos para mostrar con los filtros actuales.</p>
  }

  return (
    <div className="space-y-8">
      <div className="sticky top-[4.75rem] z-[5] flex items-center justify-between gap-3 rounded-xl border border-primary/10 bg-white/95 p-2 shadow-sm backdrop-blur md:hidden">
        <div className="pl-2">
          <p className="text-sm font-semibold text-primary">Vista móvil</p>
          <p className="text-[11px] text-muted">Lista para lectura rápida, mes para visión general.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="min-w-[72px]" variant={view === 'lista' ? 'default' : 'outline'} onClick={() => setView('lista')}>
            Lista
          </Button>
          <Button
            size="sm"
            className="min-w-[72px]"
            variant={view === 'calendario' ? 'default' : 'outline'}
            onClick={() => setView('calendario')}
          >
            Mes
          </Button>
        </div>
      </div>

      <div className={view === 'lista' ? 'block md:hidden' : 'hidden'}>
        <div className="space-y-6">
          {Object.entries(gruposPorFecha).map(([fecha, lista]) => (
            <section key={fecha} className="space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-primary px-4 py-3 text-white">
                <div>
                  <h3 className="font-display text-xl font-semibold capitalize">{formatPartidoDateLabel(fecha)}</h3>
                  <p className="text-xs text-white/70">{fecha}</p>
                </div>
                <Badge className="bg-white/15 text-white">{lista.length} partidos</Badge>
              </div>
              <div className="space-y-3">
                {lista.map((p) => (
                  <MatchCard key={p.id} partido={p} onClick={onSelectMatch} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      {meses.map((monthDate) => {
        const monthStart = startOfMonth(monthDate)
        const monthEnd = endOfMonth(monthDate)
        const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
        const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
        const days = eachDayOfInterval({ start: gridStart, end: gridEnd })
        const partidosMes = partidosOrdenados.filter((p) => {
          const d = parsePartidoDate(p.fecha)
          return d ? isSameMonth(d, monthStart) : false
        })

        return (
          <section
            key={format(monthStart, 'yyyy-MM')}
            className={view === 'calendario' ? 'space-y-4' : 'hidden space-y-4 md:block'}
          >
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="font-display text-2xl font-semibold capitalize text-primary">
                  {format(monthStart, 'MMMM yyyy', { locale: es })}
                </h3>
                <p className="text-sm text-muted">Calendario mensual ordenado por grupo y hora.</p>
              </div>
              <Badge variant="secondary">{partidosMes.length} partidos</Badge>
            </div>

            <div className="overflow-hidden rounded-card border border-black/10 bg-white shadow-sm">
              <div className="hidden grid-cols-7 bg-primary text-center text-xs font-semibold uppercase tracking-wide text-white md:grid">
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
                  <div key={day} className="px-2 py-3">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-7">
                {days.map((day) => {
                  const fechaKey = format(day, 'yyyy-MM-dd')
                  const lista = gruposPorFecha[fechaKey] ?? []
                  const inMonth = isSameMonth(day, monthStart)

                  return (
                    <div
                      key={fechaKey}
                      className={[
                        'min-h-0 border-t border-black/10 p-3 first:border-t-0 md:min-h-36 md:border-l md:first:border-l-0 md:first:border-t',
                        inMonth
                          ? 'bg-white'
                          : 'hidden bg-surface/60 text-muted md:block',
                      ].join(' ')}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div>
                          <span className="font-score text-lg font-bold tabular-nums text-primary">{format(day, 'd')}</span>
                          <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted md:hidden">
                            {format(day, 'EEEE', { locale: es })}
                          </p>
                        </div>
                        {lista.length ? <Badge variant="muted">{lista.length}</Badge> : null}
                      </div>

                      <div className="space-y-2">
                        {lista.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => onSelectMatch?.(p)}
                            className="w-full rounded-lg border border-primary/10 bg-surface px-2 py-2 text-left text-xs transition hover:border-primary/25 hover:bg-primary/5"
                          >
                            <div className="mb-1 flex items-center justify-between gap-2">
                              <span className="font-score font-bold tabular-nums text-primary">
                                {formatPartidoTime(p.hora)}
                              </span>
                              {p.grupo ? (
                                <span className="rounded-full bg-secondary/25 px-2 py-0.5 font-semibold text-primary">
                                  {p.grupo}
                                </span>
                              ) : null}
                            </div>
                            <p className="line-clamp-2 font-semibold text-primary">
                              {p.localNombre} vs {p.visitaNombre}
                            </p>
                            <p className="mt-1 text-[11px] text-muted">
                              {p.genero} · {p.lugar}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )
      })}
    </div>
  )
}

function grupoSortValue(grupo?: string) {
  if (!grupo) return Number.MAX_SAFE_INTEGER
  const match = String(grupo).match(/\d+/)
  if (match) return Number(match[0])
  return String(grupo).localeCompare('zzz')
}
