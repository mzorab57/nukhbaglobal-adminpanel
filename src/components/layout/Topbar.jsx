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
    <header className="panel-surface  panel-shadow flex items-center justify-between gap-4 ">
    
        <div className="rounded-2xl flex items-center justify-between gap-2 border border-white/8 bg-white/4 px-4 py-2 text-right">
          <p className="text-sm font-medium text-white">{user?.name}</p>
          <p className="text-xs tracking-[0.15em] text-zinc-500">{user?.role || user?.email}</p>
        </div>
     
    </header>
  )
}
