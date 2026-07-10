import { NavLink } from 'react-router-dom'
import { primaryNavigation } from '../../lib/navigation'
import BrandMark from '../ui/BrandMark'

export default function Sidebar({ mobile = false, onNavigate, className = '' }) {
  return (
    <aside
      className={`panel-surface panel-border panel-shadow ${
        mobile
          ? 'flex h-full w-full flex-col rounded-none border-l border-white/10 p-4 sm:max-w-sm sm:rounded-l-4xl sm:p-5'
          : 'sticky top-4 hidden h-[calc(100vh-2rem)] w-[320px] shrink-0 rounded-4xl p-6 lg:top-6 lg:flex lg:h-[calc(100vh-3rem)] lg:flex-col'
      } ${className}`}
    >
      <BrandMark compact={mobile} />
      <div className={`space-y-2 overflow-y-auto ${mobile ? 'mt-6 overflow-y-auto pr-1' : 'mt-10'}`}>
        {primaryNavigation.map((item) => {
          const Icon = item.icon

          return (
            <NavLink
              key={item.title}
              to={item.href}
              end={item.href === '/dashboard'}
              onClick={onNavigate}
              className={({ isActive }) =>
                `block w-full rounded-2xl px-4 py-2 text-left transition  ${
                  isActive
                    ? 'bg-linear-to-r from-amber-300/18 to-white/5 text-white gold-ring'
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
     
    </aside>
  )
}
