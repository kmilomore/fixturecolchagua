import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import type { ReactNode } from 'react'
import { AppShell } from '@/components/AppShell'
import { isAdminSessionActive, useAdminSession } from '@/stores/adminSession'

const HomePage = lazy(() => import('@/pages/HomePage').then((m) => ({ default: m.HomePage })))
const CampeonatosPage = lazy(() => import('@/pages/CampeonatosPage').then((m) => ({ default: m.CampeonatosPage })))
const CampeonatoNewPage = lazy(() => import('@/pages/CampeonatoNewPage').then((m) => ({ default: m.CampeonatoNewPage })))
const MisPartidosPage = lazy(() => import('@/pages/MisPartidosPage').then((m) => ({ default: m.MisPartidosPage })))
const KioscoPage = lazy(() => import('@/pages/KioscoPage').then((m) => ({ default: m.KioscoPage })))
const CampeonatoLayout = lazy(() => import('@/pages/campeonato/CampeonatoLayout').then((m) => ({ default: m.CampeonatoLayout })))
const CampeonatoHome = lazy(() => import('@/pages/campeonato/CampeonatoHome').then((m) => ({ default: m.CampeonatoHome })))
const CalendarioPage = lazy(() => import('@/pages/campeonato/CalendarioPage').then((m) => ({ default: m.CalendarioPage })))
const GruposPage = lazy(() => import('@/pages/campeonato/GruposPage').then((m) => ({ default: m.GruposPage })))
const FasesPage = lazy(() => import('@/pages/campeonato/FasesPage').then((m) => ({ default: m.FasesPage })))
const PartidosPage = lazy(() => import('@/pages/campeonato/PartidosPage').then((m) => ({ default: m.PartidosPage })))
const AdminPage = lazy(() => import('@/pages/admin/AdminPage').then((m) => ({ default: m.AdminPage })))
const AdminResultadosPage = lazy(() => import('@/pages/admin/AdminResultadosPage').then((m) => ({ default: m.AdminResultadosPage })))

function RequireAdmin({ children }: { children: ReactNode }) {
  const ok = useAdminSession((s) => isAdminSessionActive(s))
  if (!ok) return <Navigate to="/admin" replace />
  return children
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground text-sm">
      Cargando…
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
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
            <Route
              path="admin/resultados"
              element={
                <RequireAdmin>
                  <AdminResultadosPage />
                </RequireAdmin>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
          <Route path="kiosco" element={<KioscoPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
