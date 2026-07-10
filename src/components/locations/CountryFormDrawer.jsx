import { Globe2, Save, Trash2 } from 'lucide-react'
import { formatDateTime, formatNumber } from '../../lib/format'
import SlideOverDrawer from './SlideOverDrawer'

function toneForStatus(isActive) {
  return isActive
    ? 'border-emerald-400/15 bg-emerald-500/10 text-emerald-200'
    : 'border-rose-400/15 bg-rose-500/10 text-rose-200'
}

export default function CountryFormDrawer({
  isOpen,
  mode,
  selectedCountry,
  form,
  saving,
  deleting,
  onClose,
  onSubmit,
  onFieldChange,
  onDelete,
}) {
  return (
    <SlideOverDrawer
      isOpen={isOpen}
      onClose={onClose}
      eyebrow={mode === 'edit' ? 'Edit Country' : 'New Country'}
      title="Country Profile"
    >
      <div className="space-y-6">
        {selectedCountry && mode === 'edit' ? (
          <div className="rounded-3xl border border-white/8 bg-white/4 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Globe2 size={16} className="text-amber-200" />
                  <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Selected country</p>
                </div>
                <h3 className="mt-3 text-lg font-semibold text-white">{selectedCountry.nameText}</h3>
                <p className="mt-1 text-sm text-zinc-500">Updated {formatDateTime(selectedCountry.updatedAt)}</p>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs font-medium ${toneForStatus(selectedCountry.status)}`}>
                {selectedCountry.status ? 'active' : 'hidden'}
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/6 bg-black/10 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Cities</p>
                <p className="mt-2 text-sm text-white">{formatNumber(selectedCountry.citiesCount)}</p>
              </div>
              <div className="rounded-2xl border border-white/6 bg-black/10 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Events</p>
                <p className="mt-2 text-sm text-white">{formatNumber(selectedCountry.eventsCount)}</p>
              </div>
            </div>
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="space-y-2 text-sm text-zinc-300">
            <span>Name EN</span>
            <input
              value={form.name_en}
              onChange={onFieldChange('name_en')}
              className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none"
            />
          </label>

          <label className="space-y-2 text-sm text-zinc-300">
            <span>Name AR/KU</span>
            <input
              value={form.name_ar}
              onChange={onFieldChange('name_ar')}
              className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none"
            />
          </label>

          <label className="space-y-2 text-sm text-zinc-300">
            <span>Status</span>
            <select
              value={form.status}
              onChange={onFieldChange('status')}
              className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none"
            >
              <option value="1">Active</option>
              <option value="0">Hidden</option>
            </select>
          </label>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-amber-300 via-amber-200 to-orange-200 px-5 py-3 text-sm font-semibold text-zinc-900 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              <Save size={16} />
              {saving ? 'Saving...' : mode === 'edit' ? 'Save country' : 'Create country'}
            </button>

            {selectedCountry && mode === 'edit' ? (
              <button
                type="button"
                onClick={() => onDelete(selectedCountry.id)}
                disabled={deleting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                <Trash2 size={16} />
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </SlideOverDrawer>
  )
}
