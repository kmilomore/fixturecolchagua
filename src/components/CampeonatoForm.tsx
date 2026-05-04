import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { api } from '@/api/gasClient'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const DISCIPLINAS_DISPONIBLES = [
  'VOLEIBOL',
  'FUTSAL',
  'BASQUETBOL',
  'HANDBALL',
  'ATLETISMO',
] as const

const schemaPaso1 = z.object({
  nombre: z.string().min(3, 'Ingresa un nombre'),
  año: z.number().min(2024).max(2035),
  descripcion: z.string().optional(),
  portadaUrl: z.string().optional(),
})

type Paso1 = z.infer<typeof schemaPaso1>

export function CampeonatoForm() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [seleccionDisc, setSeleccionDisc] = useState<string[]>(['VOLEIBOL'])
  const [categoriasPorDisc, setCategoriasPorDisc] = useState<Record<string, string>>({
    VOLEIBOL: 'Sub14,Juvenil',
  })

  const form1 = useForm<Paso1>({
    resolver: zodResolver(schemaPaso1),
    defaultValues: { nombre: 'Campeonato SLEP Colchagua 2026', año: 2026, descripcion: '', portadaUrl: '' },
  })

  const watched = form1.watch()
  const preview = useMemo(() => {
    return {
      ...watched,
      disciplinas: seleccionDisc,
      categoriasPorDisc,
    }
  }, [watched, seleccionDisc, categoriasPorDisc])

  const crear = useMutation({
    mutationFn: async () => {
      const v1 = form1.getValues()
      const disciplinasCsv = seleccionDisc.join(',')
      const campeonatoRes = await api.campeonatos.create({
        nombre: v1.nombre,
        año: v1.año,
        disciplinas: disciplinasCsv,
        descripcion: v1.descripcion || '',
        estado: 'activo',
      })
      const campeonatoId = campeonatoRes.id
      for (const nombre of seleccionDisc) {
        await api.disciplinas.create({
          campeonatoId,
          nombre,
          categorias: categoriasPorDisc[nombre] || 'Sub14,Juvenil',
          estado: 'activo',
        })
      }
      return campeonatoId
    },
    onSuccess: (id) => navigate(`/campeonatos/${id}`),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted">
        <span className={step >= 1 ? 'font-semibold text-primary' : ''}>1. General</span>
        <span>→</span>
        <span className={step >= 2 ? 'font-semibold text-primary' : ''}>2. Disciplinas</span>
        <span>→</span>
        <span className={step >= 3 ? 'font-semibold text-primary' : ''}>3. Confirmar</span>
      </div>

      {step === 1 ? (
        <Card>
          <CardHeader>
            <CardTitle>Información general</CardTitle>
            <CardDescription>Nombre, año y descripción del campeonato.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input id="nombre" {...form1.register('nombre')} />
              {form1.formState.errors.nombre ? (
                <p className="text-sm text-accent">{form1.formState.errors.nombre.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="año">Año</Label>
              <Input id="año" type="number" {...form1.register('año', { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Input id="descripcion" {...form1.register('descripcion')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="portadaUrl">Imagen de portada (URL, opcional)</Label>
              <Input id="portadaUrl" placeholder="https://..." {...form1.register('portadaUrl')} />
            </div>
            <Button
              type="button"
              onClick={async () => {
                const ok = await form1.trigger()
                if (ok) setStep(2)
              }}
            >
              Continuar
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card>
          <CardHeader>
            <CardTitle>Disciplinas y categorías</CardTitle>
            <CardDescription>Selecciona disciplinas y define categorías separadas por coma.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              {DISCIPLINAS_DISPONIBLES.map((d) => {
                const checked = seleccionDisc.includes(d)
                return (
                  <label key={d} className="flex items-start gap-3 rounded-lg border border-black/10 bg-white p-3">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={checked}
                      onChange={(e) => {
                        setSeleccionDisc((prev) => {
                          if (e.target.checked) return Array.from(new Set([...prev, d]))
                          return prev.filter((x) => x !== d)
                        })
                        if (e.target.checked && !categoriasPorDisc[d]) {
                          setCategoriasPorDisc((p) => ({ ...p, [d]: 'Sub14,Juvenil' }))
                        }
                      }}
                    />
                    <div className="flex-1 space-y-2">
                      <p className="font-semibold">{d}</p>
                      <Input
                        value={categoriasPorDisc[d] || ''}
                        disabled={!checked}
                        onChange={(e) => setCategoriasPorDisc((p) => ({ ...p, [d]: e.target.value }))}
                        placeholder="Sub14,Juvenil"
                      />
                    </div>
                  </label>
                )
              })}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                Atrás
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (!seleccionDisc.length) return
                  setStep(3)
                }}
              >
                Continuar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card>
          <CardHeader>
            <CardTitle>Confirmar y publicar</CardTitle>
            <CardDescription>Se creará el campeonato y las disciplinas en Google Sheets vía API.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <pre className="overflow-auto rounded-lg bg-black/5 p-4 text-xs">{JSON.stringify(preview, null, 2)}</pre>
            {crear.isError ? <p className="text-sm text-accent">{(crear.error as Error).message}</p> : null}
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => setStep(2)} disabled={crear.isPending}>
                Atrás
              </Button>
              <Button type="button" onClick={() => crear.mutate()} disabled={crear.isPending}>
                {crear.isPending ? 'Publicando…' : 'Publicar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
