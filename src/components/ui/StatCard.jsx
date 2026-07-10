export default function StatCard({ eyebrow, title, value, delta }) {
  return (
    <div className="panel-surface panel-border panel-shadow rounded-3xl p-3">
      {/* <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">{eyebrow}</p> */}
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-zinc-400 truncate">{title}</p>
          <h3 className="mt-2 text-2xl lg:text-3xl font-semibold text-white truncate" title={value}>{value}</h3>
        </div>
        {/* {delta ? (
          <span className="shrink-0 rounded-full border border-emerald-300/15 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200 max-w-full truncate" title={delta}>
            {delta}
          </span>
        )
         : null} */}
      </div>
    </div>
  )
}
