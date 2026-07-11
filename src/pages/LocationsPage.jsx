import { useEffect, useMemo, useState } from 'react'
import { Building2, CalendarDays, Filter, Globe2, Plus, Search } from 'lucide-react'
import CountryFormDrawer from '../components/locations/CountryFormDrawer'
import CityFormDrawer from '../components/locations/CityFormDrawer'
import SubEventFormDrawer from '../components/locations/SubEventFormDrawer'
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
  name_ku: '',
  status: '1',
}

const EMPTY_CITY_FORM = {
  country_id: '',
  name_en: '',
  name_ar: '',
  name_ku: '',
  status: '1',
}

const EMPTY_SUB_EVENT_FORM = {
  event_id: '',
  city_id: '',
  title_en: '',
  title_ar: '',
  title_ku: '',
  sub_title_en: '',
  sub_title_ar: '',
  sub_title_ku: '',
  description_en: '',
  description_ar: '',
  description_ku: '',
  location_en: '',
  location_ar: '',
  location_ku: '',
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

function buildTranslations(enValue, arValue, kuValue) {
  return {
    en: enValue.trim(),
    ar: arValue.trim(),
    ku: kuValue.trim(),
  }
}

function buildNullableTranslations(enValue, arValue, kuValue) {
  const normalized = buildTranslations(enValue, arValue, kuValue)

  if (!normalized.en && !normalized.ar && !normalized.ku) {
    return null
  }

  return normalized
}

function mapCountryToForm(country) {
  return {
    name_en: country.name?.en || '',
    name_ar: country.name?.ar || '',
    name_ku: country.name?.ku || '',
    status: country.status ? '1' : '0',
  }
}

function mapCityToForm(city) {
  return {
    country_id: city.countryId ? String(city.countryId) : '',
    name_en: city.name?.en || '',
    name_ar: city.name?.ar || '',
    name_ku: city.name?.ku || '',
    status: city.status ? '1' : '0',
  }
}

function mapSubEventToForm(subEvent) {
  return {
    event_id: subEvent.eventId ? String(subEvent.eventId) : '',
    city_id: subEvent.cityId ? String(subEvent.cityId) : '',
    title_en: subEvent.title?.en || '',
    title_ar: subEvent.title?.ar || '',
    title_ku: subEvent.title?.ku || '',
    sub_title_en: subEvent.subTitle?.en || '',
    sub_title_ar: subEvent.subTitle?.ar || '',
    sub_title_ku: subEvent.subTitle?.ku || '',
    description_en: subEvent.description?.en || '',
    description_ar: subEvent.description?.ar || '',
    description_ku: subEvent.description?.ku || '',
    location_en: subEvent.location?.en || '',
    location_ar: subEvent.location?.ar || '',
    location_ku: subEvent.location?.ku || '',
    date: subEvent.date || '',
    start_time: subEvent.startTime || '',
    end_time: subEvent.endTime || '',
  }
}

function buildCountryPayload(form) {
  return {
    name: buildTranslations(form.name_en, form.name_ar, form.name_ku),
    status: Number(form.status),
  }
}

function buildCityPayload(form) {
  return {
    country_id: Number(form.country_id),
    name: buildTranslations(form.name_en, form.name_ar, form.name_ku),
    status: Number(form.status),
  }
}

function buildSubEventPayload(form) {
  return {
    city_id: Number(form.city_id),
    title: buildTranslations(form.title_en, form.title_ar, form.title_ku),
    sub_title: buildNullableTranslations(form.sub_title_en, form.sub_title_ar, form.sub_title_ku),
    description: buildTranslations(form.description_en, form.description_ar, form.description_ku),
    location: buildNullableTranslations(form.location_en, form.location_ar, form.location_ku),
    date: form.date,
    start_time: form.start_time,
    end_time: form.end_time,
  }
}

function mergeUniqueById(...collections) {
  const merged = new Map()

  collections.flat().forEach((item) => {
    if (item?.id && !merged.has(item.id)) {
      merged.set(item.id, item)
    }
  })

  return Array.from(merged.values())
}

function ColumnSelection({ label, value, onClear }) {
  if (!value) {
    return (
      <p className="text-xs text-zinc-500">
        {label}
      </p>
    )
  }

  return (
    <div className="flex flex-col items-start gap-2 rounded-2xl border border-amber-300/15 bg-amber-400/5 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-amber-100/85">{value}</p>
      <button
        type="button"
        onClick={onClear}
        className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-400 transition hover:text-white"
      >
        Clear
      </button>
    </div>
  )
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
  const [activeDrawer, setActiveDrawer] = useState(null)
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

  const isDrawerOpen = activeDrawer !== null

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

  const countries = countriesPayload?.items ?? []
  const cities = citiesPayload?.items ?? []
  const subEvents = subEventsPayload?.items ?? []

  const countryOptions = useMemo(
    () => mergeUniqueById(activeCountries, countries),
    [activeCountries, countries],
  )

  const cityOptions = useMemo(
    () => mergeUniqueById(activeCities, cities),
    [activeCities, cities],
  )

  const selectedCountry = useMemo(
    () => countryOptions.find((item) => item.id === selectedCountryId) || null,
    [countryOptions, selectedCountryId],
  )

  const selectedCity = useMemo(
    () => cityOptions.find((item) => item.id === selectedCityId) || null,
    [cityOptions, selectedCityId],
  )

  const selectedSubEvent = useMemo(
    () => subEvents.find((item) => item.id === selectedSubEventId) || null,
    [subEvents, selectedSubEventId],
  )

  const summaryCards = useMemo(() => {
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
  }, [countries, cities, subEvents])

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

  const closeDrawer = () => {
    setActiveDrawer(null)
  }

  const openCountryCreate = () => {
    setCountryMode('create')
    setCountryForm(EMPTY_COUNTRY_FORM)
    setActiveDrawer('country')
  }

  const openCountryEdit = (country) => {
    setSelectedCountryId(country.id)
    setCountryMode('edit')
    setCountryForm(mapCountryToForm(country))
    setActiveDrawer('country')
  }

  const openCityCreate = () => {
    setCityMode('create')
    setCityForm({
      ...EMPTY_CITY_FORM,
      country_id: selectedCountryId ? String(selectedCountryId) : '',
    })
    setActiveDrawer('city')
  }

  const openCityEdit = (city) => {
    setSelectedCityId(city.id)
    setCityMode('edit')
    setCityForm(mapCityToForm(city))
    setActiveDrawer('city')
  }

  const openSubEventCreate = () => {
    setSubEventMode('create')
    setSubEventForm({
      ...EMPTY_SUB_EVENT_FORM,
      event_id: subEventFilters.event_id || '',
      city_id: selectedCityId ? String(selectedCityId) : '',
    })
    setActiveDrawer('subEvent')
  }

  const openSubEventEdit = (subEvent) => {
    setSelectedSubEventId(subEvent.id)
    setSubEventMode('edit')
    setSubEventForm(mapSubEventToForm(subEvent))
    setActiveDrawer('subEvent')
  }

  const clearCountrySelection = async () => {
    setSelectedCountryId(null)
    setSelectedCityId(null)
    setSelectedSubEventId(null)

    const nextCityFilters = {
      ...cityFilters,
      country_id: '',
    }
    const nextSubEventFilters = {
      ...subEventFilters,
      city_id: '',
    }

    setCityFilters(nextCityFilters)
    setSubEventFilters(nextSubEventFilters)

    await Promise.all([
      loadCities({ silent: true, nextFilters: nextCityFilters }),
      loadSubEvents({ silent: true, nextFilters: nextSubEventFilters }),
    ])
  }

  const clearCitySelection = async () => {
    setSelectedCityId(null)
    setSelectedSubEventId(null)

    const nextSubEventFilters = {
      ...subEventFilters,
      city_id: '',
    }

    setSubEventFilters(nextSubEventFilters)
    await loadSubEvents({ silent: true, nextFilters: nextSubEventFilters })
  }

  const handleSelectCountry = async (country) => {
    if (selectedCountryId === country.id) {
      await clearCountrySelection()
      return
    }

    setSelectedCountryId(country.id)
    setSelectedCityId(null)
    setSelectedSubEventId(null)

    const nextCityFilters = {
      ...cityFilters,
      country_id: String(country.id),
    }
    const nextSubEventFilters = {
      ...subEventFilters,
      city_id: '',
    }

    setCityFilters(nextCityFilters)
    setSubEventFilters(nextSubEventFilters)

    await Promise.all([
      loadCities({ silent: true, nextFilters: nextCityFilters }),
      loadSubEvents({ silent: true, nextFilters: nextSubEventFilters }),
    ])
  }

  const handleSelectCity = async (city) => {
    if (selectedCityId === city.id) {
      await clearCitySelection()
      return
    }

    setSelectedCityId(city.id)
    setSelectedSubEventId(null)

    const nextSubEventFilters = {
      ...subEventFilters,
      city_id: String(city.id),
    }

    setSubEventFilters(nextSubEventFilters)
    await loadSubEvents({ silent: true, nextFilters: nextSubEventFilters })
  }

  const handleSelectSubEvent = (subEvent) => {
    setSelectedSubEventId((current) => (current === subEvent.id ? null : subEvent.id))
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
      const nextCountryId = country?.id ?? selectedCountryId
      const nextCityFilters = {
        ...cityFilters,
        country_id: nextCountryId ? String(nextCountryId) : '',
      }
      const nextSubEventFilters = {
        ...subEventFilters,
        city_id: '',
      }

      if (country) {
        setSelectedCountryId(country.id)
        setCountryMode('edit')
        setCountryForm(mapCountryToForm(country))
      }

      setSelectedCityId(null)
      setSelectedSubEventId(null)
      setCityFilters(nextCityFilters)
      setSubEventFilters(nextSubEventFilters)

      await Promise.all([
        loadCountries({ silent: true }),
        loadCities({ silent: true, nextFilters: nextCityFilters }),
        loadSubEvents({ silent: true, nextFilters: nextSubEventFilters }),
        loadLookups(),
      ])

      closeDrawer()
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
      const nextSelectedCountryId = city?.countryId ?? (cityForm.country_id ? Number(cityForm.country_id) : selectedCountryId)
      const nextSelectedCityId = city?.id ?? selectedCityId
      const nextCityFilters = {
        ...cityFilters,
        country_id: nextSelectedCountryId ? String(nextSelectedCountryId) : '',
      }
      const nextSubEventFilters = {
        ...subEventFilters,
        city_id: nextSelectedCityId ? String(nextSelectedCityId) : '',
      }

      if (city) {
        setSelectedCountryId(city.countryId ?? nextSelectedCountryId)
        setSelectedCityId(city.id)
        setCityMode('edit')
        setCityForm(mapCityToForm(city))
      }

      setSelectedSubEventId(null)
      setCityFilters(nextCityFilters)
      setSubEventFilters(nextSubEventFilters)

      await Promise.all([
        loadCities({ silent: true, nextFilters: nextCityFilters }),
        loadSubEvents({ silent: true, nextFilters: nextSubEventFilters }),
        loadLookups(),
      ])

      closeDrawer()
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
      const response = await apiRequest(
        subEventMode === 'edit' && selectedSubEventId
          ? `/api/admin/sub-events/${selectedSubEventId}/update`
          : `/api/admin/events/${eventId}/sub-events/create`,
        {
          method: 'POST',
          token,
          body: buildSubEventPayload(subEventForm),
        },
      )

      const subEvent = response.data?.subEvent
      const nextSelectedSubEventId = subEvent?.id ?? selectedSubEventId
      const nextSubEventFilters = {
        ...subEventFilters,
        city_id: subEvent?.cityId
          ? String(subEvent.cityId)
          : subEventForm.city_id || subEventFilters.city_id,
      }

      if (subEvent?.cityId) {
        setSelectedCityId(subEvent.cityId)
      }

      if (nextSelectedSubEventId) {
        setSelectedSubEventId(nextSelectedSubEventId)
      }

      setSubEventFilters(nextSubEventFilters)
      await loadSubEvents({ silent: true, nextFilters: nextSubEventFilters })
      closeDrawer()
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

      const nextCityFilters = {
        ...cityFilters,
        country_id: selectedCountryId === countryId ? '' : cityFilters.country_id,
      }
      const nextSubEventFilters = {
        ...subEventFilters,
        city_id: '',
      }

      if (selectedCountryId === countryId) {
        setSelectedCountryId(null)
        setSelectedCityId(null)
        setSelectedSubEventId(null)
      }

      setCityFilters(nextCityFilters)
      setSubEventFilters(nextSubEventFilters)

      await Promise.all([
        loadCountries({ silent: true }),
        loadCities({ silent: true, nextFilters: nextCityFilters }),
        loadSubEvents({ silent: true, nextFilters: nextSubEventFilters }),
        loadLookups(),
      ])

      closeDrawer()
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

      const nextSubEventFilters = {
        ...subEventFilters,
        city_id: selectedCityId === cityId ? '' : subEventFilters.city_id,
      }

      if (selectedCityId === cityId) {
        setSelectedCityId(null)
        setSelectedSubEventId(null)
      }

      setSubEventFilters(nextSubEventFilters)

      await Promise.all([
        loadCities({ silent: true }),
        loadSubEvents({ silent: true, nextFilters: nextSubEventFilters }),
        loadLookups(),
      ])

      closeDrawer()
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
        setSelectedSubEventId(null)
      }

      await loadSubEvents({ silent: true })
      closeDrawer()
    } catch (requestError) {
      handleRequestError(requestError, 'Failed to delete sub-event.')
    } finally {
      setModuleDeletingId('subEvent', null)
    }
  }

  return (
    <div className="space-y-6">
      <section className="panel-surface panel-shadow rounded-4xl p-4 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="mt-2 text-2xl font-semibold text-amber-100/70 sm:mt-3 sm:text-3xl">Locations Module</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-500 sm:max-w-2xl">
              A streamlined 3-column flow for countries, cities, and sub-events. Select left to right, and open drawers only when you need to create or edit.
            </p>
          </div>
        </div>
      </section>

      {error && (
        <section className="rounded-4xl border border-rose-400/20 bg-rose-500/8 px-5 py-4 text-sm text-rose-100">
          {error}
        </section>
      )}

      <section className="grid gap-5 md:grid-cols-3">
        {summaryCards.map((card) => (
          <StatCard key={card.title} eyebrow={card.eyebrow} title={card.title} value={card.value} delta={card.delta} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <section className="panel-surface panel-border panel-shadow rounded-4xl p-4 sm:p-5">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Countries</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Coverage map</h2>
            </div>
            <button
              type="button"
              onClick={openCountryCreate}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-amber-300 via-amber-200 to-orange-200 px-4 py-2 text-xs font-semibold text-zinc-900 sm:w-auto"
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

            <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
              <select
                value={countryFilters.status}
                onChange={handleCountryFilterChange('status')}
                className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none"
              >
                <option value="">All statuses</option>
                <option value="1">Active</option>
                <option value="0">Hidden</option>
              </select>
              <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-amber-300 via-amber-200 to-orange-200 px-4 py-3 text-sm font-semibold text-zinc-900 md:w-auto">
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
                className="w-full rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-zinc-200 md:w-auto"
              >
                Reset
              </button>
            </div>
          </form>

          <div className="mt-5 space-y-3">
            {loading.countries ? (
              <div className="rounded-3xl border border-white/8 bg-white/4 p-4 text-sm text-zinc-400">Loading countries...</div>
            ) : countries.length ? (
              countries.map((country) => (
                <button
                  key={country.id}
                  type="button"
                  onClick={() => handleSelectCountry(country)}
                  className={`w-full rounded-3xl border px-4 py-4 text-left transition ${
                    selectedCountryId === country.id
                      ? 'border-amber-300/30 bg-amber-400/10'
                      : 'border-white/8 bg-white/4 hover:bg-white/7'
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Globe2 size={15} className="shrink-0 text-amber-200" />
                        <p className="truncate text-sm font-semibold text-white">{country.nameText}</p>
                      </div>
                      <p className="mt-2 text-[11px] text-zinc-500">Updated {formatDateTime(country.updatedAt)}</p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-[11px] font-medium ${toneForStatus(country.status)}`}>
                      {country.status ? 'active' : 'hidden'}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap gap-2 text-[11px] text-zinc-400">
                      <span className="rounded-full border border-white/6 bg-black/10 px-3 py-1">
                        {formatNumber(country.citiesCount)} cities
                      </span>
                      <span className="rounded-full border border-white/6 bg-black/10 px-3 py-1">
                        {formatNumber(country.eventsCount)} events
                      </span>
                    </div>
                    <span
                      onClick={(event) => {
                        event.stopPropagation()
                        openCountryEdit(country)
                      }}
                      className="cursor-pointer text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-400 transition hover:text-white"
                    >
                      Edit
                    </span>
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

        <section className="panel-surface panel-border panel-shadow rounded-4xl p-4 sm:p-5">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Cities</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Operational areas</h2>
            </div>
            <button
              type="button"
              onClick={openCityCreate}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-amber-300 via-amber-200 to-orange-200 px-4 py-2 text-xs font-semibold text-zinc-900 sm:w-auto"
            >
              <Plus size={14} />
              New
            </button>
          </div>

          <div className="mt-5">
            <ColumnSelection
              label="Select a country to focus this column, or browse all cities."
              value={selectedCountry ? `Showing cities in ${selectedCountry.nameText}` : ''}
              onClear={clearCountrySelection}
            />
          </div>

          <form onSubmit={handleCityFilterSubmit} className="mt-5 space-y-4">
            <label className="space-y-2 text-sm text-zinc-300">
              <span>Search</span>
              <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
                <Search size={16} className="text-zinc-500" />
                <input
                  value={cityFilters.q}
                  onChange={handleCityFilterChange('q')}
                  placeholder="City name"
                  className="w-full bg-transparent text-white outline-none placeholder:text-zinc-500"
                />
              </div>
            </label>

            <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
              <select
                value={cityFilters.status}
                onChange={handleCityFilterChange('status')}
                className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none"
              >
                <option value="">All statuses</option>
                <option value="1">Active</option>
                <option value="0">Hidden</option>
              </select>
              <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-amber-300 via-amber-200 to-orange-200 px-4 py-3 text-sm font-semibold text-zinc-900 md:w-auto">
                <Filter size={15} />
                Apply
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = {
                    ...INITIAL_CITY_FILTERS,
                    country_id: selectedCountryId ? String(selectedCountryId) : '',
                  }
                  setCityFilters(next)
                  loadCities({ nextFilters: next })
                }}
                className="w-full rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-zinc-200 md:w-auto"
              >
                Reset
              </button>
            </div>
          </form>

          <div className="mt-5 space-y-3">
            {loading.cities ? (
              <div className="rounded-3xl border border-white/8 bg-white/4 p-4 text-sm text-zinc-400">Loading cities...</div>
            ) : cities.length ? (
              cities.map((city) => (
                <button
                  key={city.id}
                  type="button"
                  onClick={() => handleSelectCity(city)}
                  className={`w-full rounded-3xl border px-4 py-4 text-left transition ${
                    selectedCityId === city.id
                      ? 'border-amber-300/30 bg-amber-400/10'
                      : 'border-white/8 bg-white/4 hover:bg-white/7'
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Building2 size={15} className="shrink-0 text-amber-200" />
                        <p className="truncate text-sm font-semibold text-white">{city.nameText}</p>
                      </div>
                      <p className="mt-2 text-[11px] text-zinc-500">{city.countryNameText || 'No country'}</p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-[11px] font-medium ${toneForStatus(city.status)}`}>
                      {city.status ? 'active' : 'hidden'}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="rounded-full border border-white/6 bg-black/10 px-3 py-1 text-[11px] text-zinc-400">
                      {formatNumber(city.subEventsCount)} sub-events
                    </span>
                    <span
                      onClick={(event) => {
                        event.stopPropagation()
                        openCityEdit(city)
                      }}
                      className="cursor-pointer text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-400 transition hover:text-white"
                    >
                      Edit
                    </span>
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

        <section className="panel-surface panel-border panel-shadow rounded-4xl p-4 sm:p-5">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Sub-Events</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Scheduling layer</h2>
            </div>
            <button
              type="button"
              onClick={openSubEventCreate}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-amber-300 via-amber-200 to-orange-200 px-4 py-2 text-xs font-semibold text-zinc-900 sm:w-auto"
            >
              <Plus size={14} />
              New
            </button>
          </div>

          <div className="mt-5">
            <ColumnSelection
              label="Select a city to narrow the schedule column, or browse the full list."
              value={selectedCity ? `Showing sub-events in ${selectedCity.nameText}` : ''}
              onClear={clearCitySelection}
            />
          </div>

          <form onSubmit={handleSubEventFilterSubmit} className="mt-5 space-y-4">
            <label className="space-y-2 text-sm text-zinc-300">
              <span>Search</span>
              <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
                <Search size={16} className="text-zinc-500" />
                <input
                  value={subEventFilters.q}
                  onChange={handleSubEventFilterChange('q')}
                  placeholder="Sub-event title"
                  className="w-full bg-transparent text-white outline-none placeholder:text-zinc-500"
                />
              </div>
            </label>

            <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
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
              <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-amber-300 via-amber-200 to-orange-200 px-4 py-3 text-sm font-semibold text-zinc-900 md:w-auto">
                <Filter size={15} />
                Apply
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = {
                    ...INITIAL_SUB_EVENT_FILTERS,
                    city_id: selectedCityId ? String(selectedCityId) : '',
                  }
                  setSubEventFilters(next)
                  loadSubEvents({ nextFilters: next })
                }}
                className="w-full rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-zinc-200 md:w-auto"
              >
                Reset
              </button>
            </div>
          </form>

          <div className="mt-5 space-y-3">
            {loading.subEvents ? (
              <div className="rounded-3xl border border-white/8 bg-white/4 p-4 text-sm text-zinc-400">Loading sub-events...</div>
            ) : subEvents.length ? (
              subEvents.map((subEvent) => (
                <button
                  key={subEvent.id}
                  type="button"
                  onClick={() => handleSelectSubEvent(subEvent)}
                  className={`w-full rounded-3xl border px-4 py-4 text-left transition ${
                    selectedSubEventId === subEvent.id
                      ? 'border-amber-300/30 bg-amber-400/10'
                      : 'border-white/8 bg-white/4 hover:bg-white/7'
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <CalendarDays size={15} className="shrink-0 text-amber-200" />
                        <p className="truncate text-sm font-semibold text-white">{subEvent.titleText}</p>
                      </div>
                      <p className="mt-2 text-[11px] text-zinc-500">
                        {subEvent.eventTitleText} · {subEvent.cityNameText}
                      </p>
                    </div>
                    <span className="rounded-full border border-white/8 bg-black/10 px-3 py-1 text-[11px] font-medium text-zinc-200">
                      {formatNumber(subEvent.ticketsCount)} tickets
                    </span>
                  </div>

                  <div className="mt-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-[11px] leading-5 text-zinc-400">
                      {formatDateTime(`${subEvent.date} ${subEvent.startTime}`)} · {subEvent.startTime} - {subEvent.endTime}
                    </p>
                    <span
                      onClick={(event) => {
                        event.stopPropagation()
                        openSubEventEdit(subEvent)
                      }}
                      className="cursor-pointer text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-400 transition hover:text-white"
                    >
                      Edit
                    </span>
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
      </section>

      <CountryFormDrawer
        isOpen={activeDrawer === 'country'}
        mode={countryMode}
        selectedCountry={selectedCountry}
        form={countryForm}
        saving={saving.country}
        deleting={deletingId.country === selectedCountry?.id}
        onClose={closeDrawer}
        onSubmit={handleCountrySubmit}
        onFieldChange={handleCountryFormChange}
        onDelete={handleDeleteCountry}
      />

      <CityFormDrawer
        isOpen={activeDrawer === 'city'}
        mode={cityMode}
        selectedCity={selectedCity}
        countries={countryOptions}
        form={cityForm}
        saving={saving.city}
        deleting={deletingId.city === selectedCity?.id}
        onClose={closeDrawer}
        onSubmit={handleCitySubmit}
        onFieldChange={handleCityFormChange}
        onDelete={handleDeleteCity}
      />

      <SubEventFormDrawer
        isOpen={activeDrawer === 'subEvent'}
        mode={subEventMode}
        selectedSubEvent={selectedSubEvent}
        cities={cityOptions}
        events={activeEvents}
        form={subEventForm}
        saving={saving.subEvent}
        deleting={deletingId.subEvent === selectedSubEvent?.id}
        onClose={closeDrawer}
        onSubmit={handleSubEventSubmit}
        onFieldChange={handleSubEventFormChange}
        onDelete={handleDeleteSubEvent}
      />
    </div>
  )
}
