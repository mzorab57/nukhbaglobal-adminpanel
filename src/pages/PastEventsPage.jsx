import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  FolderKanban,
  Plus,
  Save,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react'
import ImageUploadField from '../components/ui/ImageUploadField'
import { ApiError, apiRequest, uploadImage } from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatDateTime, formatNumber } from '../lib/format'

const INITIAL_FILTERS = {
  q: '',
  category: '',
  date_from: '',
  date_to: '',
}

const EMPTY_FORM = {
  title_en: '',
  title_ar: '',
  title_ku: '',
  desktop_image: '',
  date: '',
  categories: '',
  youtube_video_links: [''],
}

function buildQueryString(filters) {
  const params = new URLSearchParams()

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== '') {
      params.set(key, value)
    }
  })

  return params.toString()
}

function mapPastEventToForm(pastEvent) {
  return {
    title_en: pastEvent.title?.en || '',
    title_ar: pastEvent.title?.ar || '',
    title_ku: pastEvent.title?.ku || '',
    desktop_image: pastEvent.desktopImage || pastEvent.posterImage || '',
    date: pastEvent.date || '',
    categories: pastEvent.categoriesText || '',
    youtube_video_links:
      Array.isArray(pastEvent.youtubeVideoLinks) && pastEvent.youtubeVideoLinks.length > 0
        ? pastEvent.youtubeVideoLinks
        : [''],
  }
}

function buildPayload(form) {
  return {
    title: {
      en: form.title_en.trim(),
      ar: form.title_ar.trim(),
      ku: form.title_ku.trim(),
    },
    poster_image: form.desktop_image.trim(),
    date: form.date,
    categories: form.categories,
    youtube_video_links: form.youtube_video_links.map((link) => link.trim()).filter(Boolean),
  }
}

function StatCard({ eyebrow, title, value, delta }) {
  return (
    <article className="rounded-[1.8rem] border border-white/8 bg-[#111115]/80 p-5 lg:p-6">
      <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">{eyebrow}</p>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm text-zinc-400">{title}</p>
      {delta ? <p className="mt-4 text-xs uppercase tracking-[0.24em] text-zinc-500">{delta}</p> : null}
    </article>
  )
}

function VideoLinksField({ links, onChange, onAdd, onRemove }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm text-zinc-300">YouTube Video Links</label>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-2 rounded-xl border border-amber-300/20 bg-amber-400/10 px-3 py-2 text-xs font-medium text-amber-100 transition hover:bg-amber-400/15"
        >
          <Plus size={14} />
          Add link
        </button>
      </div>

      <div className="space-y-3">
        {links.map((link, index) => (
          <div key={index} className="flex items-center gap-3">
            <input
              type="url"
              value={link}
              onChange={(event) => onChange(index, event.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-amber-300/30 focus:bg-black/30"
            />
            <button
              type="button"
              onClick={() => onRemove(index)}
              disabled={links.length === 1}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-rose-400/15 bg-rose-500/10 text-rose-200 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
      <p className="text-xs text-zinc-500">You can add more than one video link for each past event.</p>
    </div>
  )
}

export default function PastEventsPage() {
  const { token, logout } = useAuth()
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [payload, setPayload] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [mode, setMode] = useState('create')
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingPoster, setUploadingPoster] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [error, setError] = useState('')
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const items = payload?.items ?? []
  const summary = payload?.summary ?? {
    count: 0,
    totalVideos: 0,
    categoriesCount: 0,
    latestDate: null,
  }
  const categoryOptions = payload?.categoryOptions ?? []

  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isDrawerOpen])

  const handleRequestError = (requestError, fallbackMessage) => {
    if (requestError instanceof ApiError && requestError.status === 401) {
      logout()
      return true
    }

    setError(requestError.message || fallbackMessage)
    return false
  }

  const loadPastEvents = async ({ silent = false, nextFilters = filters } = {}) => {
    if (!token) {
      return
    }

    if (!silent) {
      setLoading(true)
    }

    setError('')

    try {
      const query = buildQueryString(nextFilters)
      const path = query ? `/api/admin/past-events?${query}` : '/api/admin/past-events'
      const response = await apiRequest(path, { token })
      setPayload(response.data)
    } catch (requestError) {
      handleRequestError(requestError, 'Failed to load past events.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPastEvents()
  }, [token, filters.q, filters.category, filters.date_from, filters.date_to])

  const resetForm = () => {
    setMode('create')
    setSelectedId(null)
    setForm(EMPTY_FORM)
  }

  const openCreateDrawer = () => {
    resetForm()
    setIsDrawerOpen(true)
  }

  const handleEdit = (pastEvent) => {
    setMode('edit')
    setSelectedId(pastEvent.id)
    setForm(mapPastEventToForm(pastEvent))
    setIsDrawerOpen(true)
  }

  const handleUploadPoster = async (file) => {
    if (!token) {
      return
    }

    setUploadingPoster(true)
    setError('')

    try {
      const uploaded = await uploadImage(token, file, 'past-events')
      setForm((current) => ({
        ...current,
        desktop_image: uploaded?.url || '',
      }))
    } catch (requestError) {
      handleRequestError(requestError, 'Failed to upload poster image.')
    } finally {
      setUploadingPoster(false)
    }
  }

  const handleVideoLinkChange = (index, value) => {
    setForm((current) => ({
      ...current,
      youtube_video_links: current.youtube_video_links.map((link, linkIndex) =>
        linkIndex === index ? value : link,
      ),
    }))
  }

  const handleAddVideoLink = () => {
    setForm((current) => ({
      ...current,
      youtube_video_links: [...current.youtube_video_links, ''],
    }))
  }

  const handleRemoveVideoLink = (index) => {
    setForm((current) => ({
      ...current,
      youtube_video_links:
        current.youtube_video_links.length === 1
          ? ['']
          : current.youtube_video_links.filter((_, linkIndex) => linkIndex !== index),
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!token) {
      return
    }

    setSaving(true)
    setError('')

    try {
      const path =
        mode === 'edit' && selectedId
          ? `/api/admin/past-events/${selectedId}/update`
          : '/api/admin/past-events/create'

      await apiRequest(path, {
        method: 'POST',
        token,
        body: buildPayload(form),
      })

      await loadPastEvents({ silent: true })
      resetForm()
      setIsDrawerOpen(false)
    } catch (requestError) {
      handleRequestError(requestError, 'Failed to save past event.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (pastEventId) => {
    if (!token) {
      return
    }

    const confirmed = window.confirm('Delete this past event?')
    if (!confirmed) {
      return
    }

    setDeletingId(pastEventId)
    setError('')

    try {
      await apiRequest(`/api/admin/past-events/${pastEventId}/delete`, {
        method: 'POST',
        token,
      })

      if (selectedId === pastEventId) {
        resetForm()
        setIsDrawerOpen(false)
      }

      await loadPastEvents({ silent: true })
    } catch (requestError) {
      handleRequestError(requestError, 'Failed to delete past event.')
    } finally {
      setDeletingId(null)
    }
  }

  const stats = useMemo(
    () => [
      {
        eyebrow: 'Archive',
        title: 'Past Events',
        value: formatNumber(summary.count),
        delta: summary.latestDate ? `Latest ${summary.latestDate}` : 'No archived events yet',
      },
      {
        eyebrow: 'Videos',
        title: 'Total Video Links',
        value: formatNumber(summary.totalVideos),
        delta: 'Across all archived events',
      },
      {
        eyebrow: 'Categories',
        title: 'Used Categories',
        value: formatNumber(summary.categoriesCount),
        delta: 'Keywords on archived events',
      },
    ],
    [summary],
  )

  return (
    <div className="space-y-8 text-zinc-100">
      <section className="panel-surface panel-shadow rounded-4xl p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
           
            <h1 className="mt-3 text-3xl font-semibold text-zinc-300 sm:text-4xl">Past Events Management</h1>
           
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
           
            <button
              type="button"
              onClick={openCreateDrawer}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#C6A55C] px-4 py-3 text-sm font-medium text-black transition hover:bg-[#d7b56a]"
            >
              <Plus size={16} />
              New Past Event
            </button>
          </div>
        </div>
      </section>

      {error ? (
        <section className="rounded-4xl border border-rose-400/20 bg-rose-500/8 px-5 py-4 text-rose-100">
          <p className="font-medium">Something went wrong</p>
          <p className="mt-1 text-sm text-rose-100/85">{error}</p>
        </section>
      ) : null}

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => (
          <StatCard
            key={stat.title}
            eyebrow={stat.eyebrow}
            title={stat.title}
            value={stat.value}
            delta={stat.delta}
          />
        ))}
      </section>

      <section className="panel-surface panel-shadow rounded-4xl p-5 sm:p-6">
        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <label className="space-y-2 text-sm text-zinc-300">
            <span className="inline-flex items-center gap-2">
              <Search size={15} />
              Search
            </span>
            <input
              type="search"
              value={filters.q}
              onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
              placeholder="Search title, category, or link"
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-amber-300/30"
            />
          </label>

          <label className="space-y-2 text-sm text-zinc-300">
            <span className="inline-flex items-center gap-2">
              <FolderKanban size={15} />
              Category
            </span>
            <select
              value={filters.category}
              onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/30"
            >
              <option value="">All categories</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm text-zinc-300">
            <span className="inline-flex items-center gap-2">
              <CalendarDays size={15} />
              Date from
            </span>
            <input
              type="date"
              value={filters.date_from}
              onChange={(event) => setFilters((current) => ({ ...current, date_from: event.target.value }))}
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/30"
            />
          </label>

          <label className="space-y-2 text-sm text-zinc-300">
            <span className="inline-flex items-center gap-2">
              <CalendarDays size={15} />
              Date to
            </span>
            <input
              type="date"
              value={filters.date_to}
              onChange={(event) => setFilters((current) => ({ ...current, date_to: event.target.value }))}
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/30"
            />
          </label>
        </div>
      </section>

      {loading ? (
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-80 animate-pulse rounded-4xl border border-white/8 bg-white/5" />
          ))}
        </section>
      ) : items.length === 0 ? (
        <section className="rounded-4xl border border-dashed border-white/10 bg-white/3 px-6 py-12 text-center text-sm text-zinc-500">
          No past events found for the current filters.
        </section>
      ) : (
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="overflow-hidden rounded-4xl border border-white/8 bg-[#111115]/80"
            >
              <div className="relative h-52 overflow-hidden bg-black/30">
                <picture>
                  <source media="(max-width: 768px)" srcSet={item.desktopImage || item.posterImage} />
                  <img
                    src={item.desktopImage || item.posterImage}
                    alt={item.titleText || 'Past event poster'}
                    className="h-full w-full object-cover"
                  />
                </picture>
                <div className="absolute left-4 top-4 rounded-full border border-black/20 bg-black/45 px-3 py-1 text-xs font-medium tracking-[0.2em] text-white backdrop-blur-xl">
                  {item.year || 'Archive'}
                </div>
              </div>

              <div className="space-y-4 p-5">
                <div>
                  <h2 className="text-xl font-semibold text-white">{item.titleText || 'Untitled event'}</h2>
                  <p className="mt-2 text-sm text-zinc-400">{item.date}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {item.categories?.map((category) => (
                    <span
                      key={`${item.id}-${category}`}
                      className="rounded-full border border-amber-300/15 bg-amber-400/10 px-3 py-1 text-xs text-amber-100"
                    >
                      {category}
                    </span>
                  ))}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Videos</p>
                    <p className="mt-2 text-lg font-semibold text-white">{formatNumber(item.videoCount)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Updated</p>
                    <p className="mt-2 text-sm font-medium text-white">{formatDateTime(item.updatedAt)}</p>
                  </div>
                </div>

                {item.youtubeVideoLinks?.length ? (
                  <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Video links</p>
                    <div className="mt-3 space-y-2">
                      {item.youtubeVideoLinks.slice(0, 2).map((link) => (
                        <a
                          key={link}
                          href={link}
                          target="_blank"
                          rel="noreferrer"
                          className="block truncate text-sm text-amber-100 transition hover:text-white"
                        >
                          {link}
                        </a>
                      ))}
                      {item.youtubeVideoLinks.length > 2 ? (
                        <p className="text-xs text-zinc-500">+ {item.youtubeVideoLinks.length - 2} more link(s)</p>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => handleEdit(item)}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-200 transition hover:bg-white/8"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    disabled={deletingId === item.id}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-rose-400/15 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 transition hover:text-white disabled:opacity-60"
                  >
                    <Trash2 size={15} />
                    {deletingId === item.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      {isDrawerOpen ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close drawer"
            onClick={() => setIsDrawerOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          <aside className="absolute right-0 top-0 h-full w-full max-w-2xl overflow-y-auto border-l border-white/10 bg-[#0b0b0e] shadow-2xl">
            <form onSubmit={handleSubmit} className="flex min-h-full flex-col">
              <div className="flex items-start justify-between gap-4 border-b border-white/8 px-5 py-5 sm:px-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Archive Editor</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    {mode === 'edit' ? 'Edit Past Event' : 'Create Past Event'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-zinc-300 transition hover:bg-white/10"
                >
                  <XCircle size={18} />
                </button>
              </div>

              <div className="flex-1 space-y-6 px-5 py-5 sm:px-6">
                <div className="grid gap-5 sm:grid-cols-3">
                  <label className="space-y-2 text-sm text-zinc-300">
                    <span>Title (EN)</span>
                    <input
                      type="text"
                      value={form.title_en}
                      onChange={(event) => setForm((current) => ({ ...current, title_en: event.target.value }))}
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/30"
                    />
                  </label>

                  <label className="space-y-2 text-sm text-zinc-300">
                    <span>Title (AR)</span>
                    <input
                      type="text"
                      value={form.title_ar}
                      onChange={(event) => setForm((current) => ({ ...current, title_ar: event.target.value }))}
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/30"
                    />
                  </label>

                  <label className="space-y-2 text-sm text-zinc-300">
                    <span>Title (KU)</span>
                    <input
                      type="text"
                      value={form.title_ku}
                      onChange={(event) => setForm((current) => ({ ...current, title_ku: event.target.value }))}
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/30"
                    />
                  </label>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="space-y-2 text-sm text-zinc-300">
                    <span className="inline-flex items-center gap-2">
                      <CalendarDays size={15} />
                      Event date
                    </span>
                    <input
                      type="date"
                      value={form.date}
                      onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/30"
                    />
                  </label>

                  <label className="space-y-2 text-sm text-zinc-300">
                    <span className="inline-flex items-center gap-2">
                      <FolderKanban size={15} />
                      Categories
                    </span>
                    <input
                      type="text"
                      value={form.categories}
                      onChange={(event) => setForm((current) => ({ ...current, categories: event.target.value }))}
                      placeholder="Conference, Community, UK"
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-amber-300/30"
                    />
                    <p className="text-xs text-zinc-500">Separate categories with commas.</p>
                  </label>
                </div>

                <ImageUploadField
                  label="Poster Image"
                  value={form.desktop_image}
                  uploading={uploadingPoster}
                  onFileSelect={handleUploadPoster}
                  onClear={() => setForm((current) => ({ ...current, desktop_image: '' }))}
                  hint="Upload the archive poster image for this event."
                />

                <VideoLinksField
                  links={form.youtube_video_links}
                  onChange={handleVideoLinkChange}
                  onAdd={handleAddVideoLink}
                  onRemove={handleRemoveVideoLink}
                />

                  <div className="rounded-[1.6rem] border border-white/8 bg-white/4 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Preview Summary</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Title</p>
                      <p className="mt-2 text-sm font-medium text-white">{form.title_en || form.title_ar || form.title_ku || 'Untitled'}</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Categories</p>
                      <p className="mt-2 text-sm font-medium text-white">{form.categories || 'None yet'}</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Videos</p>
                      <p className="mt-2 text-sm font-medium text-white">
                        {formatNumber(form.youtube_video_links.filter((link) => link.trim() !== '').length)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 border-t border-white/8 bg-[#0b0b0e]/95 px-5 py-4 backdrop-blur sm:px-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      resetForm()
                      setIsDrawerOpen(false)
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-200 transition hover:bg-white/8"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#C6A55C] px-4 py-3 text-sm font-medium text-black transition hover:bg-[#d7b56a] disabled:opacity-60"
                  >
                    <Save size={16} />
                    {saving ? 'Saving...' : mode === 'edit' ? 'Save changes' : 'Create past event'}
                  </button>
                </div>
              </div>
            </form>
          </aside>
        </div>
      ) : null}
    </div>
  )
}
