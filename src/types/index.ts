export type Genero = 'Damas' | 'Varones'
export type FasePartido = 'grupos' | 'semifinal' | 'tercer_lugar' | 'final'
export type EstadoPartido = 'programado' | 'en_curso' | 'finalizado' | 'postergado'
export type EstadoCampeonato = 'activo' | 'finalizado' | 'borrador'

export interface Campeonato {
  id: string
  nombre: string
  año: number
  disciplinas: string
  estado: EstadoCampeonato
  descripcion: string
  createdAt: string
}

export interface Disciplina {
  id: string
  campeonatoId: string
  nombre: string
  categorias: string
  estado: string
}

export interface Equipo {
  id: string
  campeonatoId: string
  disciplinaId: string
  nombre: string
  establecimiento: string
  genero: Genero
  categoria: string
  grupo: string
}

export interface Partido {
  id: string
  campeonatoId: string
  disciplinaId: string
  disciplina: string
  fecha: string
  hora: string
  lugar: string
  localId: string
  visitaId: string
  localNombre: string
  visitaNombre: string
  marcadorLocal: string | number
  marcadorVisita: string | number
  fase: FasePartido
  genero: Genero
  categoria: string
  grupo?: string
  estado: EstadoPartido
  jornada: number | string
}

export interface PartidoResumen {
  siguiente: Partido | null
  hoy: Partido[]
  proximos: Partido[]
  totalHoy: number
  updatedAt: string
}

export interface Grupo {
  id: string
  campeonatoId: string
  disciplinaId: string
  nombre: string
  genero: Genero
  categoria: string
  equiposIds: string
}

export interface FilaTabla {
  id: string
  grupoId: string
  equipoId: string
  equipoNombre: string
  pj: number
  pg: number
  pe: number
  pp: number
  sf: number
  sc: number
  diferencia: number
  puntos: number
}
