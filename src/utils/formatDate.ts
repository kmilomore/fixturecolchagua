import { format, parse, parseISO, isValid } from 'date-fns'
import { es } from 'date-fns/locale'

const DDMMYYYY = 'dd/MM/yyyy'
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function parsePartidoDate(fecha: string): Date | null {
  try {
    const raw = String(fecha || '').trim()
    if (!raw) return null

    const d = ISO_DATE.test(raw) || raw.includes('T') ? parseISO(raw) : parse(raw, DDMMYYYY, new Date())
    return isValid(d) ? d : null
  } catch {
    return null
  }
}

export function formatPartidoTime(hora: string | number): string {
  const raw = String(hora || '').trim()
  if (!raw) return ''

  const hhmm = raw.match(/^(\d{1,2}):(\d{2})/)
  if (hhmm) return `${hhmm[1].padStart(2, '0')}:${hhmm[2]}`

  if (raw.includes('T')) {
    const d = parseISO(raw)
    if (isValid(d)) return format(d, 'HH:mm')
  }

  return raw
}

export function formatPartidoDateKey(fecha: string): string {
  const d = parsePartidoDate(fecha)
  if (!d) return fecha
  return format(d, 'yyyy-MM-dd')
}

export function formatPartidoDateLabel(fecha: string): string {
  const d = parsePartidoDate(fecha)
  if (!d) return fecha
  return format(d, "EEEE d MMMM yyyy", { locale: es })
}

export function formatShortDate(fecha: string): string {
  const d = parsePartidoDate(fecha)
  if (!d) return fecha
  return format(d, 'd MMM yyyy', { locale: es })
}
