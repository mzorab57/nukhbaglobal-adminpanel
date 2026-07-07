import { NavLink } from 'react-router-dom'
import { primaryNavigation } from '../../lib/navigation'
import BrandMark from '../ui/BrandMark'

export default function Sidebar() {
  return (
    <aside className="panel-surface panel-border panel-shadow hidden h-[calc(100vh-2rem)] lg:h-[calc(100vh-3rem)] w-[320px] shrink-0 rounded-[2rem] p-6 lg:flex lg:flex-col sticky top-4 lg:top-6">
      <BrandMark />
      <div className="mt-10 space-y-2">
        {primaryNavigation.map((item) => {
          const Icon = item.icon

          return (
            <NavLink
              key={item.title}
              to={item.href}
              className={({ isActive }) =>
                `block w-full rounded-2xl px-4 py-4 text-left transition ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-300/18 to-white/5 text-white gold-ring'
                    : 'text-zinc-400 hover:bg-white/4 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 rounded-2xl p-2 ${
                      isActive ? 'bg-amber-200/12 text-amber-100' : 'bg-white/4 text-zinc-300'
                    }`}
                  >
                    <Icon size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-medium tracking-[0.08em]">{item.title}</p>
                    <p className="mt-1 text-xs leading-5 text-zinc-500">{item.description}</p>
                  </div>
                </div>
              )}
            </NavLink>
          )
        })}
      </div>
      <div className="mt-auto rounded-3xl border border-amber-200/10 bg-gradient-to-br from-amber-300/10 to-transparent p-5">
        <p className="text-xs uppercase tracking-[0.35em] text-amber-100/55">Phase 2</p>
        <h3 className="mt-3 text-lg font-semibold text-white">Live Overview</h3>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Secure backend login and live dashboard metrics are now wired into the admin shell.
        </p>
      </div>
    </aside>
  )
}
