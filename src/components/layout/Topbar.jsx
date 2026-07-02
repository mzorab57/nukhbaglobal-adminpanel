import { Bell, Search } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../lib/auth'

const PAGE_TITLES = {
  '/dashboard': 'Dashboard Overview',
  '/dashboard/events': 'Events & Tickets',
  '/dashboard/locations': 'Locations Management',
  '/dashboard/orders': 'Orders & Payments',
  '/dashboard/scans': 'Scan Reports',
}

export default function Topbar() {
  const { user } = useAuth()
  const location = useLocation()
  const pageTitle = PAGE_TITLES[location.pathname] || 'Admin Panel'

  return (
    <header className="panel-surface panel-border panel-shadow flex items-center justify-between gap-4 rounded-[2rem] px-5 py-4">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Admin Panel</p>
        <h2 className="mt-1 text-xl font-semibold text-white">{pageTitle}</h2>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-3 rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-zinc-400 md:flex">
          <Search size={16} />
          <span>Search modules, reports, or events...</span>
        </div>
        <button type="button" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/8 bg-white/4 text-zinc-200 transition hover:bg-white/8">
          <Bell size={18} />
        </button>
        <div className="rounded-2xl border border-white/8 bg-white/4 px-4 py-2 text-right">
          <p className="text-sm font-medium text-white">{user?.name}</p>
          <p className="text-xs tracking-[0.15em] text-zinc-500">{user?.role || user?.email}</p>
        </div>
      </div>
    </header>
  )
}
