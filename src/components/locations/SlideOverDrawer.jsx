import { XCircle } from 'lucide-react'

export default function SlideOverDrawer({
  isOpen,
  onClose,
  eyebrow,
  title,
  children,
  maxWidth = 'max-w-2xl',
}) {
  return (
    <div
      className={`fixed inset-0 z-40 transition-all duration-300 ${
        isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <button
        type="button"
        aria-label="Close drawer"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />

      <aside
        className={`panel-surface panel-border panel-shadow absolute right-0 top-0 h-full w-full ${maxWidth} overflow-y-auto border-l border-white/10 p-4 sm:p-5 transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="mb-5 flex items-start justify-between gap-3 sm:mb-6 sm:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">{eyebrow}</p>
            <h2 className="mt-2 text-xl font-semibold text-white">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-white/8 bg-white/4 p-2 text-zinc-300 transition hover:bg-white/8"
          >
            <XCircle size={16} />
          </button>
        </div>

        {children}
      </aside>
    </div>
  )
}
