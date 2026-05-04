import type { FilaTabla } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const cols = ['Pos', 'Equipo', 'PJ', 'PG', 'PE', 'PP', 'SF', 'SC', 'Dif', 'Pts'] as const

export interface GroupTableProps {
  titulo?: string
  filas: FilaTabla[]
  className?: string
}

export function GroupTable({ titulo, filas, className }: GroupTableProps) {
  return (
    <Card className={cn('overflow-hidden border-primary/10 shadow-sm', className)}>
      {titulo ? (
        <CardHeader className="border-b border-black/5 bg-primary/5 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-lg text-primary">{titulo}</CardTitle>
            <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted shadow-sm">
              {filas.length} equipo(s)
            </div>
          </div>
        </CardHeader>
      ) : null}
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-primary text-white">
              <tr>
                {cols.map((c) => (
                  <th key={c} className="px-3 py-3 text-xs font-semibold uppercase tracking-[0.14em]">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filas.map((f, idx) => {
                const pos = idx + 1
                const rowStyle =
                  pos === 1
                    ? 'bg-secondary/10 font-semibold text-primary'
                    : pos === 2
                      ? 'bg-primary/5 font-medium text-primary'
                      : idx % 2 === 0
                        ? 'bg-white'
                        : 'bg-surface'
                return (
                  <tr key={f.id} className={cn('border-t border-black/5', rowStyle)}>
                    <td className="px-3 py-3 tabular-nums">
                      <span className={cn('inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold', pos === 1 ? 'bg-secondary text-white' : pos === 2 ? 'bg-primary text-white' : 'bg-black/5 text-slate-700')}>
                        {pos}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-medium">{f.equipoNombre}</td>
                    <td className="px-3 py-2 tabular-nums">{f.pj}</td>
                    <td className="px-3 py-2 tabular-nums">{f.pg}</td>
                    <td className="px-3 py-2 tabular-nums">{f.pe}</td>
                    <td className="px-3 py-2 tabular-nums">{f.pp}</td>
                    <td className="px-3 py-2 tabular-nums">{f.sf}</td>
                    <td className="px-3 py-2 tabular-nums">{f.sc}</td>
                    <td className="px-3 py-2 tabular-nums">{f.diferencia > 0 ? `+${f.diferencia}` : f.diferencia}</td>
                    <td className="px-3 py-2 tabular-nums font-score text-base font-bold text-primary">{f.puntos}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
