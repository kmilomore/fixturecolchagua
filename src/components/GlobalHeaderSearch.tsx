import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Search, Sparkles, Trophy } from 'lucide-react'
import { api } from '@/api/gasClient'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { hasGasUrl } from '@/config'
import type { Partido } from '@/types'
import { buildCanonicalMatchHref } from '@/utils/matchLinks'
import { formatShortDate, formatPartidoTime } from '@/utils/formatDate'

interface GlobalHeaderSearchProps {
  campeonatoId?: string
}

type SearchSuggestion =
  | { type: 'match'; key: string; label: string; secondary: string; partido: Partido }
  | { type: 'query'; key: string; label: string; secondary: string }

function searchMatches(rows: Partido[], query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return [] as SearchSuggestion[]

  const matchSuggestions = rows
    .filter((row) => {
      const haystack = [
        row.localNombre,
        row.visitaNombre,
        row.disciplina,
        row.lugar,
        row.genero,
        row.categoria,
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
    .slice(0, 4)
    .map((partido) => ({
      type: 'match' as const,
      key: `match-${partido.id}`,
      label: `${partido.localNombre} vs ${partido.visitaNombre}`,
      secondary: `${partido.disciplina} · ${formatShortDate(partido.fecha)} · ${formatPartidoTime(partido.hora)} · ${partido.lugar}`,
      partido,
    }))

  const tokenSuggestions = Array.from(
    new Set(
      rows
        .flatMap((row) => [row.localNombre, row.visitaNombre, row.lugar, row.disciplina])
        .filter((value) => value.toLowerCase().includes(q)),
    ),
  )
    .slice(0, 4)
    .map((label) => ({
      type: 'query' as const,
      key: `query-${label}`,
      label,
      secondary: 'Buscar en Mis partidos',
    }))

  return [...matchSuggestions, ...tokenSuggestions].slice(0, 7)
}

function SearchPanel({
  query,
  setQuery,
  suggestions,
  onSubmit,
  onPick,
  compact = false,
}: {
  query: string
  setQuery: (value: string) => void
  suggestions: SearchSuggestion[]
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onPick: (suggestion: SearchSuggestion) => void
  compact?: boolean
}) {
  const hasQuery = Boolean(query.trim())

  return (
    <div className={compact ? 'relative' : 'space-y-3'}>
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Busca colegio, recinto, disciplina o partido"
            className="h-11 pl-9"
          />
        </div>
      </form>

      {hasQuery ? (
        suggestions.length ? (
          <div className={compact ? 'absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 space-y-2 rounded-[24px] border border-primary/10 bg-white p-3 shadow-[var(--shadow-lift)]' : 'space-y-2'}>
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.key}
                type="button"
                onClick={() => onPick(suggestion)}
                className="w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-left transition hover:border-primary/25 hover:bg-primary/5"
              >
                <p className="font-semibold text-primary">{suggestion.label}</p>
                <p className="mt-1 text-sm text-muted">{suggestion.secondary}</p>
              </button>
            ))}
          </div>
        ) : (
          <div className={compact ? 'absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 rounded-[24px] border border-primary/10 bg-white px-4 py-3 text-sm text-muted shadow-[var(--shadow-lift)]' : 'rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm text-muted'}>
            No encontramos coincidencias directas. Pulsa Enter para ir a Mis partidos con esta búsqueda.
          </div>
        )
      ) : compact ? null : (
        <div className="rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm text-muted">
          Usa el buscador global para saltar directo a un partido o lanzar una búsqueda pública por establecimiento.
        </div>
      )}
    </div>
  )
}

export function GlobalHeaderSearch({ campeonatoId }: GlobalHeaderSearchProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)

  const partidosQ = useQuery({
    queryKey: ['partidos', campeonatoId, 'global-search'],
    queryFn: () => api.partidos.query({ campeonatoId: campeonatoId! }),
    enabled: hasGasUrl && Boolean(campeonatoId),
    staleTime: 5 * 60 * 1000,
  })

  const suggestions = useMemo(() => searchMatches(partidosQ.data || [], query), [partidosQ.data, query])

  useEffect(() => {
    if (!mobileOpen) return
    setQuery('')
  }, [mobileOpen])

  function goToPublicSearch(value: string) {
    navigate(`/mis-partidos?search=${encodeURIComponent(value.trim())}`)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!query.trim()) return
    goToPublicSearch(query)
    setMobileOpen(false)
  }

  function handlePick(suggestion: SearchSuggestion) {
    if (suggestion.type === 'match') {
      navigate(buildCanonicalMatchHref(suggestion.partido))
    } else {
      goToPublicSearch(suggestion.label)
    }
    setMobileOpen(false)
  }

  return (
    <>
      <div className="relative hidden w-full max-w-md md:block">
        <SearchPanel query={query} setQuery={setQuery} suggestions={suggestions} onSubmit={handleSubmit} onPick={handlePick} compact />
        {!query.trim() ? (
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55" />
        ) : null}
      </div>

      <Button type="button" variant="secondary" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)}>
        <Search className="h-4 w-4" />
      </Button>

      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent className="max-w-xl rounded-[28px] border border-primary/10">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Badge>
                <Sparkles className="mr-1 h-3 w-3" />
                Búsqueda rápida
              </Badge>
              {campeonatoId ? (
                <Badge variant="muted">
                  <Trophy className="mr-1 h-3 w-3" />
                  Campeonato activo
                </Badge>
              ) : null}
            </div>
            <DialogTitle>Buscador global</DialogTitle>
            <DialogDescription>
              Encuentra un partido específico o lanza una búsqueda pública por establecimiento.
            </DialogDescription>
          </DialogHeader>
          <SearchPanel query={query} setQuery={setQuery} suggestions={suggestions} onSubmit={handleSubmit} onPick={handlePick} />
        </DialogContent>
      </Dialog>
    </>
  )
}
