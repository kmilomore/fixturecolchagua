import { isAfter, isEqual } from 'date-fns'
import type { Partido } from '@/types'
import { formatPartidoDateKey, formatPartidoTime, parsePartidoDate } from '@/utils/formatDate'

export function todayKey() {
  return formatPartidoDateKey(new Date().toISOString())
}

export function sortMatches(a: Partido, b: Partido) {
  const fa = formatPartidoDateKey(a.fecha)
  const fb = formatPartidoDateKey(b.fecha)
  if (fa !== fb) return fa.localeCompare(fb)
  return formatPartidoTime(a.hora).localeCompare(formatPartidoTime(b.hora))
}

export function getUpcomingMatch(partidos: Partido[], now = new Date()) {
  return [...partidos]
    .filter((p) => p.estado !== 'finalizado' && p.estado !== 'postergado')
    .sort(sortMatches)
    .find((p) => {
      const date = parsePartidoDate(p.fecha)
      if (!date) return false
      const [hour = '0', minute = '0'] = formatPartidoTime(p.hora).split(':')
      date.setHours(Number(hour), Number(minute), 0, 0)
      return isAfter(date, now) || isEqual(date, now)
    })
}

export function getTodayMatches(partidos: Partido[], key = todayKey()) {
  return partidos.filter((p) => formatPartidoDateKey(p.fecha) === key).sort(sortMatches)
}

export function matchesTeamSearch(partido: Partido, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return false
  return (
    partido.localNombre.toLowerCase().includes(q) ||
    partido.visitaNombre.toLowerCase().includes(q) ||
    partido.localId.toLowerCase().includes(q) ||
    partido.visitaId.toLowerCase().includes(q)
  )
}
