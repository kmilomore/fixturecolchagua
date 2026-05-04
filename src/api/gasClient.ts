import type {
  Campeonato,
  Disciplina,
  Equipo,
  FilaTabla,
  Grupo,
  Partido,
  PartidoResumen,
} from '@/types'
import { ADMIN_SESSION_STORAGE_KEY } from '@/stores/adminSession'

const GAS_URL = import.meta.env.VITE_GAS_URL as string | undefined

interface GASResponse<T> {
  status: number
  data: T
  timestamp: string
}

interface AdminUser {
  email: string
  name: string
  picture: string
}

function assertGasUrl() {
  if (!GAS_URL) throw new Error('Falta VITE_GAS_URL en .env.local')
}

function getStoredAdminToken() {
  if (typeof window === 'undefined') return ''
  const raw = window.sessionStorage.getItem(ADMIN_SESSION_STORAGE_KEY)
  if (!raw) return ''

  try {
    const parsed = JSON.parse(raw) as { state?: { token?: string; expiresAt?: number } }
    const expiresAt = Number(parsed.state?.expiresAt || 0)
    if (!expiresAt || expiresAt <= Date.now()) return ''
    return parsed.state?.token || ''
  } catch {
    return ''
  }
}

const API_TIMEOUT_MS = 15_000

function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), API_TIMEOUT_MS)
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(id))
}

async function get<T>(params: Record<string, string | undefined>): Promise<T> {
  assertGasUrl()
  const url = new URL(GAS_URL as string)
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') url.searchParams.append(k, v)
  })
  const res = await fetchWithTimeout(url.toString())
  const json = (await res.json()) as GASResponse<T> & { data: unknown }
  if (json.status >= 400) {
    const err = json.data as { error?: string }
    throw new Error(err?.error || 'Error en API')
  }
  return json.data as T
}

async function post<T>(body: {
  resource: string
  action: string
  payload: unknown
  token?: string
}): Promise<T> {
  assertGasUrl()
  const token = body.token ?? getStoredAdminToken()
  const res = await fetchWithTimeout(GAS_URL as string, {
    method: 'POST',
    body: JSON.stringify({ ...body, token }),
  })
  const json = (await res.json()) as GASResponse<T> & { data: unknown }
  if (json.status >= 400) {
    const err = json.data as { error?: string }
    throw new Error(err?.error || 'Error en API')
  }
  return json.data as T
}

export const api = {
  auth: {
    login: (idToken: string) =>
      post<{ authenticated: boolean; user: AdminUser }>({
        resource: 'auth',
        action: 'login',
        payload: {},
        token: idToken,
      }),
  },
  campeonatos: {
    getAll: () => get<Campeonato[]>({ resource: 'campeonatos' }),
    getById: (id: string) => get<Campeonato>({ resource: 'campeonatos', id }),
    create: (payload: Record<string, unknown>) =>
      post<{ created: boolean; id: string }>({
        resource: 'campeonatos',
        action: 'create',
        payload,
      }),
    update: (payload: Record<string, unknown>) =>
      post({ resource: 'campeonatos', action: 'update', payload }),
  },
  disciplinas: {
    getByCampeonato: (campeonatoId: string) =>
      get<Disciplina[]>({ resource: 'disciplinas', campeonatoId }),
    create: (payload: Record<string, unknown>) =>
      post({ resource: 'disciplinas', action: 'create', payload }),
  },
  partidos: {
    query: (filters: Partial<{
      campeonatoId: string
      disciplinaId: string
      disciplina: string
      genero: string
      fase: string
      fecha: string
      jornada: string
      vista: string
    }>) =>
      get<Partido[]>({
        resource: 'partidos',
        ...Object.fromEntries(
          Object.entries(filters).map(([k, v]) => [k, v === undefined ? '' : String(v)]),
        ),
      }),
    getResumen: (filters: Partial<{
      campeonatoId: string
      disciplinaId: string
      disciplina: string
      genero: string
      fase: string
    }>) =>
      get<PartidoResumen>({
        resource: 'partidos',
        vista: 'resumen',
        ...Object.fromEntries(
          Object.entries(filters).map(([k, v]) => [k, v === undefined ? '' : String(v)]),
        ),
      }),
    create: (payload: Record<string, unknown>) =>
      post({ resource: 'partidos', action: 'create', payload }),
    update: (payload: { id: string; hora?: string; lugar?: string }) =>
      post({ resource: 'partidos', action: 'update', payload }),
    registrarResultado: (id: string, marcadorLocal: number, marcadorVisita: number) =>
      post({
        resource: 'partidos',
        action: 'resultado',
        payload: { id, marcadorLocal, marcadorVisita },
      }),
  },
  grupos: {
    query: (filters: { campeonatoId: string; disciplinaId?: string; genero?: string }) =>
      get<Grupo[]>({
        resource: 'grupos',
        campeonatoId: filters.campeonatoId,
        disciplinaId: filters.disciplinaId,
        genero: filters.genero,
      }),
    getTabla: (grupoId: string) => get<FilaTabla[]>({ resource: 'tabla', grupoId }),
    create: (payload: Record<string, unknown>) =>
      post({ resource: 'grupos', action: 'create', payload }),
  },
  equipos: {
    getByCampeonato: (campeonatoId: string) =>
      get<Equipo[]>({ resource: 'equipos', campeonatoId }),
    create: (payload: Record<string, unknown>) =>
      post({ resource: 'equipos', action: 'create', payload }),
  },
  import: {
    migrateFromTemp: (payload: { campeonatoId: string; disciplinaId: string; disciplina?: string }) =>
      post<{ migrated: boolean; partidosCreated: number }>({
        resource: 'import',
        action: 'migrate',
        payload,
      }),
  },
}
