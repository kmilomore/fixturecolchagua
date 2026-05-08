import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { NavLink, Outlet } from 'react-router-dom'
import { CalendarDays, Home, LayoutDashboard, Search, Shield, Trophy } from 'lucide-react'
import { api } from '@/api/gasClient'
import { GlobalHeaderSearch } from '@/components/GlobalHeaderSearch'
import { GlobalMatchDetailController } from '@/components/GlobalMatchDetailController'
import { hasGasUrl } from '@/config'
import { cn } from '@/lib/utils'

function linkClass({ isActive }: { isActive: boolean }) {
  return cn(
    'flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold transition duration-200 md:flex-row md:text-sm',
    isActive ? 'bg-white text-primary shadow-[0_16px_32px_-20px_rgba(0,0,0,0.55)]' : 'text-white/80 hover:bg-white/10 hover:text-white',
  )
}

export function AppShell() {
  const appName = import.meta.env.VITE_APP_NAME || 'SLEP Colchagua'
  const campeonatosQ = useQuery({
    queryKey: ['campeonatos'],
    queryFn: () => api.campeonatos.getAll(),
    enabled: hasGasUrl,
    staleTime: 5 * 60 * 1000,
  })
  const campeonatoActivo = useMemo(() => {
    const rows = campeonatosQ.data || []
    return rows.find((row) => row.estado === 'activo') || rows[0] || null
  }, [campeonatosQ.data])
  const fixturePath = campeonatoActivo ? `/campeonatos/${campeonatoActivo.id}/calendario` : '/campeonatos'
  const nav = [
    { to: '/', label: 'Inicio', icon: Home, end: true },
    { to: '/campeonatos', label: 'Campeonatos', icon: Trophy, end: false },
    { to: fixturePath, label: 'Fixture activo', mobileLabel: 'Fixture', icon: CalendarDays, end: false },
    { to: '/mis-partidos', label: 'Mis partidos', icon: Search, end: true },
    { to: '/admin', label: 'Admin', icon: Shield, end: true },
  ]

  return (
    <div className="flex min-h-dvh flex-col bg-transparent pb-24 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[linear-gradient(135deg,rgba(37,48,107,0.96),rgba(0,107,185,0.88))] text-white shadow-[0_20px_50px_-32px_rgba(20,30,75,0.95)] backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <NavLink to="/" className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-white/30 sm:h-11 sm:w-11">
              <img src="/SLEPCOLCHAGUA.webp" alt="SLEP Colchagua" className="h-full w-full object-contain p-1" />
            </div>
            <div className="min-w-0 leading-tight">
              <p className="truncate font-display text-base font-semibold tracking-wide sm:text-lg">{appName}</p>
              <p className="text-[11px] text-white/70 sm:text-xs">Fixture público</p>
            </div>
          </NavLink>

          <div className="hidden flex-1 justify-center px-4 md:flex">
            <GlobalHeaderSearch campeonatoId={campeonatoActivo?.id} />
          </div>

          <nav className="hidden items-center gap-2 md:flex">
            {nav.map((item) => (
              <NavLink key={item.label} to={item.to} end={item.end} className={linkClass}>
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="md:hidden">
            <GlobalHeaderSearch campeonatoId={campeonatoActivo?.id} />
          </div>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-6xl flex-1 px-3 py-4 sm:px-4 sm:py-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-40 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.8),transparent_70%)]" />
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-black/10 bg-white/92 backdrop-blur supports-[padding:max(0px)]:pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden">
        <div className="mx-auto flex max-w-lg items-stretch justify-around gap-1 px-2 py-2">
          {nav.map((item) => {
            const Icon = item.to === '/admin' ? LayoutDashboard : item.icon
            return (
              <NavLink
                key={item.label + '-mobile'}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] font-semibold transition',
                    isActive ? 'bg-primary/8 text-primary' : 'text-muted',
                  )
                }
              >
                <Icon className="h-5 w-5" />
                <span className="truncate">{item.mobileLabel || item.label}</span>
              </NavLink>
            )
          })}
        </div>
      </nav>

      <GlobalMatchDetailController />
    </div>
  )
}
