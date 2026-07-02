import { LogOut, Menu } from 'lucide-react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import BrandMark from '../ui/BrandMark'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function ProtectedLayout() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen p-4 text-white lg:p-6">
      <div className="grid-glow fixed inset-0 -z-10 opacity-40" />
      <div className="mx-auto flex max-w-[1600px] gap-6">
        <Sidebar />
        <div className="flex min-h-[calc(100vh-2rem)] flex-1 flex-col gap-5">
          <div className="panel-surface panel-border panel-shadow flex items-center justify-between rounded-[2rem] px-5 py-4 lg:hidden">
            <BrandMark compact />
            <button type="button" className="rounded-2xl border border-white/8 bg-white/4 p-3 text-zinc-200">
              <Menu size={18} />
            </button>
          </div>
          <Topbar />
          <main className="flex-1">
            <Outlet />
          </main>
          <div className="panel-surface panel-border flex items-center justify-between rounded-[2rem] px-5 py-4 text-sm text-zinc-400">
            <p>Admin panel shell ready for module integration.</p>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/8 bg-white/4 px-4 py-2 text-zinc-200 transition hover:bg-white/8"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
