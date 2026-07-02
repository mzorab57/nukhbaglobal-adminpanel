export default function BrandMark({ compact = false }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-200/15 bg-gradient-to-br from-amber-300/20 via-amber-100/10 to-transparent text-sm font-semibold tracking-[0.35em] text-amber-100 gold-ring">
        NG
      </div>
      {!compact && (
        <div>
          <p className="text-[10px] uppercase tracking-[0.4em] text-amber-100/55">
            Luxury Control Center
          </p>
          <h1 className="text-lg font-semibold tracking-[0.16em] text-white">
            NukhbaGlobal Admin
          </h1>
        </div>
      )}
    </div>
  )
}
