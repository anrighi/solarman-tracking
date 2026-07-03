import { Link, Outlet, useRouterState } from '@tanstack/react-router'
import { Bell, Database, LayoutDashboard, RefreshCw } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { AppLogo } from '@/components/app-logo'

type SettingsNavItem = {
  to:
    | '/settings/sync'
    | '/settings/notifications'
    | '/settings/dashboard'
    | '/settings/backup'
  label: string
  description: string
  icon: LucideIcon
}

const NAV_ITEMS: SettingsNavItem[] = [
  {
    to: '/settings/sync',
    label: 'Sincronizzazione',
    description: 'Worker Solarman e backfill storico',
    icon: RefreshCw,
  },
  {
    to: '/settings/notifications',
    label: 'Notifiche',
    description: 'Telegram e alert batteria',
    icon: Bell,
  },
  {
    to: '/settings/dashboard',
    label: 'Dashboard',
    description: 'Intervallo e grafico predefiniti',
    icon: LayoutDashboard,
  },
  {
    to: '/settings/backup',
    label: 'Backup',
    description: 'Policy, cronologia e ripristino',
    icon: Database,
  },
]

export function SettingsLayout() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const activeItem =
    NAV_ITEMS.find((item) => pathname.startsWith(item.to)) ?? NAV_ITEMS[0]

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AppLogo />
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Impostazioni</h1>
            <p className="mt-1 text-slate-600">{activeItem.description}</p>
          </div>
        </div>
        <Link to="/" className="text-sm text-amber-600 hover:underline">
          ← Dashboard
        </Link>
      </header>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <aside className="w-full shrink-0 lg:w-56">
          <nav
            aria-label="Sezioni impostazioni"
            className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm"
          >
            <ul className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon
                const isActive = pathname.startsWith(item.to)

                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                        isActive
                          ? 'bg-amber-50 font-medium text-amber-800'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
        </aside>

        <div className="min-w-0 flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
