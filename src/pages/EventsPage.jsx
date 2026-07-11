import { useEffect, useMemo, useState } from 'react'
import {
  Eye,
  Filter,
  PencilLine,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Ticket,
  Trash2,
  XCircle,
} from 'lucide-react'
import ImageUploadField from '../components/ui/ImageUploadField'
import StatCard from '../components/ui/StatCard'
import { ApiError, apiRequest, uploadImage } from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatCurrency, formatDateTime, formatNumber } from '../lib/format'

const INITIAL_FILTERS = {
  q: '',
  status: '',
  upcoming: '',
}

const EMPTY_EVENT_FORM = {
  country_id: '',
  title_en: '',
  title_ar: '',
  title_ku: '',
  description_en: '',
  description_ar: '',
  description_ku: '',
  desktop_image: '',
  mobile_image: '',
  date: '',
  upcoming: '1',
  status: '1',
}

const EMPTY_TICKET_FORM = {
  title_en: '',
  title_ar: '',
  title_ku: '',
  price: '',
  capacity: '',
  max_per_user: '5',
  available_from: '',
  available_until: '',
  status: '1',
  note: '',
  sub_event_id: '',
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

function toneForStatus(isActive) {
  return isActive
    ? 'border-emerald-400/15 bg-emerald-500/10 text-emerald-200'
    : 'border-rose-400/15 bg-rose-500/10 text-rose-200'
}

function toneForUpcoming(isUpcoming) {
  return isUpcoming
    ? 'border-amber-400/15 bg-amber-500/10 text-amber-100'
    : 'border-zinc-500/15 bg-zinc-500/10 text-zinc-300'
}

function mapEventToForm(event) {
  return {
    country_id: event.countryId ? String(event.countryId) : '',
    title_en: event.title?.en || '',
    title_ar: event.title?.ar || '',
    title_ku: event.title?.ku || '',
    description_en: event.description?.en || '',
    description_ar: event.description?.ar || '',
    description_ku: event.description?.ku || '',
    desktop_image: event.desktopImage || '',
    mobile_image: event.mobileImage || '',
    date: event.date || '',
    upcoming: event.upcoming ? '1' : '0',
    status: event.status ? '1' : '0',
  }
}

function toLocalDateTimeInput(value) {
  if (!value) {
    return ''
  }

  return String(value).replace(' ', 'T').slice(0, 16)
}

function toApiDateTime(value) {
  if (!value) {
    return null
  }

  const normalized = String(value).replace('T', ' ')

  return normalized.length === 16 ? `${normalized}:00` : normalized
}

function mapTicketToForm(ticket) {
  return {
    title_en: ticket.title?.en || '',
    title_ar: ticket.title?.ar || '',
    title_ku: ticket.title?.ku || '',
    price: ticket.price ? String(ticket.price) : '',
    capacity: ticket.capacity ? String(ticket.capacity) : '',
    max_per_user: ticket.maxPerUser ? String(ticket.maxPerUser) : '5',
    available_from: toLocalDateTimeInput(ticket.availableFrom),
    available_until: toLocalDateTimeInput(ticket.availableUntil),
    status: ticket.status ? '1' : '0',
    note: ticket.note || '',
    sub_event_id: ticket.subEventId ? String(ticket.subEventId) : '',
  }
}

function buildEventPayload(form) {
  return {
    country_id: form.country_id || null,
    title: {
      en: form.title_en.trim(),
      ar: form.title_ar.trim(),
      ku: form.title_ku.trim(),
    },
    description: {
      en: form.description_en.trim(),
      ar: form.description_ar.trim(),
      ku: form.description_ku.trim(),
    },
    desktop_image: form.desktop_image.trim(),
    mobile_image: form.mobile_image.trim(),
    date: form.date,
    upcoming: Number(form.upcoming),
    status: Number(form.status),
  }
}

function buildTicketPayload(form) {
  return {
    sub_event_id: form.sub_event_id || null,
    title: {
      en: form.title_en.trim(),
      ar: form.title_ar.trim(),
      ku: form.title_ku.trim(),
    },
    price: Number(form.price),
    capacity: Number(form.capacity),
    max_per_user: Number(form.max_per_user),
    available_from: toApiDateTime(form.available_from),
    available_until: toApiDateTime(form.available_until),
    status: Number(form.status),
    note: form.note.trim() || null,
  }
}

export default function EventsPage() {
  const { token, logout } = useAuth()
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [eventsPayload, setEventsPayload] = useState(null)
  const [countries, setCountries] = useState([])
  const [subEvents, setSubEvents] = useState([])
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [selectedEventId, setSelectedEventId] = useState(null)
  const [eventForm, setEventForm] = useState(EMPTY_EVENT_FORM)
  const [ticketForm, setTicketForm] = useState(EMPTY_TICKET_FORM)
  const [eventMode, setEventMode] = useState('create')
  const [ticketMode, setTicketMode] = useState('create')
  const [editingTicketId, setEditingTicketId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [savingEvent, setSavingEvent] = useState(false)
  const [savingTicket, setSavingTicket] = useState(false)
  const [uploadingEventImage, setUploadingEventImage] = useState({
    desktop: false,
    mobile: false,
  })
  const [deletingEventId, setDeletingEventId] = useState(null)
  const [deletingTicketId, setDeletingTicketId] = useState(null)
  const [error, setError] = useState('')
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const closeDrawer = () => {
    setIsDrawerOpen(false)
  }

  const handleRequestError = (requestError, fallbackMessage) => {
    if (requestError instanceof ApiError && requestError.status === 401) {
      logout()
      return true
    }

    setError(requestError.message || fallbackMessage)
    return false
  }

  const loadCountries = async () => {
    if (!token) {
      return
    }

    try {
      const response = await apiRequest('/api/admin/countries?status=1', {
        token,
      })

      setCountries(response.data?.items ?? [])
    } catch (requestError) {
      handleRequestError(requestError, 'Failed to load countries.')
    }
  }

  const loadSubEvents = async (eventId) => {
    if (!token || !eventId) {
      setSubEvents([])
      return
    }

    try {
      const response = await apiRequest(`/api/admin/sub-events?event_id=${eventId}`, {
        token,
      })

      setSubEvents(response.data?.items ?? [])
    } catch (requestError) {
      handleRequestError(requestError, 'Failed to load sub-events.')
    }
  }

  const loadEvents = async ({ silent = false } = {}) => {
    if (!token) {
      return
    }

    if (!silent) {
      setLoading(true)
    }

    setError('')

    try {
      const query = buildQueryString(filters)
      const path = query ? `/api/admin/events?${query}` : '/api/admin/events'
      const response = await apiRequest(path, {
        token,
      })

      setEventsPayload(response.data)
    } catch (requestError) {
      handleRequestError(requestError, 'Failed to load events.')
    } finally {
      setLoading(false)
    }
  }

  const loadEventWorkspace = async (eventId, { silent = false } = {}) => {
    if (!token || !eventId) {
      return
    }

    if (!silent) {
      setDetailLoading(true)
      setIsDrawerOpen(true)
    }

    setError('')

    try {
      const [eventResponse, subEventsResponse] = await Promise.all([
        apiRequest(`/api/admin/events/${eventId}`, {
          token,
        }),
        apiRequest(`/api/admin/sub-events?event_id=${eventId}`, {
          token,
        }),
      ])

      setSelectedEvent(eventResponse.data)
      setSelectedEventId(eventId)
      setSubEvents(subEventsResponse.data?.items ?? [])
      setEventForm(mapEventToForm(eventResponse.data.event))
      setEventMode('edit')
      setTicketForm(EMPTY_TICKET_FORM)
      setTicketMode('create')
      setEditingTicketId(null)
    } catch (requestError) {
      handleRequestError(requestError, 'Failed to load event details.')
    } finally {
      setDetailLoading(false)
    }
  }

  useEffect(() => {
    if (!token) {
      return
    }

    loadCountries()
    loadEvents()
  }, [token])

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

  const handleFilterChange = (field) => (event) => {
    setFilters((current) => ({
      ...current,
      [field]: event.target.value,
    }))
  }

  const handleEventFormChange = (field) => (event) => {
    setEventForm((current) => ({
      ...current,
      [field]: event.target.value,
    }))
  }

  const handleTicketFormChange = (field) => (event) => {
    setTicketForm((current) => ({
      ...current,
      [field]: event.target.value,
    }))
  }

  const handleEventImageUpload = async (field, file) => {
    if (!token) {
      return
    }

    setUploadingEventImage((current) => ({
      ...current,
      [field]: true,
    }))
    setError('')

    try {
      const uploaded = await uploadImage(token, file, 'events')
      const nextValue = uploaded?.url || ''

      setEventForm((current) => ({
        ...current,
        [field === 'desktop' ? 'desktop_image' : 'mobile_image']: nextValue,
      }))
    } catch (requestError) {
      handleRequestError(requestError, 'Failed to upload event image.')
    } finally {
      setUploadingEventImage((current) => ({
        ...current,
        [field]: false,
      }))
    }
  }

  const handleApplyFilters = async (event) => {
    event.preventDefault()
    await loadEvents()
  }

  const handleResetFilters = async () => {
    const nextFilters = { ...INITIAL_FILTERS }
    setFilters(nextFilters)
    setLoading(true)
    setError('')

    try {
      const response = await apiRequest('/api/admin/events', {
        token,
      })

      setEventsPayload(response.data)
    } catch (requestError) {
      handleRequestError(requestError, 'Failed to reset event filters.')
    } finally {
      setLoading(false)
    }
  }

  const handleStartNewEvent = () => {
    setSelectedEvent(null)
    setSelectedEventId(null)
    setSubEvents([])
    setEventForm(EMPTY_EVENT_FORM)
    setTicketForm(EMPTY_TICKET_FORM)
    setEventMode('create')
    setTicketMode('create')
    setEditingTicketId(null)
    setError('')
    setIsDrawerOpen(true)
  }

  const handleSubmitEvent = async (event) => {
    event.preventDefault()
    if (!token) {
      return
    }

    setSavingEvent(true)
    setError('')

    try {
      const isEditing = eventMode === 'edit' && selectedEventId
      const response = await apiRequest(
        isEditing ? `/api/admin/events/${selectedEventId}/update` : '/api/admin/events/create',
        {
          method: 'POST',
          token,
          body: buildEventPayload(eventForm),
        },
      )

      const nextEvent = response.data
      const nextEventId = nextEvent?.event?.id || null

      setSelectedEvent(nextEvent)
      setSelectedEventId(nextEventId)
      setEventForm(mapEventToForm(nextEvent.event))
      setEventMode('edit')
      setTicketForm(EMPTY_TICKET_FORM)
      setTicketMode('create')
      setEditingTicketId(null)

      await Promise.all([
        loadEvents({ silent: true }),
        loadSubEvents(nextEventId),
      ])
    } catch (requestError) {
      handleRequestError(requestError, 'Failed to save event.')
    } finally {
      setSavingEvent(false)
    }
  }

  const handleDeleteEvent = async (eventId) => {
    if (!token || !eventId) {
      return
    }

    const confirmed = window.confirm('Delete this event and its unsold tickets?')
    if (!confirmed) {
      return
    }

    setDeletingEventId(eventId)
    setError('')

    try {
      await apiRequest(`/api/admin/events/${eventId}/delete`, {
        method: 'POST',
        token,
      })

      if (selectedEventId === eventId) {
        handleStartNewEvent()
      }

      await loadEvents({ silent: true })
    } catch (requestError) {
      handleRequestError(requestError, 'Failed to delete event.')
    } finally {
      setDeletingEventId(null)
    }
  }

  const handleEditTicket = (ticket) => {
    setTicketForm(mapTicketToForm(ticket))
    setTicketMode('edit')
    setEditingTicketId(ticket.id)
    setError('')
  }

  const resetTicketForm = () => {
    setTicketForm(EMPTY_TICKET_FORM)
    setTicketMode('create')
    setEditingTicketId(null)
  }

  const handleSubmitTicket = async (event) => {
    event.preventDefault()
    if (!token || !selectedEventId) {
      return
    }

    setSavingTicket(true)
    setError('')

    try {
      await apiRequest(
        ticketMode === 'edit' && editingTicketId
          ? `/api/admin/tickets/${editingTicketId}/update`
          : `/api/admin/events/${selectedEventId}/tickets/create`,
        {
          method: 'POST',
          token,
          body: buildTicketPayload(ticketForm),
        },
      )

      resetTicketForm()
      await loadEventWorkspace(selectedEventId, { silent: true })
      await loadEvents({ silent: true })
    } catch (requestError) {
      handleRequestError(requestError, 'Failed to save ticket.')
    } finally {
      setSavingTicket(false)
    }
  }

  const handleDeleteTicket = async (ticketId) => {
    if (!token || !ticketId || !selectedEventId) {
      return
    }

    const confirmed = window.confirm('Delete this ticket inventory row?')
    if (!confirmed) {
      return
    }

    setDeletingTicketId(ticketId)
    setError('')

    try {
      await apiRequest(`/api/admin/tickets/${ticketId}/delete`, {
        method: 'POST',
        token,
      })

      if (editingTicketId === ticketId) {
        resetTicketForm()
      }

      await loadEventWorkspace(selectedEventId, { silent: true })
      await loadEvents({ silent: true })
    } catch (requestError) {
      handleRequestError(requestError, 'Failed to delete ticket.')
    } finally {
      setDeletingTicketId(null)
    }
  }

  const summaryCards = useMemo(() => {
    const items = eventsPayload?.items ?? []
    const activeCount = items.filter((item) => item.status).length
    const upcomingCount = items.filter((item) => item.upcoming).length
    const totalCapacity = items.reduce((sum, item) => sum + Number(item.totalCapacity || 0), 0)
    const soldCount = items.reduce((sum, item) => sum + Number(item.soldCount || 0), 0)

    return [
      {
        eyebrow: 'Catalog',
        title: 'Events In View',
        value: formatNumber(items.length),
        delta: `${formatNumber(activeCount)} public`,
      },
      {
        eyebrow: 'Discovery',
        title: 'Upcoming Events',
        value: formatNumber(upcomingCount),
        delta: 'Feed-ready',
      },
      // {
      //   eyebrow: 'Inventory',
      //   title: 'Visible Capacity',
      //   value: formatNumber(totalCapacity),
      //   delta: 'Across current rows',
      // },
      {
        eyebrow: 'Demand',
        title: 'Sold Tickets',
        value: formatNumber(soldCount),
        delta: 'Tracked on backend',
      },
    ]
  }, [eventsPayload])

  const selectedEventRecord = selectedEvent?.event ?? null
  const selectedTickets = selectedEvent?.tickets ?? []

  return (
    <div className="space-y-6">
      <section className="panel-surface  panel-shadow rounded-4xl p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.35em] "></p>
            <h1 className="mt-3 text-3xl font-semibold text-amber-100/70">Events Module</h1>
           
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleStartNewEvent}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-zinc-200 transition hover:bg-white/8"
            >
              <Plus size={16} />
              New event
            </button>
          
          </div>
        </div>
      </section>

      {error && (
        <section className="rounded-4xl border border-rose-400/20 bg-rose-500/8 px-5 py-4 text-sm text-rose-100">
          {error}
        </section>
      )}

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {summaryCards.map((card) => (
          <StatCard key={card.title} eyebrow={card.eyebrow} title={card.title} value={card.value} delta={card.delta} />
        ))}
      </section>

      <section className="space-y-6">
        <div className="space-y-6">
          <form onSubmit={handleApplyFilters} className="panel-surface panel-border panel-shadow rounded-4xl p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <Filter size={16} />
              Filters
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <label className="space-y-2 text-sm text-zinc-300 xl:col-span-1">
                <span>Search</span>
                <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
                  <Search size={16} className="text-zinc-500" />
                  <input
                    value={filters.q}
                    onChange={handleFilterChange('q')}
                    placeholder="Event title or date"
                    className="w-full bg-transparent text-white outline-none placeholder:text-zinc-500"
                  />
                </div>
              </label>
              <label className="space-y-2 text-sm text-zinc-300">
                <span>Public Visibility</span>
                <select
                  value={filters.status}
                  onChange={handleFilterChange('status')}
                  className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none"
                >
                  <option value="">All</option>
                  <option value="1">Public</option>
                  <option value="0">Hidden</option>
                </select>
              </label>
              <label className="space-y-2 text-sm text-zinc-300">
                <span>Discovery State</span>
                <select
                  value={filters.upcoming}
                  onChange={handleFilterChange('upcoming')}
                  className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none"
                >
                  <option value="">All</option>
                  <option value="1">Upcoming</option>
                  <option value="0">Archive</option>
                </select>
              </label>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="submit" className="rounded-2xl bg-linear-to-r from-amber-300 via-amber-200 to-orange-200 px-5 py-3 text-sm font-semibold text-zinc-900">
                Apply filters
              </button>
              <button type="button" onClick={handleResetFilters} className="rounded-2xl border border-white/8 bg-white/4 px-5 py-3 text-sm text-zinc-200">
                Reset
              </button>
            </div>
          </form>

          <div className="panel-surface panel-border panel-shadow overflow-hidden rounded-4xl">
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Events Table</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Catalog results</h2>
              </div>
              <p className="text-sm text-zinc-400">{formatNumber(eventsPayload?.items?.length || 0)} rows</p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-[0.25em] text-zinc-500">
                    <th className="px-5 py-3">Event</th>
                    <th className="px-5 py-3">Country</th>
                    <th className="px-5 py-3">Visibility</th>
                    <th className="px-5 py-3">Inventory</th>
                    <th className="px-5 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="px-5 py-10 text-center text-sm text-zinc-500">
                        Loading events...
                      </td>
                    </tr>
                  ) : eventsPayload?.items?.length ? (
                    eventsPayload.items.map((item) => (
                      <tr
                        key={item.id}
                        className={`border-t border-white/6 text-sm text-zinc-300 ${
                          selectedEventId === item.id ? 'bg-white/4' : ''
                        }`}
                      >
                        <td className="px-5 py-4 align-top">
                          <p className="font-medium text-white">{item.titleText}</p>
                          <p className="mt-1 text-xs text-zinc-500">{formatDateTime(item.date)}</p>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <p className="font-medium text-white">{item.countryNameText || 'Global / Unassigned'}</p>
                          <p className="mt-1 text-xs text-zinc-500">{item.descriptionText || 'No description preview.'}</p>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <div className="flex flex-wrap gap-2">
                            <span className={`rounded-full border px-3 py-1 text-xs font-medium ${toneForStatus(item.status)}`}>
                              {item.status ? 'public' : 'hidden'}
                            </span>
                            <span className={`rounded-full border px-3 py-1 text-xs font-medium ${toneForUpcoming(item.upcoming)}`}>
                              {item.upcoming ? 'upcoming' : 'archive'}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 align-top text-xs text-zinc-400">
                          <p>{formatNumber(item.ticketsCount)} ticket rows</p>
                          <p className="mt-1">{formatNumber(item.totalCapacity)} capacity</p>
                          <p className="mt-1">{formatNumber(item.soldCount)} sold</p>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => loadEventWorkspace(item.id)}
                              className="inline-flex items-center gap-2 rounded-2xl border border-white/8 bg-white/4 px-4 py-2 text-xs font-medium text-zinc-200 transition hover:bg-white/8"
                            >
                              <Eye size={14} />
                              Manage
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteEvent(item.id)}
                              disabled={deletingEventId === item.id}
                              className="inline-flex items-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-2 text-xs font-medium text-rose-100 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Trash2 size={14} />
                              {deletingEventId === item.id ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-5 py-10 text-center text-sm text-zinc-500">
                        No events found for the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
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
          aria-label="Close event drawer"
          onClick={closeDrawer}
          className="absolute inset-0 w-full bg-black/50 backdrop-blur-sm"
        />

        <aside
          className={`panel-surface panel-border panel-shadow absolute right-0 top-0 h-full w-full max-w-3xl overflow-y-auto border-l border-white/10 p-5 transition-transform duration-300 ease-out ${
            isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Event Drawer</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Details & Actions</h2>
            </div>
            <button type="button" onClick={closeDrawer} className="rounded-2xl border border-white/8 bg-white/4 p-2 text-zinc-300 transition hover:bg-white/8">
              <XCircle size={16} />
            </button>
          </div>

          <div className="space-y-6">
            <section className="panel-surface panel-border panel-shadow rounded-4xl p-5">
              <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">
                  {eventMode === 'edit' ? 'Edit Event' : 'Create Event'}
                </p>
                <h2 className="mt-2 text-xl font-semibold text-white">Event profile</h2>
              </div>
              {selectedEventRecord && (
                <button
                  type="button"
                  onClick={handleStartNewEvent}
                  className="rounded-2xl border border-white/8 bg-white/4 px-4 py-2 text-xs font-medium text-zinc-200"
                >
                  New draft
                </button>
              )}
            </div>

            {detailLoading && (
              <div className="mt-5 rounded-3xl border border-white/8 bg-white/4 p-4 text-sm text-zinc-400">
                Loading selected event...
              </div>
            )}

            {selectedEventRecord && !detailLoading && (
              <div className="mt-5 rounded-3xl border border-white/8 bg-white/4 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Selected Event</p>
                    <h3 className="mt-2 text-lg font-semibold text-white">{selectedEventRecord.titleText}</h3>
                    <p className="mt-2 text-sm text-zinc-400">{selectedEventRecord.countryNameText || 'Global / Unassigned'}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${toneForStatus(selectedEventRecord.status)}`}>
                      {selectedEventRecord.status ? 'public' : 'hidden'}
                    </span>
                    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${toneForUpcoming(selectedEventRecord.upcoming)}`}>
                      {selectedEventRecord.upcoming ? 'upcoming' : 'archive'}
                    </span>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-white/6 bg-black/10 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Date</p>
                    <p className="mt-2 text-sm text-white">{formatDateTime(selectedEventRecord.date)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/6 bg-black/10 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Ticket Rows</p>
                    <p className="mt-2 text-sm text-white">{formatNumber(selectedTickets.length)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/6 bg-black/10 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Sold</p>
                    <p className="mt-2 text-sm text-white">{formatNumber(selectedTickets.reduce((sum, item) => sum + Number(item.soldCount || 0), 0))}</p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmitEvent} className="mt-5 space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <label className="space-y-2 text-sm text-zinc-300">
                  <span>Title EN</span>
                  <input
                    value={eventForm.title_en}
                    onChange={handleEventFormChange('title_en')}
                    className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none"
                  />
                </label>
                <label className="space-y-2 text-sm text-zinc-300">
                  <span>Title AR</span>
                  <input
                    value={eventForm.title_ar}
                    onChange={handleEventFormChange('title_ar')}
                    className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none"
                  />
                </label>
                <label className="space-y-2 text-sm text-zinc-300">
                  <span>Title KU</span>
                  <input
                    value={eventForm.title_ku}
                    onChange={handleEventFormChange('title_ku')}
                    className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="space-y-2 text-sm text-zinc-300">
                  <span>Description EN</span>
                  <textarea
                    rows="4"
                    value={eventForm.description_en}
                    onChange={handleEventFormChange('description_en')}
                    className="w-full rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-white outline-none"
                  />
                </label>
                <label className="space-y-2 text-sm text-zinc-300">
                  <span>Description AR</span>
                  <textarea
                    rows="4"
                    value={eventForm.description_ar}
                    onChange={handleEventFormChange('description_ar')}
                    className="w-full rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-white outline-none"
                  />
                </label>
                <label className="space-y-2 text-sm text-zinc-300">
                  <span>Description KU</span>
                  <textarea
                    rows="4"
                    value={eventForm.description_ku}
                    onChange={handleEventFormChange('description_ku')}
                    className="w-full rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-white outline-none"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm text-zinc-300">
                  <span>Country</span>
                  <select
                    value={eventForm.country_id}
                    onChange={handleEventFormChange('country_id')}
                    className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none"
                  >
                    <option value="">Unassigned</option>
                    {countries.map((country) => (
                      <option key={country.id} value={country.id}>
                        {country.nameText}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 text-sm text-zinc-300">
                  <span>Event Date</span>
                  <input
                    type="date"
                    value={eventForm.date}
                    onChange={handleEventFormChange('date')}
                    className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <ImageUploadField
                  label="Desktop Image"
                  value={eventForm.desktop_image}
                  uploading={uploadingEventImage.desktop}
                  onFileSelect={(file) => handleEventImageUpload('desktop', file)}
                  onClear={() => setEventForm((current) => ({ ...current, desktop_image: '' }))}
                  hint="Upload the wide desktop image used in event cards and hero sections."
                />
                <ImageUploadField
                  label="Mobile Image"
                  value={eventForm.mobile_image}
                  uploading={uploadingEventImage.mobile}
                  onFileSelect={(file) => handleEventImageUpload('mobile', file)}
                  onClear={() => setEventForm((current) => ({ ...current, mobile_image: '' }))}
                  hint="Upload the mobile version for responsive event layouts."
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm text-zinc-300">
                  <span>Public Visibility</span>
                  <select
                    value={eventForm.status}
                    onChange={handleEventFormChange('status')}
                    className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none"
                  >
                    <option value="1">Public</option>
                    <option value="0">Hidden</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm text-zinc-300">
                  <span>Discovery State</span>
                  <select
                    value={eventForm.upcoming}
                    onChange={handleEventFormChange('upcoming')}
                    className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none"
                  >
                    <option value="1">Upcoming</option>
                    <option value="0">Archive</option>
                  </select>
                </label>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={savingEvent || uploadingEventImage.desktop || uploadingEventImage.mobile}
                  className="inline-flex items-center gap-2 rounded-2xl bg-linear-to-r from-amber-300 via-amber-200 to-orange-200 px-5 py-3 text-sm font-semibold text-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save size={16} />
                  {savingEvent
                    ? 'Saving...'
                    : uploadingEventImage.desktop || uploadingEventImage.mobile
                      ? 'Uploading...'
                      : eventMode === 'edit'
                        ? 'Save event'
                        : 'Create event'}
                </button>
                {eventMode === 'edit' && selectedEventId && (
                  <button
                    type="button"
                    onClick={() => handleDeleteEvent(selectedEventId)}
                    disabled={deletingEventId === selectedEventId}
                    className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-5 py-3 text-sm font-medium text-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deletingEventId === selectedEventId ? 'Deleting...' : 'Delete event'}
                  </button>
                )}
              </div>
            </form>
          </section>

          <section className="panel-surface panel-border panel-shadow rounded-4xl p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Ticket Inventory</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Pricing & capacity</h2>
              </div>
              {selectedEventId && (
                <button
                  type="button"
                  onClick={() => loadEventWorkspace(selectedEventId, { silent: true })}
                  className="rounded-2xl border border-white/8 bg-white/4 px-4 py-2 text-xs font-medium text-zinc-200"
                >
                  Refresh
                </button>
              )}
            </div>

            {!selectedEventId && (
              <div className="mt-5 rounded-3xl border border-dashed border-white/10 bg-white/3 p-6 text-sm leading-6 text-zinc-500">
                Create or select an event first, then manage ticket rows, pricing, sub-event assignment, and capacity limits.
              </div>
            )}

            {selectedEventId && (
              <div className="mt-5 space-y-5">
                <div className="space-y-3">
                  {selectedTickets.length ? selectedTickets.map((ticket) => (
                    <div key={ticket.id} className="rounded-3xl border border-white/8 bg-white/4 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <Ticket size={16} className="text-amber-200" />
                            <p className="text-sm font-semibold text-white">{ticket.titleText}</p>
                          </div>
                          <p className="mt-2 text-xs text-zinc-500">
                            {ticket.subEventTitleText || 'Main event inventory'} · {formatCurrency(ticket.price)}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className={`rounded-full border px-3 py-1 text-xs font-medium ${toneForStatus(ticket.status)}`}>
                            {ticket.status ? 'active' : 'disabled'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleEditTicket(ticket)}
                            className="inline-flex items-center gap-2 rounded-2xl border border-white/8 bg-black/10 px-3 py-2 text-xs font-medium text-zinc-200"
                          >
                            <PencilLine size={14} />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTicket(ticket.id)}
                            disabled={deletingTicketId === ticket.id}
                            className="inline-flex items-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Trash2 size={14} />
                            {deletingTicketId === ticket.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-4">
                        <div className="rounded-2xl border border-white/6 bg-black/10 px-3 py-3">
                          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Capacity</p>
                          <p className="mt-2 text-sm text-white">{formatNumber(ticket.capacity)}</p>
                        </div>
                        <div className="rounded-2xl border border-white/6 bg-black/10 px-3 py-3">
                          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Reserved</p>
                          <p className="mt-2 text-sm text-white">{formatNumber(ticket.reservedCount)}</p>
                        </div>
                        <div className="rounded-2xl border border-white/6 bg-black/10 px-3 py-3">
                          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Sold</p>
                          <p className="mt-2 text-sm text-white">{formatNumber(ticket.soldCount)}</p>
                        </div>
                        <div className="rounded-2xl border border-white/6 bg-black/10 px-3 py-3">
                          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Remaining</p>
                          <p className="mt-2 text-sm text-white">{formatNumber(ticket.remainingCount)}</p>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <div className="rounded-2xl border border-white/6 bg-black/10 px-3 py-3">
                          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Window</p>
                          <p className="mt-2 text-xs text-zinc-300">
                            {ticket.availableFrom ? formatDateTime(ticket.availableFrom) : 'Immediate'} to{' '}
                            {ticket.availableUntil ? formatDateTime(ticket.availableUntil) : 'Until sold out'}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-white/6 bg-black/10 px-3 py-3">
                          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Note</p>
                          <p className="mt-2 text-xs text-zinc-300">{ticket.note || 'No internal note.'}</p>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="rounded-3xl border border-dashed border-white/10 bg-white/3 p-6 text-sm text-zinc-500">
                      No ticket inventory exists for this event yet.
                    </div>
                  )}
                </div>

                <form onSubmit={handleSubmitTicket} className="rounded-3xl border border-white/8 bg-white/4 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                        {ticketMode === 'edit' ? 'Edit Ticket' : 'Create Ticket'}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-white">Inventory row</h3>
                    </div>
                    {ticketMode === 'edit' && (
                      <button
                        type="button"
                        onClick={resetTicketForm}
                        className="rounded-2xl border border-white/8 bg-black/10 px-4 py-2 text-xs font-medium text-zinc-200"
                      >
                        New ticket
                      </button>
                    )}
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-3">
                    <label className="space-y-2 text-sm text-zinc-300">
                      <span>Title EN</span>
                      <input
                        value={ticketForm.title_en}
                        onChange={handleTicketFormChange('title_en')}
                        className="h-12 w-full rounded-2xl border border-white/8 bg-black/10 px-4 text-white outline-none"
                      />
                    </label>
                    <label className="space-y-2 text-sm text-zinc-300">
                      <span>Title AR</span>
                      <input
                        value={ticketForm.title_ar}
                        onChange={handleTicketFormChange('title_ar')}
                        className="h-12 w-full rounded-2xl border border-white/8 bg-black/10 px-4 text-white outline-none"
                      />
                    </label>
                    <label className="space-y-2 text-sm text-zinc-300">
                      <span>Title KU</span>
                      <input
                        value={ticketForm.title_ku}
                        onChange={handleTicketFormChange('title_ku')}
                        className="h-12 w-full rounded-2xl border border-white/8 bg-black/10 px-4 text-white outline-none"
                      />
                    </label>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="space-y-2 text-sm text-zinc-300">
                      <span>Sub-event</span>
                      <select
                        value={ticketForm.sub_event_id}
                        onChange={handleTicketFormChange('sub_event_id')}
                        className="h-12 w-full rounded-2xl border border-white/8 bg-black/10 px-4 text-white outline-none"
                      >
                        <option value="">Main event</option>
                        {subEvents.map((subEvent) => (
                          <option key={subEvent.id} value={subEvent.id}>
                            {subEvent.titleText}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-2 text-sm text-zinc-300">
                      <span>Status</span>
                      <select
                        value={ticketForm.status}
                        onChange={handleTicketFormChange('status')}
                        className="h-12 w-full rounded-2xl border border-white/8 bg-black/10 px-4 text-white outline-none"
                      >
                        <option value="1">Active</option>
                        <option value="0">Disabled</option>
                      </select>
                    </label>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <label className="space-y-2 text-sm text-zinc-300">
                      <span>Price</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={ticketForm.price}
                        onChange={handleTicketFormChange('price')}
                        className="h-12 w-full rounded-2xl border border-white/8 bg-black/10 px-4 text-white outline-none"
                      />
                    </label>
                    <label className="space-y-2 text-sm text-zinc-300">
                      <span>Capacity</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={ticketForm.capacity}
                        onChange={handleTicketFormChange('capacity')}
                        className="h-12 w-full rounded-2xl border border-white/8 bg-black/10 px-4 text-white outline-none"
                      />
                    </label>
                    <label className="space-y-2 text-sm text-zinc-300">
                      <span>Max Per User</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={ticketForm.max_per_user}
                        onChange={handleTicketFormChange('max_per_user')}
                        className="h-12 w-full rounded-2xl border border-white/8 bg-black/10 px-4 text-white outline-none"
                      />
                    </label>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="space-y-2 text-sm text-zinc-300">
                      <span>Available From</span>
                      <input
                        type="datetime-local"
                        value={ticketForm.available_from}
                        onChange={handleTicketFormChange('available_from')}
                        className="h-12 w-full rounded-2xl border border-white/8 bg-black/10 px-4 text-white outline-none"
                      />
                    </label>
                    <label className="space-y-2 text-sm text-zinc-300">
                      <span>Available Until</span>
                      <input
                        type="datetime-local"
                        value={ticketForm.available_until}
                        onChange={handleTicketFormChange('available_until')}
                        className="h-12 w-full rounded-2xl border border-white/8 bg-black/10 px-4 text-white outline-none"
                      />
                    </label>
                  </div>

                  <label className="mt-4 block space-y-2 text-sm text-zinc-300">
                    <span>Internal Note</span>
                    <textarea
                      rows="3"
                      value={ticketForm.note}
                      onChange={handleTicketFormChange('note')}
                      className="w-full rounded-2xl border border-white/8 bg-black/10 px-4 py-3 text-white outline-none"
                    />
                  </label>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="submit"
                      disabled={savingTicket}
                      className="inline-flex items-center gap-2 rounded-2xl bg-linear-to-r from-amber-300 via-amber-200 to-orange-200 px-5 py-3 text-sm font-semibold text-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Save size={16} />
                      {savingTicket ? 'Saving...' : ticketMode === 'edit' ? 'Save ticket' : 'Create ticket'}
                    </button>
                    {ticketMode === 'edit' && (
                      <button
                        type="button"
                        onClick={resetTicketForm}
                        className="rounded-2xl border border-white/8 bg-black/10 px-5 py-3 text-sm text-zinc-200"
                      >
                        Cancel edit
                      </button>
                    )}
                  </div>
                </form>
              </div>
            )}
            </section>
          </div>
        </aside>
      </div>
    </div>
  )
}
