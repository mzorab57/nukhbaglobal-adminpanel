import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Image as ImageIcon,
  PencilLine,
  Plus,
  Save,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react'
import ImageUploadField from '../components/ui/ImageUploadField'
import StatCard from '../components/ui/StatCard'
import { ApiError, apiRequest, uploadImage } from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatDateTime, formatNumber } from '../lib/format'

const INITIAL_FILTERS = {
  q: '',
  status: '',
  category: '',
}

const EMPTY_FORM = {
  category: 'home_hero',
  title_en: '',
  title_ar: '',
  desktop_image: '',
  mobile_image: '',
  cta_label_en: '',
  cta_label_ar: '',
  cta_url: '',
  sort_order: '',
  status: '1',
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

function toneForBehavior(behavior) {
  return behavior === 'single'
    ? 'border-amber-300/15 bg-amber-400/10 text-amber-100'
    : 'border-sky-300/15 bg-sky-400/10 text-sky-100'
}

function buildNullableTranslations(enValue, arValue) {
  const en = enValue.trim()
  const ar = arValue.trim()

  if (!en && !ar) {
    return null
  }

  return { en, ar }
}

function mapItemToForm(item) {
  return {
    category: item.category || 'home_hero',
    title_en: item.title?.en || '',
    title_ar: item.title?.ar || '',
    desktop_image: item.desktopImage || '',
    mobile_image: item.mobileImage || '',
    cta_label_en: item.ctaLabel?.en || '',
    cta_label_ar: item.ctaLabel?.ar || '',
    cta_url: item.ctaUrl || '',
    sort_order: item.sortOrder ? String(item.sortOrder) : '',
    status: item.status ? '1' : '0',
  }
}

function buildPayload(form) {
  return {
    category: form.category.trim(),
    title: buildNullableTranslations(form.title_en, form.title_ar),
    desktop_image: form.desktop_image.trim(),
    mobile_image: form.mobile_image.trim(),
    cta_label: buildNullableTranslations(form.cta_label_en, form.cta_label_ar),
    cta_url: form.cta_url.trim() || null,
    sort_order: form.sort_order.trim() ? Number(form.sort_order) : null,
    status: Number(form.status),
  }
}

export default function FeaturedContentPage() {
  const { token, logout } = useAuth()
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [mediaPayload, setMediaPayload] = useState(null)
  const [selectedItemId, setSelectedItemId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [mode, setMode] = useState('create')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [reorderingCategory, setReorderingCategory] = useState('')
  const [uploading, setUploading] = useState({
    desktop: false,
    mobile: false,
  })
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

  const items = mediaPayload?.items ?? []
  const categoryOptions = mediaPayload?.categoryOptions ?? []

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
    setSelectedItemId(null)
    setForm((current) => ({
      ...EMPTY_FORM,
      category: current.category || EMPTY_FORM.category,
    }))
  }

  const loadMedia = async ({ silent = false } = {}) => {
    if (!token) {
      return
    }

    if (!silent) {
      setLoading(true)
    }

    setError('')

    try {
      const query = buildQueryString(filters)
      const path = query ? `/api/admin/media?${query}` : '/api/admin/media'
      const response = await apiRequest(path, { token })
      setMediaPayload(response.data)
    } catch (requestError) {
      handleRequestError(requestError, 'Failed to load website media.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMedia()
  }, [token, filters.category, filters.q, filters.status])

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedItemId) ?? null,
    [items, selectedItemId],
  )

  const stats = useMemo(() => {
    const activeItems = items.filter((item) => item.status)
    const uniqueCategories = new Set(items.map((item) => item.category).filter(Boolean))
    const singleBehaviorItems = items.filter((item) => item.behavior === 'single')

    return {
      totalItems: items.length,
      activeItems: activeItems.length,
      categories: uniqueCategories.size,
      banners: singleBehaviorItems.length,
    }
  }, [items])

  const selectedCategoryMeta = useMemo(
    () => categoryOptions.find((option) => option.key === form.category) ?? null,
    [categoryOptions, form.category],
  )

  const activeFilterCategoryMeta = useMemo(
    () => categoryOptions.find((option) => option.key === filters.category) ?? null,
    [categoryOptions, filters.category],
  )

  const groupedItems = useMemo(() => {
    return items.reduce((groups, item) => {
      const key = item.category || 'uncategorized'
      if (!groups[key]) {
        groups[key] = []
      }

      groups[key].push(item)
      return groups
    }, {})
  }, [items])

  const groupedEntries = useMemo(() => Object.entries(groupedItems), [groupedItems])

  const handleEdit = (item) => {
    setMode('edit')
    setSelectedItemId(item.id)
    setForm(mapItemToForm(item))
    setIsDrawerOpen(true)
  }

  const handleUpload = async (field, file) => {
    if (!token) {
      return
    }

    setUploading((current) => ({
      ...current,
      [field]: true,
    }))
    setError('')

    try {
      const uploaded = await uploadImage(token, file, 'media')
      const nextValue = uploaded?.url || ''

      setForm((current) => ({
        ...current,
        [field === 'desktop' ? 'desktop_image' : 'mobile_image']: nextValue,
      }))
    } catch (requestError) {
      handleRequestError(requestError, 'Failed to upload image.')
    } finally {
      setUploading((current) => ({
        ...current,
        [field]: false,
      }))
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!token) {
      return
    }

    setSaving(true)
    setError('')

    try {
      const payload = buildPayload(form)
      const path =
        mode === 'edit' && selectedItemId
          ? `/api/admin/media/${selectedItemId}/update`
          : '/api/admin/media/create'

      await apiRequest(path, {
        method: 'POST',
        token,
        body: payload,
      })

      await loadMedia({ silent: true })
      resetForm()
      setIsDrawerOpen(false)
    } catch (requestError) {
      handleRequestError(requestError, 'Failed to save media item.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (itemId) => {
    if (!token) {
      return
    }

    setDeletingId(itemId)
    setError('')

    try {
      await apiRequest(`/api/admin/media/${itemId}/delete`, {
        method: 'POST',
        token,
      })

      if (selectedItemId === itemId) {
        resetForm()
        setIsDrawerOpen(false)
      }

      await loadMedia({ silent: true })
    } catch (requestError) {
      handleRequestError(requestError, 'Failed to delete media item.')
    } finally {
      setDeletingId(null)
    }
  }

  const handleToggleVisibility = async (item) => {
    if (!token) {
      return
    }

    setError('')

    try {
      await apiRequest(`/api/admin/media/${item.id}/update`, {
        method: 'POST',
        token,
        body: {
          status: item.status ? 0 : 1,
        },
      })

      await loadMedia({ silent: true })
    } catch (requestError) {
      handleRequestError(requestError, 'Failed to update item visibility.')
    }
  }

  const handleMove = async (item, direction) => {
    if (!token) {
      return
    }

    const siblings = [...(groupedItems[item.category] ?? [])].sort((left, right) => left.sortOrder - right.sortOrder)
    const currentIndex = siblings.findIndex((entry) => entry.id === item.id)
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1

    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= siblings.length) {
      return
    }

    const reordered = [...siblings]
    const [movedItem] = reordered.splice(currentIndex, 1)
    reordered.splice(targetIndex, 0, movedItem)

    setReorderingCategory(item.category)
    setError('')

    try {
      await apiRequest('/api/admin/media/reorder', {
        method: 'POST',
        token,
        body: {
          category: item.category,
          item_ids: reordered.map((entry) => entry.id),
        },
      })

      await loadMedia({ silent: true })
    } catch (requestError) {
      handleRequestError(requestError, 'Failed to reorder media items.')
    } finally {
      setReorderingCategory('')
    }
  }

  return (
    <div className="space-y-8 text-zinc-100">
      <section className="panel-surface panel-shadow rounded-4xl p-5 sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">

            <h1 className="mt-3 text-2xl font-semibold text-amber-100/70 sm:text-3xl">Featured Media Library</h1>
           
          </div>

         
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          eyebrow="Inventory"
          title="Managed assets"
          value={formatNumber(stats.totalItems)}
          delta="All items"
        />
        <StatCard
          eyebrow="Visibility"
          title="Active items"
          value={formatNumber(stats.activeItems)}
          delta="Live now"
        />
        <StatCard
          eyebrow="Coverage"
          title="Categories"
          value={formatNumber(stats.categories)}
          delta="Reusable"
        />
        <StatCard
          eyebrow="Behavior"
          title="Single banners"
          value={formatNumber(stats.banners)}
          delta="Page hero"
        />
      </section>

      <section className="space-y-6">
        <div className="w-full min-w-0 space-y-6">
          <div className="panel-surface panel-border panel-shadow rounded-4xl p-5 sm:p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Filters</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Browse categories and assets</h2>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => {
                    resetForm()
                    setIsDrawerOpen(true)
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-amber-300/90 to-amber-100 px-5 py-3 text-sm font-medium text-black transition hover:opacity-95 sm:w-auto sm:order-last"
                >
                  <Plus size={16} />
                  New Media
                </button>
                <div className="grid gap-2 text-left sm:grid-cols-2 xl:min-w-[290px]">
                  <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Active filter</p>
                    <p className="mt-2 text-sm text-zinc-200">{activeFilterCategoryMeta?.label || 'All categories'}</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Results</p>
                    <p className="mt-2 text-sm text-zinc-200">{loading ? 'Loading...' : `${formatNumber(items.length)} item(s)`}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 xl:flex-row xl:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                <input value={filters.q} onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))} placeholder="Search category, title, or CTA" className="w-full rounded-2xl border border-white/10 bg-black/20 py-3 pl-11 pr-4 text-sm text-white outline-none transition focus:border-amber-200/25" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[360px] xl:grid-cols-[1fr_1fr_auto]">
                <select value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-200/25">
                  <option value="">All categories</option>
                  {categoryOptions.map((option) => (
                    <option key={option.key} value={option.key}>{option.label}</option>
                  ))}
                </select>
                <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-200/25">
                  <option value="">Any status</option>
                  <option value="1">Visible only</option>
                  <option value="0">Hidden only</option>
                </select>
                <button type="button" onClick={() => setFilters(INITIAL_FILTERS)} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300 transition hover:text-white">
                  Reset
                </button>
              </div>
            </div>
          </div>

          <div className="panel-surface panel-border panel-shadow rounded-4xl p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Library</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Category items</h2>
              </div>
              <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400">
                {loading ? 'Loading...' : `${formatNumber(groupedEntries.length)} group(s)`}
              </div>
            </div>

            <div className="mt-6 space-y-5">
              {!loading && items.length === 0 ? (
                <div className="rounded-[1.75rem] border border-dashed border-white/10 bg-black/10 px-6 py-12 text-center">
                  <ImageIcon className="mx-auto text-zinc-500" size={26} />
                  <p className="mt-4 text-sm text-zinc-300">No media items match the current filters.</p>
                </div>
              ) : null}

              {groupedEntries.map(([category, categoryItems]) => (
                <div key={category} className="rounded-[1.7rem] border border-white/8 bg-black/10 p-4 sm:p-5">
                  <div className="flex flex-col gap-3 border-b border-white/6 pb-4 sm:flex-row sm:flex-wrap sm:items-center">
                    <span className="rounded-full border border-amber-300/15 bg-amber-300/10 px-3 py-1 text-xs font-medium text-amber-100">{categoryItems[0]?.categoryLabel || category}</span>
                    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${toneForBehavior(categoryItems[0]?.behavior)}`}>{categoryItems[0]?.behavior === 'single' ? 'Single banner' : 'Ordered collection'}</span>
                    <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">{formatNumber(categoryItems.length)} item(s)</span>
                    {reorderingCategory === category ? <span className="text-xs uppercase tracking-[0.2em] text-amber-100/70">Saving order...</span> : null}
                  </div>

                  <div className="mt-4 space-y-4">
                    {categoryItems.map((item, index) => (
                      <article key={item.id} className="flex flex-col gap-5 rounded-3xl border border-white/8 bg-[#0c0c0f]/80 p-4 md:flex-row md:items-start">
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-1 md:w-[180px] lg:w-[220px] shrink-0">
                          <img src={item.desktopImage} alt={item.titleText || item.categoryLabel} className="h-24 w-full rounded-2xl object-cover sm:h-28" />
                          <img src={item.mobileImage} alt={item.titleText || item.categoryLabel} className="h-24 w-full rounded-2xl object-cover sm:h-28" />
                        </div>

                        <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300">#{item.id}</span>
                                <span className={`rounded-full border px-3 py-1 text-xs font-medium ${toneForStatus(item.status)}`}>{item.status ? 'Visible' : 'Hidden'}</span>
                                <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400">Sort {item.sortOrder}</span>
                              </div>
                              <h3 className="mt-3 text-lg font-semibold text-white">{item.titleText || 'Visual asset without title'}</h3>
                              <p className="mt-2 text-xs uppercase tracking-[0.2em] text-zinc-500">Updated {formatDateTime(item.updatedAt)}</p>
                            </div>

                            <div className="flex flex-wrap gap-2 shrink-0">
                              <button type="button" onClick={() => handleMove(item, 'up')} disabled={index === 0 || reorderingCategory === item.category} className="rounded-2xl border border-white/10 bg-white/5 p-2 text-zinc-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40" title="Move up">
                                <ArrowUp size={16} />
                              </button>
                              <button type="button" onClick={() => handleMove(item, 'down')} disabled={index === categoryItems.length - 1 || reorderingCategory === item.category} className="rounded-2xl border border-white/10 bg-white/5 p-2 text-zinc-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40" title="Move down">
                                <ArrowDown size={16} />
                              </button>
                              <button type="button" onClick={() => handleToggleVisibility(item)} className="rounded-2xl border border-white/10 bg-white/5 p-2 text-zinc-300 transition hover:text-white" title={item.status ? 'Hide item' : 'Show item'}>
                                {item.status ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                              <button type="button" onClick={() => handleEdit(item)} className="rounded-2xl border border-white/10 bg-white/5 p-2 text-zinc-300 transition hover:text-white" title="Edit item">
                                <PencilLine size={16} />
                              </button>
                              <button type="button" onClick={() => handleDelete(item.id)} disabled={deletingId === item.id} className="rounded-2xl border border-rose-400/15 bg-rose-500/10 p-2 text-rose-200 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40" title="Delete item">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-3 lg:grid-cols-3">
                            <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                              <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Category</p>
                              <p className="mt-1.5 text-sm text-zinc-200">{item.category}</p>
                            </div>
                            <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                              <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">CTA Label</p>
                              <p className="mt-1.5 text-sm text-zinc-200">{item.ctaLabelText || 'Not provided'}</p>
                            </div>
                            <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                              <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">CTA URL</p>
                              <p className="mt-1.5 break-all text-sm text-zinc-200">{item.ctaUrl || 'Not provided'}</p>
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
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
          className={`panel-surface panel-border panel-shadow absolute right-0 top-0 h-full w-full max-w-full sm:max-w-md lg:max-w-xl overflow-y-auto border-l border-white/10 p-5 transition-transform duration-300 ease-out ${
            isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Editor</p>
              <h2 className="mt-2 text-xl font-semibold text-white">
                {mode === 'edit' ? 'Update Media Item' : 'Create Media Item'}
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
                  <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Selected item</p>
                  <h3 className="mt-2 truncate text-base font-semibold text-white">
                    {selectedItem.titleText || 'Visual asset without title'}
                  </h3>
                  <p className="mt-2 text-xs text-zinc-500">
                    #{selectedItem.id} · {selectedItem.categoryLabel || selectedItem.category}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`rounded-full border px-3 py-1 text-xs font-medium ${toneForStatus(selectedItem.status)}`}>
                    {selectedItem.status ? 'Visible' : 'Hidden'}
                  </span>
                  <span className={`rounded-full border px-3 py-1 text-xs font-medium ${toneForBehavior(selectedItem.behavior)}`}>
                    {selectedItem.behavior === 'single' ? 'Single banner' : 'Collection'}
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-4">
              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.26em] text-zinc-500">Category</span>
                <input list="media-category-options" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} placeholder="home_hero" className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-200/25" />
              </label>

              <datalist id="media-category-options">
                {categoryOptions.map((option) => (
                  <option key={option.key} value={option.key}>{option.label}</option>
                ))}
              </datalist>

              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-xs">
                <span className="text-zinc-400">Behavior</span>
                <span className={`rounded-full border px-3 py-1 font-medium ${toneForBehavior(selectedCategoryMeta?.behavior)}`}>
                  {selectedCategoryMeta?.behavior === 'single' ? 'Single banner' : 'Ordered collection'}
                </span>
                <span className="text-zinc-500">{selectedCategoryMeta?.label || 'Custom category'}</span>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.26em] text-zinc-500">Title EN</span>
                <input value={form.title_en} onChange={(event) => setForm((current) => ({ ...current, title_en: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-200/25" />
              </label>
              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.26em] text-zinc-500">Title AR</span>
                <input value={form.title_ar} onChange={(event) => setForm((current) => ({ ...current, title_ar: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-200/25" />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <ImageUploadField label="Desktop Image" value={form.desktop_image} uploading={uploading.desktop} onFileSelect={(file) => handleUpload('desktop', file)} onClear={() => setForm((current) => ({ ...current, desktop_image: '' }))} hint="Upload the desktop version for widescreen sections." />
              <ImageUploadField label="Mobile Image" value={form.mobile_image} uploading={uploading.mobile} onFileSelect={(file) => handleUpload('mobile', file)} onClear={() => setForm((current) => ({ ...current, mobile_image: '' }))} hint="Upload the mobile version for smaller breakpoints." />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.26em] text-zinc-500">CTA Label EN</span>
                <input value={form.cta_label_en} onChange={(event) => setForm((current) => ({ ...current, cta_label_en: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-200/25" />
              </label>
              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.26em] text-zinc-500">CTA Label AR</span>
                <input value={form.cta_label_ar} onChange={(event) => setForm((current) => ({ ...current, cta_label_ar: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-200/25" />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <label className="space-y-2 sm:col-span-2 xl:col-span-1">
                <span className="text-xs uppercase tracking-[0.26em] text-zinc-500">CTA URL</span>
                <input value={form.cta_url} onChange={(event) => setForm((current) => ({ ...current, cta_url: event.target.value }))} placeholder="/about or https://..." className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-200/25" />
              </label>
              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.26em] text-zinc-500">Sort Order</span>
                <input value={form.sort_order} onChange={(event) => setForm((current) => ({ ...current, sort_order: event.target.value }))} inputMode="numeric" className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-200/25" />
              </label>
              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.26em] text-zinc-500">Status</span>
                <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-200/25">
                  <option value="1">Visible</option>
                  <option value="0">Hidden</option>
                </select>
              </label>
            </div>

            {error ? (
              <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:flex-wrap sm:items-center">
              <button type="submit" disabled={saving || uploading.desktop || uploading.mobile} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-amber-300/90 to-amber-100 px-5 py-3 text-sm font-medium text-black transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
                <Save size={16} />
                {saving ? 'Saving...' : uploading.desktop || uploading.mobile ? 'Uploading...' : mode === 'edit' ? 'Save Changes' : 'Create Item'}
              </button>
            </div>
          </form>
        </aside>
      </div>

    
    </div>
  )
}
