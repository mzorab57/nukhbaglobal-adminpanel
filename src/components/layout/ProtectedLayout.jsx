import { useEffect, useState } from 'react'
import { LogOut, Menu, XCircle } from 'lucide-react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import BrandMark from '../ui/BrandMark'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function ProtectedLayout() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
  }

  useEffect(() => {
    closeMobileMenu()
  }, [location.pathname])

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  return (
    <div className="min-h-screen p-4 text-white lg:p-6">
      <div className="grid-glow fixed inset-0 -z-10 opacity-40" />
      <div className="mx-auto flex max-w-[1600px] gap-6">
        <Sidebar />
        <div className="flex min-w-0 min-h-[calc(100vh-2rem)] flex-1 flex-col gap-5">
          <div className="panel-surface panel-border panel-shadow flex items-center justify-between rounded-[2rem] px-5 py-4 lg:hidden">
            <div className="min-w-0">
              <BrandMark compact />
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-2xl border border-white/8 bg-white/4 p-3 text-zinc-200 transition hover:bg-white/8"
              aria-label="Open mobile menu"
            >
              <Menu size={18} />
            </button>
          </div>
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
          <div className="panel-surface panel-border flex flex-col gap-4 rounded-[2rem] px-4 py-4 text-sm text-zinc-400 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <Topbar />
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/8 bg-white/4 px-4 py-2 text-zinc-200 transition hover:bg-white/8 sm:w-auto"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div
        className={`fixed inset-0 z-50 lg:hidden transition-all duration-300 ${
          mobileMenuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <button
          type="button"
          aria-label="Close mobile menu"
          onClick={closeMobileMenu}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        <div
          className={`absolute right-0 top-0 h-full w-full max-w-sm transition-transform duration-300 ease-out ${
            mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex h-full flex-col">
            <div className="panel-surface panel-border mx-4 mt-4 flex items-center justify-between rounded-[2rem] px-4 py-4 sm:mx-5">
              <BrandMark compact />
              <button
                type="button"
                onClick={closeMobileMenu}
                className="rounded-2xl border border-white/8 bg-white/4 p-2 text-zinc-300 transition hover:bg-white/8"
                aria-label="Close menu"
              >
                <XCircle size={18} />
              </button>
            </div>

            <Sidebar mobile onNavigate={closeMobileMenu} className="mx-4 mt-3 min-h-0 flex-1 sm:mx-5" />

            <div className="panel-surface panel-border mx-4 mb-4 mt-3 rounded-[2rem] px-4 py-4 sm:mx-5">
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-zinc-200 transition hover:bg-white/8"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
