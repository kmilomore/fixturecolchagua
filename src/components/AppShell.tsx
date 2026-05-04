import { NavLink, Outlet } from 'react-router-dom'
import { CalendarDays, Home, LayoutDashboard, Search, Shield, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'

const nav = [
  { to: '/', label: 'Inicio', icon: Home, end: true },
  { to: '/campeonatos', label: 'Campeonatos', icon: Trophy, end: false },
  { to: '/mis-partidos', label: 'Mis partidos', icon: Search, end: true },
  { to: '/admin', label: 'Admin', icon: Shield, end: true },
]

function linkClass({ isActive }: { isActive: boolean }) {
  return cn(
    'flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold md:flex-row md:text-sm',
    isActive ? 'bg-white/15 text-white' : 'text-white/80 hover:bg-white/10',
  )
}

export function AppShell() {
  const appName = import.meta.env.VITE_APP_NAME || 'SLEP Colchagua'

  return (
    <div className="flex min-h-dvh flex-col pb-20 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-primary text-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <NavLink to="/" className="flex items-center gap-2">
            <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-white/30">
              <img src="/SLEPCOLCHAGUA.webp" alt="SLEP Colchagua" className="h-full w-full object-contain p-1" />
            </div>
            <div className="leading-tight">
              <p className="font-display text-lg font-semibold tracking-wide">{appName}</p>
              <p className="text-xs text-white/70">Fixture público</p>
            </div>
          </NavLink>

          <nav className="hidden items-center gap-2 md:flex">
            {nav.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-black/10 bg-white/95 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 py-2">
          <NavLink to="/" end className={({ isActive }) => cn('flex flex-1 flex-col items-center gap-1 py-2 text-xs', isActive ? 'text-primary' : 'text-muted')}>
            <Home className="h-5 w-5" />
            Inicio
          </NavLink>
          <NavLink to="/campeonatos" className={({ isActive }) => cn('flex flex-1 flex-col items-center gap-1 py-2 text-xs', isActive ? 'text-primary' : 'text-muted')}>
            <Trophy className="h-5 w-5" />
            Campeonatos
          </NavLink>
          <NavLink to="/mis-partidos" className={({ isActive }) => cn('flex flex-1 flex-col items-center gap-1 py-2 text-xs', isActive ? 'text-primary' : 'text-muted')}>
            <Search className="h-5 w-5" />
            Mis partidos
          </NavLink>
          <NavLink to="/campeonatos" className={({ isActive }) => cn('flex flex-1 flex-col items-center gap-1 py-2 text-xs', isActive ? 'text-primary' : 'text-muted')}>
            <CalendarDays className="h-5 w-5" />
            Fixture
          </NavLink>
          <NavLink to="/admin" className={({ isActive }) => cn('flex flex-1 flex-col items-center gap-1 py-2 text-xs', isActive ? 'text-primary' : 'text-muted')}>
            <LayoutDashboard className="h-5 w-5" />
            Admin
          </NavLink>
        </div>
      </nav>
    </div>
  )
}
