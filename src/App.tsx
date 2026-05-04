import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AppShell } from '@/components/AppShell'
import { HomePage } from '@/pages/HomePage'
import { CampeonatosPage } from '@/pages/CampeonatosPage'
import { CampeonatoNewPage } from '@/pages/CampeonatoNewPage'
import { MisPartidosPage } from '@/pages/MisPartidosPage'
import { KioscoPage } from '@/pages/KioscoPage'
import { CampeonatoLayout } from '@/pages/campeonato/CampeonatoLayout'
import { CampeonatoHome } from '@/pages/campeonato/CampeonatoHome'
import { CalendarioPage } from '@/pages/campeonato/CalendarioPage'
import { GruposPage } from '@/pages/campeonato/GruposPage'
import { FasesPage } from '@/pages/campeonato/FasesPage'
import { PartidosPage } from '@/pages/campeonato/PartidosPage'
import { AdminPage } from '@/pages/admin/AdminPage'
import { AdminResultadosPage } from '@/pages/admin/AdminResultadosPage'
import { isAdminSessionActive, useAdminSession } from '@/stores/adminSession'

function RequireAdmin({ children }: { children: ReactNode }) {
  const ok = useAdminSession((s) => isAdminSessionActive(s))
  if (!ok) return <Navigate to="/admin" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="campeonatos" element={<CampeonatosPage />} />
          <Route path="mis-partidos" element={<MisPartidosPage />} />
          <Route
            path="campeonatos/nuevo"
            element={
              <RequireAdmin>
                <CampeonatoNewPage />
              </RequireAdmin>
            }
          />
          <Route path="campeonatos/:id" element={<CampeonatoLayout />}>
            <Route index element={<CampeonatoHome />} />
            <Route path="calendario" element={<CalendarioPage />} />
            <Route path="grupos" element={<GruposPage />} />
            <Route path="fases" element={<FasesPage />} />
            <Route path="partidos" element={<PartidosPage />} />
          </Route>
          <Route path="admin" element={<AdminPage />} />
          <Route path="admin/resultados" element={<AdminResultadosPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
        <Route path="kiosco" element={<KioscoPage />} />
      </Routes>
    </BrowserRouter>
  )
}
