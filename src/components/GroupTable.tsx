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
    <Card className={cn('overflow-hidden', className)}>
      {titulo ? (
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{titulo}</CardTitle>
        </CardHeader>
      ) : null}
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-primary text-white">
              <tr>
                {cols.map((c) => (
                  <th key={c} className="px-3 py-3 font-semibold">
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
                    <td className="px-3 py-2 tabular-nums">{pos}</td>
                    <td className="px-3 py-2">{f.equipoNombre}</td>
                    <td className="px-3 py-2 tabular-nums">{f.pj}</td>
                    <td className="px-3 py-2 tabular-nums">{f.pg}</td>
                    <td className="px-3 py-2 tabular-nums">{f.pe}</td>
                    <td className="px-3 py-2 tabular-nums">{f.pp}</td>
                    <td className="px-3 py-2 tabular-nums">{f.sf}</td>
                    <td className="px-3 py-2 tabular-nums">{f.sc}</td>
                    <td className="px-3 py-2 tabular-nums">{f.diferencia}</td>
                    <td className="px-3 py-2 tabular-nums font-score text-base font-bold">{f.puntos}</td>
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
