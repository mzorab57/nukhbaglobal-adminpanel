import { useEffect, useMemo, useState } from 'react'
import {
  Building2,
  CalendarDays,
  Filter,
  Globe2,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Trash2,
} from 'lucide-react'
import StatCard from '../components/ui/StatCard'
import { ApiError, apiRequest } from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatDateTime, formatNumber } from '../lib/format'

const INITIAL_COUNTRY_FILTERS = {
  q: '',
  status: '',
}

const INITIAL_CITY_FILTERS = {
  q: '',
  status: '',
  country_id: '',
}

const INITIAL_SUB_EVENT_FILTERS = {
  q: '',
  event_id: '',
  city_id: '',
}

const EMPTY_COUNTRY_FORM = {
  name_en: '',
  name_ar: '',
  status: '1',
}

const EMPTY_CITY_FORM = {
  country_id: '',
  name_en: '',
  name_ar: '',
  status: '1',
}

const EMPTY_SUB_EVENT_FORM = {
  event_id: '',
  city_id: '',
  title_en: '',
  title_ar: '',
  sub_title_en: '',
  sub_title_ar: '',
  description_en: '',
  description_ar: '',
  location_en: '',
  location_ar: '',
  date: '',
  start_time: '',
  end_time: '',
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

function buildTranslations(enValue, arValue) {
  return {
    en: enValue.trim(),
    ar: arValue.trim(),
  }
}

function buildNullableTranslations(enValue, arValue) {
  const normalized = buildTranslations(enValue, arValue)

  if (!normalized.en && !normalized.ar) {
    return null
  }

  return normalized
}

function mapCountryToForm(country) {
  return {
    name_en: country.name?.en || '',
    name_ar: country.name?.ar || '',
    status: country.status ? '1' : '0',
  }
}

function mapCityToForm(city) {
  return {
    country_id: city.countryId ? String(city.countryId) : '',
    name_en: city.name?.en || '',
    name_ar: city.name?.ar || '',
    status: city.status ? '1' : '0',
  }
}

function mapSubEventToForm(subEvent) {
  return {
    event_id: subEvent.eventId ? String(subEvent.eventId) : '',
    city_id: subEvent.cityId ? String(subEvent.cityId) : '',
    title_en: subEvent.title?.en || '',
    title_ar: subEvent.title?.ar || '',
    sub_title_en: subEvent.subTitle?.en || '',
    sub_title_ar: subEvent.subTitle?.ar || '',
    description_en: subEvent.description?.en || '',
    description_ar: subEvent.description?.ar || '',
    location_en: subEvent.location?.en || '',
    location_ar: subEvent.location?.ar || '',
    date: subEvent.date || '',
    start_time: subEvent.startTime || '',
    end_time: subEvent.endTime || '',
  }
}

function buildCountryPayload(form) {
  return {
    name: buildTranslations(form.name_en, form.name_ar),
    status: Number(form.status),
  }
}

function buildCityPayload(form) {
  return {
    country_id: Number(form.country_id),
    name: buildTranslations(form.name_en, form.name_ar),
    status: Number(form.status),
  }
}

function buildSubEventPayload(form) {
  return {
    city_id: Number(form.city_id),
    title: buildTranslations(form.title_en, form.title_ar),
    sub_title: buildNullableTranslations(form.sub_title_en, form.sub_title_ar),
    description: buildTranslations(form.description_en, form.description_ar),
    location: buildNullableTranslations(form.location_en, form.location_ar),
    date: form.date,
    start_time: form.start_time,
    end_time: form.end_time,
  }
}

export default function LocationsPage() {
  const { token, logout } = useAuth()
  const [countryFilters, setCountryFilters] = useState(INITIAL_COUNTRY_FILTERS)
  const [cityFilters, setCityFilters] = useState(INITIAL_CITY_FILTERS)
  const [subEventFilters, setSubEventFilters] = useState(INITIAL_SUB_EVENT_FILTERS)
  const [countriesPayload, setCountriesPayload] = useState(null)
  const [citiesPayload, setCitiesPayload] = useState(null)
  const [subEventsPayload, setSubEventsPayload] = useState(null)
  const [activeCountries, setActiveCountries] = useState([])
  const [activeCities, setActiveCities] = useState([])
  const [activeEvents, setActiveEvents] = useState([])
  const [selectedCountryId, setSelectedCountryId] = useState(null)
  const [selectedCityId, setSelectedCityId] = useState(null)
  const [selectedSubEventId, setSelectedSubEventId] = useState(null)
  const [countryForm, setCountryForm] = useState(EMPTY_COUNTRY_FORM)
  const [cityForm, setCityForm] = useState(EMPTY_CITY_FORM)
  const [subEventForm, setSubEventForm] = useState(EMPTY_SUB_EVENT_FORM)
  const [countryMode, setCountryMode] = useState('create')
  const [cityMode, setCityMode] = useState('create')
  const [subEventMode, setSubEventMode] = useState('create')
  const [loading, setLoading] = useState({
    countries: true,
    cities: true,
    subEvents: true,
  })
  const [saving, setSaving] = useState({
    country: false,
    city: false,
    subEvent: false,
  })
  const [deletingId, setDeletingId] = useState({
    country: null,
    city: null,
    subEvent: null,
  })
  const [error, setError] = useState('')

  const handleRequestError = (requestError, fallbackMessage) => {
    if (requestError instanceof ApiError && requestError.status === 401) {
      logout()
      return true
    }

    setError(requestError.message || fallbackMessage)
    return false
  }

  const setModuleLoading = (module, value) => {
    setLoading((current) => ({
      ...current,
      [module]: value,
    }))
  }

  const setModuleSaving = (module, value) => {
    setSaving((current) => ({
      ...current,
      [module]: value,
    }))
  }

  const setModuleDeletingId = (module, value) => {
    setDeletingId((current) => ({
      ...current,
      [module]: value,
    }))
  }

  const loadLookups = async () => {
    if (!token) {
      return
    }

    try {
      const [countriesResponse, citiesResponse, eventsResponse] = await Promise.all([
        apiRequest('/api/admin/countries?status=1', { token }),
        apiRequest('/api/admin/cities?status=1', { token }),
        apiRequest('/api/admin/events?status=1', { token }),
      ])

      setActiveCountries(countriesResponse.data?.items ?? [])
      setActiveCities(citiesResponse.data?.items ?? [])
      setActiveEvents(eventsResponse.data?.items ?? [])
    } catch (requestError) {
      handleRequestError(requestError, 'Failed to load location lookups.')
    }
  }

  const loadCountries = async ({ silent = false, nextFilters = countryFilters } = {}) => {
    if (!token) {
      return
    }

    if (!silent) {
      setModuleLoading('countries', true)
    }

    setError('')

    try {
      const query = buildQueryString(nextFilters)
      const path = query ? `/api/admin/countries?${query}` : '/api/admin/countries'
      const response = await apiRequest(path, { token })
      setCountriesPayload(response.data)
    } catch (requestError) {
      handleRequestError(requestError, 'Failed to load countries.')
    } finally {
      setModuleLoading('countries', false)
    }
  }

  const loadCities = async ({ silent = false, nextFilters = cityFilters } = {}) => {
    if (!token) {
      return
    }

    if (!silent) {
      setModuleLoading('cities', true)
    }

    setError('')

    try {
      const query = buildQueryString(nextFilters)
      const path = query ? `/api/admin/cities?${query}` : '/api/admin/cities'
      const response = await apiRequest(path, { token })
      setCitiesPayload(response.data)
    } catch (requestError) {
      handleRequestError(requestError, 'Failed to load cities.')
    } finally {
      setModuleLoading('cities', false)
    }
  }

  const loadSubEvents = async ({ silent = false, nextFilters = subEventFilters } = {}) => {
    if (!token) {
      return
    }

    if (!silent) {
      setModuleLoading('subEvents', true)
    }

    setError('')

    try {
      const query = buildQueryString(nextFilters)
      const path = query ? `/api/admin/sub-events?${query}` : '/api/admin/sub-events'
      const response = await apiRequest(path, { token })
      setSubEventsPayload(response.data)
    } catch (requestError) {
      handleRequestError(requestError, 'Failed to load sub-events.')
    } finally {
      setModuleLoading('subEvents', false)
    }
  }

  useEffect(() => {
    if (!token) {
      return
    }

    loadLookups()
    loadCountries()
    loadCities()
    loadSubEvents()
  }, [token])

  const selectedCountry = useMemo(
    () => (countriesPayload?.items ?? []).find((item) => item.id === selectedCountryId) || null,
    [countriesPayload, selectedCountryId],
  )

  const selectedCity = useMemo(
    () => (citiesPayload?.items ?? []).find((item) => item.id === selectedCityId) || null,
    [citiesPayload, selectedCityId],
  )

  const selectedSubEvent = useMemo(
    () => (subEventsPayload?.items ?? []).find((item) => item.id === selectedSubEventId) || null,
    [subEventsPayload, selectedSubEventId],
  )

  const summaryCards = useMemo(() => {
    const countries = countriesPayload?.items ?? []
    const cities = citiesPayload?.items ?? []
    const subEvents = subEventsPayload?.items ?? []

    return [
      {
        eyebrow: 'Coverage',
        title: 'Countries',
        value: formatNumber(countries.length),
        delta: `${formatNumber(countries.filter((item) => item.status).length)} active`,
      },
      {
        eyebrow: 'Operations',
        title: 'Cities',
        value: formatNumber(cities.length),
        delta: `${formatNumber(cities.filter((item) => item.status).length)} active`,
      },
      {
        eyebrow: 'Schedule',
        title: 'Sub-Events',
        value: formatNumber(subEvents.length),
        delta: `${formatNumber(subEvents.reduce((sum, item) => sum + Number(item.ticketsCount || 0), 0))} linked ticket rows`,
      },
    ]
  }, [countriesPayload, citiesPayload, subEventsPayload])

  const handleCountryFilterChange = (field) => (event) => {
    setCountryFilters((current) => ({
      ...current,
      [field]: event.target.value,
    }))
  }

  const handleCityFilterChange = (field) => (event) => {
    setCityFilters((current) => ({
      ...current,
      [field]: event.target.value,
    }))
  }

  const handleSubEventFilterChange = (field) => (event) => {
    setSubEventFilters((current) => ({
      ...current,
      [field]: event.target.value,
    }))
  }

  const handleCountryFormChange = (field) => (event) => {
    setCountryForm((current) => ({
      ...current,
      [field]: event.target.value,
    }))
  }

  const handleCityFormChange = (field) => (event) => {
    setCityForm((current) => ({
      ...current,
      [field]: event.target.value,
    }))
  }

  const handleSubEventFormChange = (field) => (event) => {
    setSubEventForm((current) => ({
      ...current,
      [field]: event.target.value,
    }))
  }

  const resetCountryEditor = () => {
    setSelectedCountryId(null)
    setCountryMode('create')
    setCountryForm(EMPTY_COUNTRY_FORM)
  }

  const resetCityEditor = () => {
    setSelectedCityId(null)
    setCityMode('create')
    setCityForm((current) => ({
      ...EMPTY_CITY_FORM,
      country_id: current.country_id || (selectedCountryId ? String(selectedCountryId) : ''),
    }))
  }

  const resetSubEventEditor = () => {
    setSelectedSubEventId(null)
    setSubEventMode('create')
    setSubEventForm((current) => ({
      ...EMPTY_SUB_EVENT_FORM,
      event_id: current.event_id,
      city_id: current.city_id || (selectedCityId ? String(selectedCityId) : ''),
    }))
  }

  const handleSelectCountry = (country) => {
    setSelectedCountryId(country.id)
    setCountryMode('edit')
    setCountryForm(mapCountryToForm(country))
    if (cityMode === 'create') {
      setCityForm((current) => ({
        ...current,
        country_id: String(country.id),
      }))
    }
  }

  const handleSelectCity = (city) => {
    setSelectedCityId(city.id)
    setCityMode('edit')
    setCityForm(mapCityToForm(city))
    if (subEventMode === 'create') {
      setSubEventForm((current) => ({
        ...current,
        city_id: String(city.id),
      }))
    }
  }

  const handleSelectSubEvent = (subEvent) => {
    setSelectedSubEventId(subEvent.id)
    setSubEventMode('edit')
    setSubEventForm(mapSubEventToForm(subEvent))
  }

  const handleCountryFilterSubmit = async (event) => {
    event.preventDefault()
    await loadCountries()
  }

  const handleCityFilterSubmit = async (event) => {
    event.preventDefault()
    await loadCities()
  }

  const handleSubEventFilterSubmit = async (event) => {
    event.preventDefault()
    await loadSubEvents()
  }

  const handleCountrySubmit = async (event) => {
    event.preventDefault()
    if (!token) {
      return
    }

    setModuleSaving('country', true)
    setError('')

    try {
      const response = await apiRequest(
        countryMode === 'edit' && selectedCountryId
          ? `/api/admin/countries/${selectedCountryId}/update`
          : '/api/admin/countries/create',
        {
          method: 'POST',
          token,
          body: buildCountryPayload(countryForm),
        },
      )

      const country = response.data?.country
      if (country) {
        setSelectedCountryId(country.id)
        setCountryMode('edit')
        setCountryForm(mapCountryToForm(country))
        setCityForm((current) => ({
          ...current,
          country_id: current.country_id || String(country.id),
        }))
      }

      await Promise.all([loadCountries({ silent: true }), loadLookups()])
    } catch (requestError) {
      handleRequestError(requestError, 'Failed to save country.')
    } finally {
      setModuleSaving('country', false)
    }
  }

  const handleCitySubmit = async (event) => {
    event.preventDefault()
    if (!token) {
      return
    }

    setModuleSaving('city', true)
    setError('')

    try {
      const response = await apiRequest(
        cityMode === 'edit' && selectedCityId
          ? `/api/admin/cities/${selectedCityId}/update`
          : '/api/admin/cities/create',
        {
          method: 'POST',
          token,
          body: buildCityPayload(cityForm),
        },
      )

      const city = response.data?.city
      if (city) {
        setSelectedCityId(city.id)
        setCityMode('edit')
        setCityForm(mapCityToForm(city))
        setSubEventForm((current) => ({
          ...current,
          city_id: current.city_id || String(city.id),
        }))
      }

      await Promise.all([loadCities({ silent: true }), loadLookups()])
    } catch (requestError) {
      handleRequestError(requestError, 'Failed to save city.')
    } finally {
      setModuleSaving('city', false)
    }
  }

  const handleSubEventSubmit = async (event) => {
    event.preventDefault()
    if (!token) {
      return
    }

    setModuleSaving('subEvent', true)
    setError('')

    try {
      const eventId = Number(subEventForm.event_id)
      await apiRequest(
        subEventMode === 'edit' && selectedSubEventId
          ? `/api/admin/sub-events/${selectedSubEventId}/update`
          : `/api/admin/events/${eventId}/sub-events/create`,
        {
          method: 'POST',
          token,
          body: buildSubEventPayload(subEventForm),
        },
      )

      await loadSubEvents({ silent: true })
      if (subEventMode === 'create') {
        resetSubEventEditor()
      }
    } catch (requestError) {
      handleRequestError(requestError, 'Failed to save sub-event.')
    } finally {
      setModuleSaving('subEvent', false)
    }
  }

  const handleDeleteCountry = async (countryId) => {
    if (!token || !countryId) {
      return
    }

    if (!window.confirm('Delete this country? Cities must be cleared first.')) {
      return
    }

    setModuleDeletingId('country', countryId)
    setError('')

    try {
      await apiRequest(`/api/admin/countries/${countryId}/delete`, {
        method: 'POST',
        token,
      })

      if (selectedCountryId === countryId) {
        resetCountryEditor()
      }

      await Promise.all([loadCountries({ silent: true }), loadLookups()])
    } catch (requestError) {
      handleRequestError(requestError, 'Failed to delete country.')
    } finally {
      setModuleDeletingId('country', null)
    }
  }

  const handleDeleteCity = async (cityId) => {
    if (!token || !cityId) {
      return
    }

    if (!window.confirm('Delete this city? Active sub-events must be removed first.')) {
      return
    }

    setModuleDeletingId('city', cityId)
    setError('')

    try {
      await apiRequest(`/api/admin/cities/${cityId}/delete`, {
        method: 'POST',
        token,
      })

      if (selectedCityId === cityId) {
        resetCityEditor()
      }

      await Promise.all([loadCities({ silent: true }), loadLookups()])
    } catch (requestError) {
      handleRequestError(requestError, 'Failed to delete city.')
    } finally {
      setModuleDeletingId('city', null)
    }
  }

  const handleDeleteSubEvent = async (subEventId) => {
    if (!token || !subEventId) {
      return
    }

    if (!window.confirm('Delete this sub-event? Reserved or sold tickets will block deletion.')) {
      return
    }

    setModuleDeletingId('subEvent', subEventId)
    setError('')

    try {
      await apiRequest(`/api/admin/sub-events/${subEventId}/delete`, {
        method: 'POST',
        token,
      })

      if (selectedSubEventId === subEventId) {
        resetSubEventEditor()
      }

      await loadSubEvents({ silent: true })
    } catch (requestError) {
      handleRequestError(requestError, 'Failed to delete sub-event.')
    } finally {
      setModuleDeletingId('subEvent', null)
    }
  }

  return (
    <div className="space-y-6">
      <section className="panel-surface panel-border panel-shadow rounded-[2rem] p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.35em] text-amber-100/55">Locations Module</p>
            <h1 className="mt-3 text-3xl font-semibold text-white">Countries, cities, and sub-event scheduling.</h1>
            <p className="mt-3 text-sm leading-7 text-zinc-400">
              Keep catalog geography and event scheduling aligned with backend constraints from a single premium workspace.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              loadLookups()
              loadCountries({ silent: true })
              loadCities({ silent: true })
              loadSubEvents({ silent: true })
            }}
            className="inline-flex items-center gap-2 self-start rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-zinc-200 transition hover:bg-white/8"
          >
            <RefreshCcw size={16} />
            Refresh module
          </button>
        </div>
      </section>

      {error && (
        <section className="rounded-[2rem] border border-rose-400/20 bg-rose-500/8 px-5 py-4 text-sm text-rose-100">
          {error}
        </section>
      )}

      <section className="grid gap-5 md:grid-cols-3">
        {summaryCards.map((card) => (
          <StatCard key={card.title} eyebrow={card.eyebrow} title={card.title} value={card.value} delta={card.delta} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6">
          <section className="panel-surface panel-border panel-shadow rounded-[2rem] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Countries</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Coverage map</h2>
              </div>
              <button
                type="button"
                onClick={resetCountryEditor}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/8 bg-white/4 px-4 py-2 text-xs font-medium text-zinc-200"
              >
                <Plus size={14} />
                New
              </button>
            </div>

            <form onSubmit={handleCountryFilterSubmit} className="mt-5 space-y-4">
              <label className="space-y-2 text-sm text-zinc-300">
                <span>Search</span>
                <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
                  <Search size={16} className="text-zinc-500" />
                  <input
                    value={countryFilters.q}
                    onChange={handleCountryFilterChange('q')}
                    placeholder="Country name"
                    className="w-full bg-transparent text-white outline-none placeholder:text-zinc-500"
                  />
                </div>
              </label>
              <label className="space-y-2 text-sm text-zinc-300">
                <span>Status</span>
                <select
                  value={countryFilters.status}
                  onChange={handleCountryFilterChange('status')}
                  className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none"
                >
                  <option value="">All</option>
                  <option value="1">Active</option>
                  <option value="0">Hidden</option>
                </select>
              </label>
              <div className="flex gap-3">
                <button type="submit" className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 via-amber-200 to-orange-200 px-4 py-3 text-sm font-semibold text-zinc-900">
                  <Filter size={15} />
                  Apply
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = { ...INITIAL_COUNTRY_FILTERS }
                    setCountryFilters(next)
                    loadCountries({ nextFilters: next })
                  }}
                  className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-zinc-200"
                >
                  Reset
                </button>
              </div>
            </form>

            <div className="mt-5 space-y-3">
              {loading.countries ? (
                <div className="rounded-3xl border border-white/8 bg-white/4 p-5 text-sm text-zinc-400">Loading countries...</div>
              ) : countriesPayload?.items?.length ? (
                countriesPayload.items.map((country) => (
                  <button
                    key={country.id}
                    type="button"
                    onClick={() => handleSelectCountry(country)}
                    className={`w-full rounded-3xl border p-4 text-left transition ${
                      selectedCountryId === country.id
                        ? 'border-amber-300/30 bg-amber-400/10'
                        : 'border-white/8 bg-white/4 hover:bg-white/7'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Globe2 size={16} className="text-amber-200" />
                          <p className="text-sm font-semibold text-white">{country.nameText}</p>
                        </div>
                        <p className="mt-2 text-xs text-zinc-500">Updated {formatDateTime(country.updatedAt)}</p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs font-medium ${toneForStatus(country.status)}`}>
                        {country.status ? 'active' : 'hidden'}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-zinc-400">
                      <div className="rounded-2xl border border-white/6 bg-black/10 px-3 py-3">
                        <p>Cities</p>
                        <p className="mt-1 text-sm text-white">{formatNumber(country.citiesCount)}</p>
                      </div>
                      <div className="rounded-2xl border border-white/6 bg-black/10 px-3 py-3">
                        <p>Events</p>
                        <p className="mt-1 text-sm text-white">{formatNumber(country.eventsCount)}</p>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-white/10 bg-white/3 p-5 text-sm text-zinc-500">
                  No countries matched the current filters.
                </div>
              )}
            </div>
          </section>

          <section className="panel-surface panel-border panel-shadow rounded-[2rem] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">
                  {countryMode === 'edit' ? 'Edit Country' : 'Create Country'}
                </p>
                <h2 className="mt-2 text-xl font-semibold text-white">Country editor</h2>
              </div>
              {selectedCountry && (
                <button
                  type="button"
                  onClick={() => handleDeleteCountry(selectedCountry.id)}
                  disabled={deletingId.country === selectedCountry.id}
                  className="inline-flex items-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-2 text-xs font-medium text-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Trash2 size={14} />
                  {deletingId.country === selectedCountry.id ? 'Deleting...' : 'Delete'}
                </button>
              )}
            </div>

            <form onSubmit={handleCountrySubmit} className="mt-5 space-y-4">
              <label className="space-y-2 text-sm text-zinc-300">
                <span>Name EN</span>
                <input
                  value={countryForm.name_en}
                  onChange={handleCountryFormChange('name_en')}
                  className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none"
                />
              </label>
              <label className="space-y-2 text-sm text-zinc-300">
                <span>Name AR/KU</span>
                <input
                  value={countryForm.name_ar}
                  onChange={handleCountryFormChange('name_ar')}
                  className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none"
                />
              </label>
              <label className="space-y-2 text-sm text-zinc-300">
                <span>Status</span>
                <select
                  value={countryForm.status}
                  onChange={handleCountryFormChange('status')}
                  className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none"
                >
                  <option value="1">Active</option>
                  <option value="0">Hidden</option>
                </select>
              </label>
              <button
                type="submit"
                disabled={saving.country}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 via-amber-200 to-orange-200 px-5 py-3 text-sm font-semibold text-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={16} />
                {saving.country ? 'Saving...' : countryMode === 'edit' ? 'Save country' : 'Create country'}
              </button>
            </form>
          </section>
        </div>

        <div className="space-y-6">
          <section className="panel-surface panel-border panel-shadow rounded-[2rem] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Cities</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Operational areas</h2>
              </div>
              <button
                type="button"
                onClick={resetCityEditor}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/8 bg-white/4 px-4 py-2 text-xs font-medium text-zinc-200"
              >
                <Plus size={14} />
                New
              </button>
            </div>

            <form onSubmit={handleCityFilterSubmit} className="mt-5 space-y-4">
              <label className="space-y-2 text-sm text-zinc-300">
                <span>Search</span>
                <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
                  <Search size={16} className="text-zinc-500" />
                  <input
                    value={cityFilters.q}
                    onChange={handleCityFilterChange('q')}
                    placeholder="City or country"
                    className="w-full bg-transparent text-white outline-none placeholder:text-zinc-500"
                  />
                </div>
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm text-zinc-300">
                  <span>Status</span>
                  <select
                    value={cityFilters.status}
                    onChange={handleCityFilterChange('status')}
                    className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none"
                  >
                    <option value="">All</option>
                    <option value="1">Active</option>
                    <option value="0">Hidden</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm text-zinc-300">
                  <span>Country</span>
                  <select
                    value={cityFilters.country_id}
                    onChange={handleCityFilterChange('country_id')}
                    className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none"
                  >
                    <option value="">All countries</option>
                    {activeCountries.map((country) => (
                      <option key={country.id} value={country.id}>
                        {country.nameText}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="flex gap-3">
                <button type="submit" className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 via-amber-200 to-orange-200 px-4 py-3 text-sm font-semibold text-zinc-900">
                  <Filter size={15} />
                  Apply
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = { ...INITIAL_CITY_FILTERS }
                    setCityFilters(next)
                    loadCities({ nextFilters: next })
                  }}
                  className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-zinc-200"
                >
                  Reset
                </button>
              </div>
            </form>

            <div className="mt-5 space-y-3">
              {loading.cities ? (
                <div className="rounded-3xl border border-white/8 bg-white/4 p-5 text-sm text-zinc-400">Loading cities...</div>
              ) : citiesPayload?.items?.length ? (
                citiesPayload.items.map((city) => (
                  <button
                    key={city.id}
                    type="button"
                    onClick={() => handleSelectCity(city)}
                    className={`w-full rounded-3xl border p-4 text-left transition ${
                      selectedCityId === city.id
                        ? 'border-amber-300/30 bg-amber-400/10'
                        : 'border-white/8 bg-white/4 hover:bg-white/7'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Building2 size={16} className="text-amber-200" />
                          <p className="text-sm font-semibold text-white">{city.nameText}</p>
                        </div>
                        <p className="mt-2 text-xs text-zinc-500">{city.countryNameText}</p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs font-medium ${toneForStatus(city.status)}`}>
                        {city.status ? 'active' : 'hidden'}
                      </span>
                    </div>
                    <div className="mt-4 rounded-2xl border border-white/6 bg-black/10 px-3 py-3 text-xs text-zinc-400">
                      <p>Sub-events</p>
                      <p className="mt-1 text-sm text-white">{formatNumber(city.subEventsCount)}</p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-white/10 bg-white/3 p-5 text-sm text-zinc-500">
                  No cities matched the current filters.
                </div>
              )}
            </div>
          </section>

          <section className="panel-surface panel-border panel-shadow rounded-[2rem] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">
                  {cityMode === 'edit' ? 'Edit City' : 'Create City'}
                </p>
                <h2 className="mt-2 text-xl font-semibold text-white">City editor</h2>
              </div>
              {selectedCity && (
                <button
                  type="button"
                  onClick={() => handleDeleteCity(selectedCity.id)}
                  disabled={deletingId.city === selectedCity.id}
                  className="inline-flex items-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-2 text-xs font-medium text-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Trash2 size={14} />
                  {deletingId.city === selectedCity.id ? 'Deleting...' : 'Delete'}
                </button>
              )}
            </div>

            <form onSubmit={handleCitySubmit} className="mt-5 space-y-4">
              <label className="space-y-2 text-sm text-zinc-300">
                <span>Country</span>
                <select
                  value={cityForm.country_id}
                  onChange={handleCityFormChange('country_id')}
                  className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none"
                >
                  <option value="">Select country</option>
                  {activeCountries.map((country) => (
                    <option key={country.id} value={country.id}>
                      {country.nameText}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm text-zinc-300">
                <span>Name EN</span>
                <input
                  value={cityForm.name_en}
                  onChange={handleCityFormChange('name_en')}
                  className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none"
                />
              </label>
              <label className="space-y-2 text-sm text-zinc-300">
                <span>Name AR/KU</span>
                <input
                  value={cityForm.name_ar}
                  onChange={handleCityFormChange('name_ar')}
                  className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none"
                />
              </label>
              <label className="space-y-2 text-sm text-zinc-300">
                <span>Status</span>
                <select
                  value={cityForm.status}
                  onChange={handleCityFormChange('status')}
                  className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none"
                >
                  <option value="1">Active</option>
                  <option value="0">Hidden</option>
                </select>
              </label>
              <button
                type="submit"
                disabled={saving.city}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 via-amber-200 to-orange-200 px-5 py-3 text-sm font-semibold text-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={16} />
                {saving.city ? 'Saving...' : cityMode === 'edit' ? 'Save city' : 'Create city'}
              </button>
            </form>
          </section>
        </div>

        <div className="space-y-6">
          <section className="panel-surface panel-border panel-shadow rounded-[2rem] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Sub-Events</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Scheduling layer</h2>
              </div>
              <button
                type="button"
                onClick={resetSubEventEditor}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/8 bg-white/4 px-4 py-2 text-xs font-medium text-zinc-200"
              >
                <Plus size={14} />
                New
              </button>
            </div>

            <form onSubmit={handleSubEventFilterSubmit} className="mt-5 space-y-4">
              <label className="space-y-2 text-sm text-zinc-300">
                <span>Search</span>
                <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
                  <Search size={16} className="text-zinc-500" />
                  <input
                    value={subEventFilters.q}
                    onChange={handleSubEventFilterChange('q')}
                    placeholder="Sub-event or city"
                    className="w-full bg-transparent text-white outline-none placeholder:text-zinc-500"
                  />
                </div>
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm text-zinc-300">
                  <span>Event</span>
                  <select
                    value={subEventFilters.event_id}
                    onChange={handleSubEventFilterChange('event_id')}
                    className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none"
                  >
                    <option value="">All events</option>
                    {activeEvents.map((eventItem) => (
                      <option key={eventItem.id} value={eventItem.id}>
                        {eventItem.titleText}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 text-sm text-zinc-300">
                  <span>City</span>
                  <select
                    value={subEventFilters.city_id}
                    onChange={handleSubEventFilterChange('city_id')}
                    className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none"
                  >
                    <option value="">All cities</option>
                    {activeCities.map((city) => (
                      <option key={city.id} value={city.id}>
                        {city.nameText}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="flex gap-3">
                <button type="submit" className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 via-amber-200 to-orange-200 px-4 py-3 text-sm font-semibold text-zinc-900">
                  <Filter size={15} />
                  Apply
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = { ...INITIAL_SUB_EVENT_FILTERS }
                    setSubEventFilters(next)
                    loadSubEvents({ nextFilters: next })
                  }}
                  className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-zinc-200"
                >
                  Reset
                </button>
              </div>
            </form>

            <div className="mt-5 space-y-3">
              {loading.subEvents ? (
                <div className="rounded-3xl border border-white/8 bg-white/4 p-5 text-sm text-zinc-400">Loading sub-events...</div>
              ) : subEventsPayload?.items?.length ? (
                subEventsPayload.items.map((subEvent) => (
                  <button
                    key={subEvent.id}
                    type="button"
                    onClick={() => handleSelectSubEvent(subEvent)}
                    className={`w-full rounded-3xl border p-4 text-left transition ${
                      selectedSubEventId === subEvent.id
                        ? 'border-amber-300/30 bg-amber-400/10'
                        : 'border-white/8 bg-white/4 hover:bg-white/7'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <CalendarDays size={16} className="text-amber-200" />
                          <p className="text-sm font-semibold text-white">{subEvent.titleText}</p>
                        </div>
                        <p className="mt-2 text-xs text-zinc-500">{subEvent.eventTitleText} · {subEvent.cityNameText}</p>
                      </div>
                      <span className="rounded-full border border-white/8 bg-black/10 px-3 py-1 text-xs font-medium text-zinc-200">
                        {formatNumber(subEvent.ticketsCount)} tickets
                      </span>
                    </div>
                    <div className="mt-4 rounded-2xl border border-white/6 bg-black/10 px-3 py-3 text-xs text-zinc-400">
                      <p>{formatDateTime(`${subEvent.date} ${subEvent.startTime}`)}</p>
                      <p className="mt-1">{subEvent.startTime} - {subEvent.endTime}</p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-white/10 bg-white/3 p-5 text-sm text-zinc-500">
                  No sub-events matched the current filters.
                </div>
              )}
            </div>
          </section>

          <section className="panel-surface panel-border panel-shadow rounded-[2rem] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">
                  {subEventMode === 'edit' ? 'Edit Sub-Event' : 'Create Sub-Event'}
                </p>
                <h2 className="mt-2 text-xl font-semibold text-white">Schedule editor</h2>
              </div>
              {selectedSubEvent && (
                <button
                  type="button"
                  onClick={() => handleDeleteSubEvent(selectedSubEvent.id)}
                  disabled={deletingId.subEvent === selectedSubEvent.id}
                  className="inline-flex items-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-2 text-xs font-medium text-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Trash2 size={14} />
                  {deletingId.subEvent === selectedSubEvent.id ? 'Deleting...' : 'Delete'}
                </button>
              )}
            </div>

            <form onSubmit={handleSubEventSubmit} className="mt-5 space-y-4">
              {subEventMode === 'create' ? (
                <label className="space-y-2 text-sm text-zinc-300">
                  <span>Event</span>
                  <select
                    value={subEventForm.event_id}
                    onChange={handleSubEventFormChange('event_id')}
                    className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none"
                  >
                    <option value="">Select event</option>
                    {activeEvents.map((eventItem) => (
                      <option key={eventItem.id} value={eventItem.id}>
                        {eventItem.titleText}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="rounded-3xl border border-white/8 bg-white/4 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Linked Event</p>
                  <p className="mt-2 text-sm font-medium text-white">
                    {selectedSubEvent?.eventTitleText || activeEvents.find((item) => String(item.id) === subEventForm.event_id)?.titleText || 'N/A'}
                  </p>
                </div>
              )}

              <label className="space-y-2 text-sm text-zinc-300">
                <span>City</span>
                <select
                  value={subEventForm.city_id}
                  onChange={handleSubEventFormChange('city_id')}
                  className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none"
                >
                  <option value="">Select city</option>
                  {activeCities.map((city) => (
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
                    value={subEventForm.title_en}
                    onChange={handleSubEventFormChange('title_en')}
                    className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none"
                  />
                </label>
                <label className="space-y-2 text-sm text-zinc-300">
                  <span>Title AR/KU</span>
                  <input
                    value={subEventForm.title_ar}
                    onChange={handleSubEventFormChange('title_ar')}
                    className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm text-zinc-300">
                  <span>Sub Title EN</span>
                  <input
                    value={subEventForm.sub_title_en}
                    onChange={handleSubEventFormChange('sub_title_en')}
                    className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none"
                  />
                </label>
                <label className="space-y-2 text-sm text-zinc-300">
                  <span>Sub Title AR/KU</span>
                  <input
                    value={subEventForm.sub_title_ar}
                    onChange={handleSubEventFormChange('sub_title_ar')}
                    className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm text-zinc-300">
                  <span>Description EN</span>
                  <textarea
                    rows="4"
                    value={subEventForm.description_en}
                    onChange={handleSubEventFormChange('description_en')}
                    className="w-full rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-white outline-none"
                  />
                </label>
                <label className="space-y-2 text-sm text-zinc-300">
                  <span>Description AR/KU</span>
                  <textarea
                    rows="4"
                    value={subEventForm.description_ar}
                    onChange={handleSubEventFormChange('description_ar')}
                    className="w-full rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-white outline-none"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm text-zinc-300">
                  <span>Location EN</span>
                  <input
                    value={subEventForm.location_en}
                    onChange={handleSubEventFormChange('location_en')}
                    className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none"
                  />
                </label>
                <label className="space-y-2 text-sm text-zinc-300">
                  <span>Location AR/KU</span>
                  <input
                    value={subEventForm.location_ar}
                    onChange={handleSubEventFormChange('location_ar')}
                    className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="space-y-2 text-sm text-zinc-300">
                  <span>Date</span>
                  <input
                    type="date"
                    value={subEventForm.date}
                    onChange={handleSubEventFormChange('date')}
                    className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none"
                  />
                </label>
                <label className="space-y-2 text-sm text-zinc-300">
                  <span>Start Time</span>
                  <input
                    type="time"
                    value={subEventForm.start_time}
                    onChange={handleSubEventFormChange('start_time')}
                    className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none"
                  />
                </label>
                <label className="space-y-2 text-sm text-zinc-300">
                  <span>End Time</span>
                  <input
                    type="time"
                    value={subEventForm.end_time}
                    onChange={handleSubEventFormChange('end_time')}
                    className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none"
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={saving.subEvent}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 via-amber-200 to-orange-200 px-5 py-3 text-sm font-semibold text-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={16} />
                {saving.subEvent ? 'Saving...' : subEventMode === 'edit' ? 'Save sub-event' : 'Create sub-event'}
              </button>
            </form>
          </section>
        </div>
      </section>
    </div>
  )
}
