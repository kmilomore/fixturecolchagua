import type { Partido } from '@/types'

type MatchRef = Pick<Partido, 'id' | 'campeonatoId'>

export function buildMatchDetailSearch(search: string, partido: MatchRef) {
  const params = new URLSearchParams(search)
  params.set('partidoId', partido.id)
  params.set('campeonatoId', partido.campeonatoId)
  return params.toString()
}

export function clearMatchDetailSearch(search: string) {
  const params = new URLSearchParams(search)
  params.delete('partidoId')
  params.delete('campeonatoId')
  return params.toString()
}

export function buildCurrentMatchHref(pathname: string, search: string, partido: MatchRef) {
  const next = buildMatchDetailSearch(search, partido)
  return next ? `${pathname}?${next}` : pathname
}

export function buildCanonicalMatchHref(partido: MatchRef) {
  return `/campeonatos/${partido.campeonatoId}/partidos?campeonatoId=${encodeURIComponent(partido.campeonatoId)}&partidoId=${encodeURIComponent(partido.id)}`
}

export function buildCanonicalCalendarMatchHref(partido: MatchRef) {
  return `/campeonatos/${partido.campeonatoId}/calendario?campeonatoId=${encodeURIComponent(partido.campeonatoId)}&partidoId=${encodeURIComponent(partido.id)}`
}

export function inferCampeonatoIdFromPath(pathname: string) {
  const match = pathname.match(/^\/campeonatos\/([^/]+)/)
  return match?.[1] || ''
}
