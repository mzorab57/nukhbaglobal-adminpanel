import { CalendarDays, Save, Trash2 } from 'lucide-react'
import { formatDateTime, formatNumber } from '../../lib/format'
import SlideOverDrawer from './SlideOverDrawer'

export default function SubEventFormDrawer({
  isOpen,
  mode,
  selectedSubEvent,
  cities,
  events,
  form,
  saving,
  deleting,
  onClose,
  onSubmit,
  onFieldChange,
  onDelete,
}) {
  const linkedEventTitle =
    selectedSubEvent?.eventTitleText || events.find((item) => String(item.id) === form.event_id)?.titleText || 'N/A'

  return (
    <SlideOverDrawer
      isOpen={isOpen}
      onClose={onClose}
      eyebrow={mode === 'edit' ? 'Edit Sub-Event' : 'New Sub-Event'}
      title="Schedule Profile"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-6">
        {selectedSubEvent && mode === 'edit' ? (
          <div className="rounded-3xl border border-white/8 bg-white/4 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <CalendarDays size={16} className="text-amber-200" />
                  <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Selected sub-event</p>
                </div>
                <h3 className="mt-3 text-lg font-semibold text-white">{selectedSubEvent.titleText}</h3>
                <p className="mt-1 text-sm text-zinc-500">
                  {selectedSubEvent.eventTitleText} · {selectedSubEvent.cityNameText}
                </p>
              </div>
              <span className="rounded-full border border-white/8 bg-black/10 px-3 py-1 text-xs font-medium text-zinc-200">
                {formatNumber(selectedSubEvent.ticketsCount)} tickets
              </span>
            </div>
            <div className="mt-4 rounded-2xl border border-white/6 bg-black/10 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Schedule</p>
              <p className="mt-2 text-sm text-white">{formatDateTime(`${selectedSubEvent.date} ${selectedSubEvent.startTime}`)}</p>
              <p className="mt-1 text-xs text-zinc-500">{selectedSubEvent.startTime} - {selectedSubEvent.endTime}</p>
            </div>
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-4">
          {mode === 'create' ? (
            <label className="space-y-2 text-sm text-zinc-300">
              <span>Event</span>
              <select
                value={form.event_id}
                onChange={onFieldChange('event_id')}
                className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none"
              >
                <option value="">Select event</option>
                {events.map((eventItem) => (
                  <option key={eventItem.id} value={eventItem.id}>
                    {eventItem.titleText}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="rounded-3xl border border-white/8 bg-white/4 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Linked Event</p>
              <p className="mt-2 text-sm font-medium text-white">{linkedEventTitle}</p>
            </div>
          )}

          <label className="space-y-2 text-sm text-zinc-300">
            <span>City</span>
            <select
              value={form.city_id}
              onChange={onFieldChange('city_id')}
              className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none"
            >
              <option value="">Select city</option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.nameText}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-zinc-300">
              <span>Title EN</span>
              <input
                value={form.title_en}
                onChange={onFieldChange('title_en')}
                className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none"
              />
            </label>
            <label className="space-y-2 text-sm text-zinc-300">
              <span>Title AR/KU</span>
              <input
                value={form.title_ar}
                onChange={onFieldChange('title_ar')}
                className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-zinc-300">
              <span>Sub Title EN</span>
              <input
                value={form.sub_title_en}
                onChange={onFieldChange('sub_title_en')}
                className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none"
              />
            </label>
            <label className="space-y-2 text-sm text-zinc-300">
              <span>Sub Title AR/KU</span>
              <input
                value={form.sub_title_ar}
                onChange={onFieldChange('sub_title_ar')}
                className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-zinc-300">
              <span>Description EN</span>
              <textarea
                rows="4"
                value={form.description_en}
                onChange={onFieldChange('description_en')}
                className="w-full rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-white outline-none"
              />
            </label>
            <label className="space-y-2 text-sm text-zinc-300">
              <span>Description AR/KU</span>
              <textarea
                rows="4"
                value={form.description_ar}
                onChange={onFieldChange('description_ar')}
                className="w-full rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-white outline-none"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-zinc-300">
              <span>Location EN</span>
              <input
                value={form.location_en}
                onChange={onFieldChange('location_en')}
                className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none"
              />
            </label>
            <label className="space-y-2 text-sm text-zinc-300">
              <span>Location AR/KU</span>
              <input
                value={form.location_ar}
                onChange={onFieldChange('location_ar')}
                className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-2 text-sm text-zinc-300">
              <span>Date</span>
              <input
                type="date"
                value={form.date}
                onChange={onFieldChange('date')}
                className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none"
              />
            </label>
            <label className="space-y-2 text-sm text-zinc-300">
              <span>Start Time</span>
              <input
                type="time"
                value={form.start_time}
                onChange={onFieldChange('start_time')}
                className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none"
              />
            </label>
            <label className="space-y-2 text-sm text-zinc-300">
              <span>End Time</span>
              <input
                type="time"
                value={form.end_time}
                onChange={onFieldChange('end_time')}
                className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none"
              />
            </label>
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 via-amber-200 to-orange-200 px-5 py-3 text-sm font-semibold text-zinc-900 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              <Save size={16} />
              {saving ? 'Saving...' : mode === 'edit' ? 'Save sub-event' : 'Create sub-event'}
            </button>

            {selectedSubEvent && mode === 'edit' ? (
              <button
                type="button"
                onClick={() => onDelete(selectedSubEvent.id)}
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
