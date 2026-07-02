export default function StatCard({ eyebrow, title, value, delta }) {
  return (
    <div className="panel-surface panel-border panel-shadow rounded-3xl p-5">
      <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">{eyebrow}</p>
      <div className="mt-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-400">{title}</p>
          <h3 className="mt-2 text-3xl font-semibold text-white">{value}</h3>
        </div>
        <span className="rounded-full border border-emerald-300/15 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200">
          {delta}
        </span>
      </div>
    </div>
  )
}
