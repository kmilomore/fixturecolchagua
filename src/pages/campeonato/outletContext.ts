import { useOutletContext } from 'react-router-dom'
import type { Disciplina } from '@/types'

export interface CampeonatoOutletContext {
  campeonatoId: string
  disciplinaId: string
  disciplinas: Disciplina[]
}

export function useCampeonatoOutlet() {
  return useOutletContext<CampeonatoOutletContext>()
}
