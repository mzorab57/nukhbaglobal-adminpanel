import { useEffect, useMemo, useState } from 'react'
import {
  Building2,
  ClipboardList,
  Mail,
  MapPin,
  MessageSquareText,
  Phone,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Store,
  Trash2,
  UserRound,
  Users,
  XCircle,
} from 'lucide-react'
import { ApiError, apiRequest } from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatDateTime, formatNumber } from '../lib/format'

const INITIAL_FILTERS = {
  q: '',
  status: '',
  source: '',
}

const EMPTY_FORM = {
  full_name: '',
  business_name: '',
  email: '',
  phone: '',
  whatsapp: '',
  city: '',
  booth_type: '',
  message: '',
  status: 'new',
  source: 'admin',
  admin_notes: '',
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

function toneForStatus(status) {
  if (status === 'approved') {
    return 'border-emerald-400/15 bg-emerald-500/10 text-emerald-200'
  }

  if (status === 'contacted') {
    return 'border-sky-400/15 bg-sky-500/10 text-sky-200'
  }

  if (status === 'rejected') {
    return 'border-rose-400/15 bg-rose-500/10 text-rose-200'
  }

  return 'border-amber-300/15 bg-amber-400/10 text-amber-100'
}

function toneForSource(source) {
  return source === 'website'
    ? 'border-fuchsia-400/15 bg-fuchsia-500/10 text-fuchsia-200'
    : 'border-zinc-400/15 bg-zinc-500/10 text-zinc-200'
}

function labelForStatus(status) {
  if (status === 'new') return 'New'
  if (status === 'contacted') return 'Contacted'
  if (status === 'approved') return 'Approved'
  if (status === 'rejected') return 'Rejected'
  return status
}

function labelForSource(source) {
  return source === 'website' ? 'Website' : 'Admin'
}

function mapItemToForm(item) {
  return {
    full_name: item.fullName || '',
    business_name: item.businessName || '',
    email: item.email || '',
    phone: item.phone || '',
    whatsapp: item.whatsapp || '',
    city: item.city || '',
    booth_type: item.boothType || '',
    message: item.message || '',
    status: item.status || 'new',
    source: item.source || 'admin',
    admin_notes: item.adminNotes || '',
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

export default function StallApplicationsPage() {
  const { token, logout } = useAuth()
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [payload, setPayload] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [mode, setMode] = useState('create')
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [error, setError] = useState('')
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const closeDrawer = () => setIsDrawerOpen(false)

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


  const items = payload?.items ?? []
  const stats = payload?.stats ?? {
    total: 0,
    new: 0,
    contacted: 0,
    approved: 0,
    rejected: 0,
    website: 0,
    admin: 0,
  }

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  )

  const handleRequestError = (requestError, fallbackMessage) => {
    if (requestError instanceof ApiError && requestError.status === 401) {
      logout()
      return true
    }

    setError(requestError.message || fallbackMessage)
    return false
  }

  const resetForm = () => {
    setMode('create')
    setSelectedId(null)
    setForm(EMPTY_FORM)
  }

  const loadApplications = async ({ silent = false, nextFilters = filters } = {}) => {
    if (!token) {
      return
    }

    if (!silent) {
      setLoading(true)
    }

    setError('')

    try {
      const query = buildQueryString(nextFilters)
      const path = query ? `/api/admin/stall-applications?${query}` : '/api/admin/stall-applications'
      const response = await apiRequest(path, { token })
      setPayload(response.data)
    } catch (requestError) {
      handleRequestError(requestError, 'Failed to load stall applications.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadApplications()
  }, [token, filters.q, filters.status, filters.source])

  const handleEdit = (item) => {
    setMode('edit')
    setSelectedId(item.id)
    setForm(mapItemToForm(item))
    setIsDrawerOpen(true)
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
          ? `/api/admin/stall-applications/${selectedId}/update`
          : '/api/admin/stall-applications/create'

      await apiRequest(path, {
        method: 'POST',
        token,
        body: form,
      })

      await loadApplications({ silent: true })
      resetForm()
      setIsDrawerOpen(false)
    } catch (requestError) {
      handleRequestError(requestError, 'Failed to save application.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (applicationId) => {
    if (!token) {
      return
    }

    setDeletingId(applicationId)
    setError('')

    try {
      await apiRequest(`/api/admin/stall-applications/${applicationId}/delete`, {
        method: 'POST',
        token,
      })

      if (selectedId === applicationId) {
        resetForm()
        setIsDrawerOpen(false)
      }

      await loadApplications({ silent: true })
    } catch (requestError) {
      handleRequestError(requestError, 'Failed to delete application.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-8 text-zinc-100">
      <section className="panel-surface panel-shadow rounded-4xl p-5 sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.35em] "></p>
            <h1 className="mt-3 text-2xl font-semibold text-amber-100/70 sm:text-3xl">Client Intake</h1>
           
          </div>

          
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard eyebrow="Pipeline" title="All applications" value={formatNumber(stats.total)} delta={`${formatNumber(stats.new)} new`} />
        <StatCard eyebrow="Review" title="Contacted" value={formatNumber(stats.contacted)} delta={`${formatNumber(stats.approved)} approved`} />
        <StatCard eyebrow="Sources" title="Website requests" value={formatNumber(stats.website)} delta={`Admin entries ${formatNumber(stats.admin)}`} />
        <StatCard eyebrow="Outcomes" title="Rejected" value={formatNumber(stats.rejected)} delta="Needs another pass" />
      </section>

      <section className="space-y-6">
        <div className="w-full min-w-0 space-y-6">
          <div className="panel-surface panel-border panel-shadow rounded-4xl p-5 sm:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Filters</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Browse incoming requests</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  resetForm()
                  setIsDrawerOpen(true)
                }}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-amber-300/90 to-amber-100 px-5 py-3 text-sm font-medium text-black transition hover:opacity-95"
              >
                <Plus size={16} />
                New Application
              </button>
            </div>
            <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                <input
                  value={filters.q}
                  onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
                  placeholder="Search name, business, phone, city"
                  className="w-full rounded-2xl border border-white/10 bg-black/20 py-3 pl-11 pr-4 text-sm text-white outline-none transition focus:border-amber-200/25"
                />
              </div>
              <select
                value={filters.status}
                onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-200/25 md:w-auto"
              >
                <option value="">Any status</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              <select
                value={filters.source}
                onChange={(event) => setFilters((current) => ({ ...current, source: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-200/25 md:w-auto"
              >
                <option value="">Any source</option>
                <option value="website">Website</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          <div className="panel-surface panel-border panel-shadow rounded-4xl p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Pipeline</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Requests directory</h2>
              </div>
              <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400">
                {loading ? 'Loading...' : `${formatNumber(items.length)} request(s)`}
              </div>
            </div>

            <div className="mt-6  space-y-4  pr-1 ">
              {!loading && items.length === 0 ? (
                <div className="rounded-[1.75rem] border border-dashed border-white/10 bg-black/10 px-6 py-12 text-center">
                  <ClipboardList className="mx-auto text-zinc-500" size={26} />
                  <p className="mt-4 text-sm text-zinc-300">No stall requests match the current filters.</p>
                </div>
              ) : null}

              {items.map((item) => (
                <article
                  key={item.id}
                  className="rounded-[1.6rem] border border-white/8 bg-[#0c0c0f]/80 p-4 sm:p-5"
                >
                  <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 flex-1 md:max-w-[280px] lg:max-w-[320px]">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-xs text-zinc-300">
                          #{item.id}
                        </span>
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${toneForStatus(item.status)}`}>
                          {labelForStatus(item.status)}
                        </span>
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${toneForSource(item.source)}`}>
                          {labelForSource(item.source)}
                        </span>
                      </div>

                      <h3 className="mt-3 flex items-center gap-2 text-base font-semibold text-white">
                        <UserRound size={16} className="text-amber-100" />
                        <span className="wrap-break-word">{item.fullName}</span>
                      </h3>

                      <div className="mt-3 space-y-1.5 text-sm text-zinc-400">
                        <p className="flex items-center gap-2"><Building2 size={14} /> <span className="truncate">{item.businessName || 'No business name'}</span></p>
                        <p className="flex items-center gap-2"><Phone size={14} /> <span className="break-all">{item.phone}</span></p>
                        <p className="flex items-center gap-2"><Mail size={14} /> <span className="truncate">{item.email || 'No email'}</span></p>
                        <p className="flex items-center gap-2"><MapPin size={14} /> <span>{item.city || 'No city'}</span></p>
                        <p className="flex items-center gap-2"><Store size={14} /> <span>{item.boothType || 'No booth type'}</span></p>
                        <p className="flex items-center gap-2"><Users size={14} /> <span className="truncate">{item.submittedByName || labelForSource(item.source)}</span></p>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col gap-3 lg:flex-row">
                      {item.message ? (
                        <div className="flex-1 rounded-xl border border-white/6 bg-black/15 px-3 py-2.5">
                          <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                            <MessageSquareText size={12} />
                            Client message
                          </p>
                          <p className="mt-1.5 wrap-break-word text-xs leading-relaxed text-zinc-300">{item.message}</p>
                        </div>
                      ) : null}

                      {item.adminNotes ? (
                        <div className="flex-1 rounded-xl border border-amber-200/10 bg-amber-200/5 px-3 py-2.5">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-amber-100/60">Admin notes</p>
                          <p className="mt-1.5 wrap-break-word text-xs leading-relaxed text-zinc-300">{item.adminNotes}</p>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-col gap-3 shrink-0 md:w-[140px] md:items-end">
                      <div className="flex flex-row gap-2 w-full md:flex-col">
                        <button
                          type="button"
                          onClick={() => handleEdit(item)}
                          className="inline-flex flex-1 md:flex-none items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-200 transition hover:text-white"
                        >
                          <Save size={14} />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          className="inline-flex flex-1 md:flex-none items-center justify-center gap-2 rounded-xl border border-rose-400/15 bg-rose-500/10 px-3 py-2 text-xs text-rose-200 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                      
                      <div className="mt-1 flex flex-col gap-1 text-[11px] text-zinc-500 md:text-right">
                        <span>{formatDateTime(item.createdAt)}</span>
                        {item.whatsapp ? <span>WA: {item.whatsapp}</span> : null}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div
        className={`fixed inset-0 z-40 transition-all duration-300 ${
          isDrawerOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <button
          type="button"
          aria-label="Close application drawer"
          onClick={closeDrawer}
          className="absolute inset-0 w-full bg-black/40 backdrop-blur-sm"
        />

        <aside
          className={`panel-surface panel-border panel-shadow absolute right-0 top-0 h-full w-full max-w-full sm:max-w-md lg:max-w-lg  border-l border-white/10 p-5 transition-transform duration-300 ease-out ${
            isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Editor</p>
              <h2 className="mt-2 text-xl font-semibold text-white">
                {mode === 'edit' ? 'Update Application' : 'Create Application'}
              </h2>
            </div>
            <button
              type="button"
              onClick={closeDrawer}
              className="rounded-2xl border border-white/8 bg-white/4 p-2 text-zinc-300 transition hover:bg-white/8"
            >
              <XCircle size={16} />
            </button>
          </div>

          {selectedItem ? (
            <div className="mb-6 rounded-3xl border border-white/8 bg-black/20 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Selected request</p>
                  <h3 className="mt-2 wrap-break-word text-base font-semibold text-white">{selectedItem.fullName}</h3>
                  <p className="mt-2 text-xs text-zinc-500">
                    #{selectedItem.id} · {selectedItem.businessName || selectedItem.phone}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`rounded-full border px-3 py-1 text-xs font-medium ${toneForStatus(selectedItem.status)}`}>
                    {labelForStatus(selectedItem.status)}
                  </span>
                  <span className={`rounded-full border px-3 py-1 text-xs font-medium ${toneForSource(selectedItem.source)}`}>
                    {labelForSource(selectedItem.source)}
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.26em] text-zinc-500">Full Name</span>
                <input
                  value={form.full_name}
                  onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-200/25"
                />
              </label>

              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.26em] text-zinc-500">Business / Brand</span>
                <input
                  value={form.business_name}
                  onChange={(event) => setForm((current) => ({ ...current, business_name: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-200/25"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.26em] text-zinc-500">Phone</span>
                <input
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-200/25"
                />
              </label>

              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.26em] text-zinc-500">WhatsApp</span>
                <input
                  value={form.whatsapp}
                  onChange={(event) => setForm((current) => ({ ...current, whatsapp: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-200/25"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.26em] text-zinc-500">Email</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-200/25"
                />
              </label>

              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.26em] text-zinc-500">City</span>
                <input
                  value={form.city}
                  onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-200/25"
                />
              </label>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.26em] text-zinc-500">Booth Type</span>
                <input
                  value={form.booth_type}
                  onChange={(event) => setForm((current) => ({ ...current, booth_type: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-200/25"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs uppercase tracking-[0.26em] text-zinc-500">Status</span>
                  <select
                    value={form.status}
                    onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-200/25"
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-xs uppercase tracking-[0.26em] text-zinc-500">Source</span>
                  <select
                    value={form.source}
                    onChange={(event) => setForm((current) => ({ ...current, source: event.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-200/25"
                  >
                    <option value="admin">Admin</option>
                    <option value="website">Website</option>
                  </select>
                </label>
              </div>
            </div>

            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.26em] text-zinc-500">Client Message</span>
              <textarea
                rows={4}
                value={form.message}
                onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
                className="w-full rounded-3xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-200/25"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.26em] text-zinc-500">Admin Notes</span>
              <textarea
                rows={4}
                value={form.admin_notes}
                onChange={(event) => setForm((current) => ({ ...current, admin_notes: event.target.value }))}
                className="w-full rounded-3xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-200/25"
              />
            </label>

            {error ? (
              <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-amber-300/90 to-amber-100 px-5 py-3 text-sm font-medium text-black transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                <Save size={16} />
                {saving ? 'Saving...' : mode === 'edit' ? 'Save Request' : 'Create Request'}
              </button>
            </div>
          </form>
        </aside>
      </div>
    </div>
  )
}
