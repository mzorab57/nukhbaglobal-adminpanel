import { Image as ImageIcon, LoaderCircle, Trash2, Upload } from 'lucide-react'

export default function ImageUploadField({
  label,
  value,
  onFileSelect,
  onClear,
  uploading = false,
  hint = '',
}) {
  return (
    <div className="space-y-3 text-sm text-zinc-300">
      <div className="flex items-center justify-between gap-3">
        <span>{label}</span>
        {uploading ? (
          <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-amber-100/75">
            <LoaderCircle size={14} className="animate-spin" />
            Uploading
          </span>
        ) : null}
      </div>

      <label className="flex cursor-pointer items-center justify-center gap-3 rounded-2xl border border-dashed border-white/12 bg-white/4 px-4 py-4 text-sm text-zinc-200 transition hover:border-amber-200/25 hover:bg-white/6">
        <Upload size={16} />
        <span>Select image file</span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) {
              onFileSelect(file)
            }

            event.target.value = ''
          }}
        />
      </label>

      {value ? (
        <div className="overflow-hidden rounded-2xl border border-white/8 bg-black/20">
          <img src={value} alt={label} className="h-40 w-full object-cover" />
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-zinc-500">
                <ImageIcon size={13} />
                Uploaded Image
              </p>
              <p className="mt-2 truncate text-xs text-zinc-400">{value}</p>
            </div>
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center gap-2 rounded-xl border border-rose-400/15 bg-rose-500/10 px-3 py-2 text-xs text-rose-200 transition hover:text-white"
            >
              <Trash2 size={14} />
              Clear
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4 text-xs text-zinc-500">
          {hint || 'No image uploaded yet.'}
        </div>
      )}
    </div>
  )
}
