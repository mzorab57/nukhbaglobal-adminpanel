import { useLocation } from 'react-router-dom'
import { useAuth } from '../../lib/auth'

const PAGE_TITLES = {
  '/dashboard': 'Dashboard Overview',
  '/dashboard/events': 'Events & Tickets',
  '/dashboard/locations': 'Locations Management',
  '/dashboard/orders': 'Orders & Payments',
  '/dashboard/expenses': 'Expenses Management',
  '/dashboard/scans': 'Scan Reports',
  '/dashboard/stalls': 'Stall Applications',
  '/dashboard/volunteers': 'Volunteer Applications',
  '/dashboard/featured': 'Website Media',
  '/dashboard/users': 'Users Management',
  '/dashboard/office-sales': 'Office Sales',
}

export default function Topbar() {
  const { user } = useAuth()
  const location = useLocation()
  const pageTitle = PAGE_TITLES[location.pathname] || 'Admin Panel'

  return (
    <header className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Current view</p>
        <p className="mt-1 truncate text-sm font-medium text-white">{pageTitle}</p>
      </div>

      <div className="rounded-2xl border border-white/8 bg-white/4 px-4 py-2 text-left sm:text-right">
        <p className="text-sm font-medium text-white">{user?.name}</p>
        <p className="text-xs tracking-[0.15em] text-zinc-500">{user?.role || user?.email}</p>
      </div>
    </header>
  )
}
