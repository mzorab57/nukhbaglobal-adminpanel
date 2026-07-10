import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  FileImage,
  FolderKanban,
  Plus,
  Receipt,
  RefreshCcw,
  Save,
  Search,
  Trash2,
  Wallet,
} from 'lucide-react'
import ImageUploadField from '../components/ui/ImageUploadField'
import { ApiError, apiRequest, uploadImage } from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatCurrency, formatDateTime, formatNumber } from '../lib/format'

const INITIAL_FILTERS = {
  q: '',
  event_id: '',
  category: '',
  date_from: '',
  date_to: '',
}

const EMPTY_FORM = {
  event_id: '',
  title: '',
  category: 'operations',
  amount: '',
  receipt_file: '',
  notes: '',
  expense_date: '',
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

function mapExpenseToForm(expense) {
  return {
    event_id: expense.eventId ? String(expense.eventId) : '',
    title: expense.title || '',
    category: expense.category || 'operations',
    amount: expense.amount ? String(expense.amount) : '',
    receipt_file: expense.receiptFile || '',
    notes: expense.notes || '',
    expense_date: expense.expenseDate || '',
  }
}

function StatCard({ eyebrow, title, value, delta }) {
  return (
    <article className="rounded-[1.8rem] border border-white/8 bg-[#111115]/80 p-5">
      <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">{eyebrow}</p>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm text-zinc-400">{title}</p>
      {delta ? <p className="mt-4 text-xs uppercase tracking-[0.24em] text-zinc-500">{delta}</p> : null}
    </article>
  )
}

export default function ExpensesPage() {
  const { token, logout } = useAuth()
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [payload, setPayload] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [mode, setMode] = useState('create')
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingReceipt, setUploadingReceipt] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [error, setError] = useState('')

  const items = payload?.items ?? []
  const summary = payload?.summary ?? {
    count: 0,
    totalAmount: 0,
    byCategory: [],
  }
  const categoryOptions = payload?.categoryOptions ?? []
  const eventOptions = payload?.eventOptions ?? []

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  )

  const topCategory = summary.byCategory?.[0] ?? null

  const handleRequestError = (requestError, fallbackMessage) => {
    if (requestError instanceof ApiError && requestError.status === 401) {
      logout()
      return true
    }

    setError(requestError.message || fallbackMessage)
    return false
  }

  const loadExpenses = async ({ silent = false, nextFilters = filters } = {}) => {
    if (!token) {
      return
    }

    if (!silent) {
      setLoading(true)
    }

    setError('')

    try {
      const query = buildQueryString(nextFilters)
      const path = query ? `/api/admin/expenses?${query}` : '/api/admin/expenses'
      const response = await apiRequest(path, { token })
      setPayload(response.data)
    } catch (requestError) {
      handleRequestError(requestError, 'Failed to load expenses.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadExpenses()
  }, [token, filters.q, filters.event_id, filters.category, filters.date_from, filters.date_to])

  const resetForm = () => {
    setMode('create')
    setSelectedId(null)
    setForm(EMPTY_FORM)
  }

  const handleEdit = (expense) => {
    setMode('edit')
    setSelectedId(expense.id)
    setForm(mapExpenseToForm(expense))
  }

  const handleUploadReceipt = async (file) => {
    if (!token) {
      return
    }

    setUploadingReceipt(true)
    setError('')

    try {
      const uploaded = await uploadImage(token, file, 'expenses')
      setForm((current) => ({
        ...current,
        receipt_file: uploaded?.url || '',
      }))
    } catch (requestError) {
      handleRequestError(requestError, 'Failed to upload receipt image.')
    } finally {
      setUploadingReceipt(false)
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
      const path =
        mode === 'edit' && selectedId
          ? `/api/admin/expenses/${selectedId}/update`
          : '/api/admin/expenses/create'

      await apiRequest(path, {
        method: 'POST',
        token,
        body: {
          event_id: Number(form.event_id),
          title: form.title,
          category: form.category,
          amount: Number(form.amount),
          receipt_file: form.receipt_file || null,
          notes: form.notes || null,
          expense_date: form.expense_date,
        },
      })

      await loadExpenses({ silent: true })
      resetForm()
    } catch (requestError) {
      handleRequestError(requestError, 'Failed to save expense.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (expenseId) => {
    if (!token) {
      return
    }

    const confirmed = window.confirm('Delete this expense record?')
    if (!confirmed) {
      return
    }

    setDeletingId(expenseId)
    setError('')

    try {
      await apiRequest(`/api/admin/expenses/${expenseId}/delete`, {
        method: 'POST',
        token,
      })

      if (selectedId === expenseId) {
        resetForm()
      }

      await loadExpenses({ silent: true })
    } catch (requestError) {
      handleRequestError(requestError, 'Failed to delete expense.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-8 text-zinc-100">
      <section className="panel-surface panel-shadow rounded-[2rem] p-5 sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.35em] text-amber-100/55">Finance</p>
            <h1 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">Expenses Management</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-500">
              Track operational spending per event, keep receipt images in one place, and give the accountant or admin a clean expense register.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadExpenses()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-200 transition hover:border-amber-200/20 hover:text-white sm:w-auto"
          >
            <RefreshCcw size={16} />
            Refresh Expenses
          </button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard eyebrow="Register" title="Expense count" value={formatNumber(summary.count)} delta={`${formatNumber(items.length)} visible`} />
        <StatCard eyebrow="Spend" title="Visible total" value={formatCurrency(summary.totalAmount)} delta={topCategory ? `${topCategory.label} leads` : 'No category yet'} />
        <StatCard eyebrow="Categories" title="Distinct categories" value={formatNumber(categoryOptions.length)} delta={topCategory ? formatCurrency(topCategory.amount) : 'IQD 0'} />
        <StatCard eyebrow="Receipts" title="Uploaded proofs" value={formatNumber(items.filter((item) => item.receiptFile).length)} delta="Images attached" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(320px,0.72fr)_minmax(0,1.28fr)]">
        <div className="panel-surface panel-border panel-shadow rounded-[2rem] p-5 sm:p-6 xl:sticky xl:top-6 xl:self-start">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Editor</p>
              <h2 className="mt-2 text-xl font-semibold text-white">
                {mode === 'edit' ? 'Update Expense' : 'Create Expense'}
              </h2>
            </div>
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-300 transition hover:text-white sm:w-auto"
            >
              <Plus size={15} />
              New
            </button>
          </div>

          {selectedItem ? (
            <div className="mt-6 rounded-3xl border border-white/8 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Selected expense</p>
              <h3 className="mt-2 wrap-break-word text-base font-semibold text-white">{selectedItem.title}</h3>
              <p className="mt-2 text-xs text-zinc-500">
                #{selectedItem.id} · {selectedItem.event?.titleText || 'Unknown event'}
              </p>
            </div>
          ) : null}

          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.26em] text-zinc-500">Event</span>
              <select
                value={form.event_id}
                onChange={(event) => setForm((current) => ({ ...current, event_id: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-200/25"
              >
                <option value="">Select event</option>
                {eventOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.titleText || `Event #${option.id}`} {option.date ? `· ${option.date}` : ''}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.26em] text-zinc-500">Title</span>
                <input
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-200/25"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.26em] text-zinc-500">Category</span>
                <input
                  list="expense-category-options"
                  value={form.category}
                  onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-200/25"
                />
                <datalist id="expense-category-options">
                  {categoryOptions.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </datalist>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.26em] text-zinc-500">Amount</span>
                <input
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-200/25"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.26em] text-zinc-500">Expense Date</span>
                <input
                  type="date"
                  value={form.expense_date}
                  onChange={(event) => setForm((current) => ({ ...current, expense_date: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-200/25"
                />
              </label>
            </div>

            <ImageUploadField
              label="Receipt Image"
              value={form.receipt_file}
              onFileSelect={handleUploadReceipt}
              onClear={() => setForm((current) => ({ ...current, receipt_file: '' }))}
              uploading={uploadingReceipt}
              hint="Upload receipt or invoice screenshot."
            />

            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.26em] text-zinc-500">Notes</span>
              <textarea
                rows={4}
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
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
                disabled={saving || uploadingReceipt}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300/90 to-amber-100 px-5 py-3 text-sm font-medium text-black transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                <Save size={16} />
                {saving ? 'Saving...' : mode === 'edit' ? 'Save Expense' : 'Create Expense'}
              </button>
              {selectedItem ? (
                <p className="wrap-break-word text-xs uppercase tracking-[0.24em] text-zinc-500">
                  Editing #{selectedItem.id} {selectedItem.title}
                </p>
              ) : null}
            </div>
          </form>
        </div>

        <div className="min-w-0 space-y-6">
          <div className="panel-surface panel-border panel-shadow rounded-[2rem] p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Filters</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Browse expense register</h2>
              </div>
              <div className="flex flex-1 flex-col gap-3 lg:max-w-4xl lg:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                  <input
                    value={filters.q}
                    onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
                    placeholder="Search title, event, category, notes"
                    className="w-full rounded-2xl border border-white/10 bg-black/20 py-3 pl-11 pr-4 text-sm text-white outline-none transition focus:border-amber-200/25"
                  />
                </div>
                <select
                  value={filters.event_id}
                  onChange={(event) => setFilters((current) => ({ ...current, event_id: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-200/25 lg:w-auto"
                >
                  <option value="">Any event</option>
                  {eventOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.titleText || `Event #${option.id}`}
                    </option>
                  ))}
                </select>
                <select
                  value={filters.category}
                  onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-200/25 lg:w-auto"
                >
                  <option value="">Any category</option>
                  {categoryOptions.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <input
                type="date"
                value={filters.date_from}
                onChange={(event) => setFilters((current) => ({ ...current, date_from: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-200/25"
              />
              <input
                type="date"
                value={filters.date_to}
                onChange={(event) => setFilters((current) => ({ ...current, date_to: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-200/25"
              />
              <button
                type="button"
                onClick={() => setFilters(INITIAL_FILTERS)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-200 transition hover:text-white"
              >
                <RefreshCcw size={15} />
                Reset Filters
              </button>
            </div>
          </div>

          <div className="panel-surface panel-border panel-shadow rounded-[2rem] p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Register</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Expense entries</h2>
              </div>
              <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400">
                {loading ? 'Loading...' : `${formatNumber(items.length)} expense(s)`}
              </div>
            </div>

            <div className="mt-6 max-h-[70vh] space-y-4 overflow-y-auto pr-1 md:h-[34rem] md:max-h-none">
              {!loading && items.length === 0 ? (
                <div className="rounded-[1.75rem] border border-dashed border-white/10 bg-black/10 px-6 py-12 text-center">
                  <Receipt className="mx-auto text-zinc-500" size={26} />
                  <p className="mt-4 text-sm text-zinc-300">No expense entries match the current filters.</p>
                </div>
              ) : null}

              {items.map((item) => (
                <article key={item.id} className="rounded-[1.6rem] border border-white/8 bg-[#0c0c0f]/80 p-4 sm:p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300">#{item.id}</span>
                        <span className="rounded-full border border-amber-400/15 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-100">
                          {item.category}
                        </span>
                        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300">
                          {formatCurrency(item.amount)}
                        </span>
                      </div>

                      <h3 className="mt-4 wrap-break-word text-lg font-semibold text-white">{item.title}</h3>

                      <div className="mt-3 grid gap-2 text-sm text-zinc-400 sm:grid-cols-2">
                        <p className="flex items-center gap-2"><FolderKanban size={15} /> <span className="wrap-break-word">{item.event?.titleText || 'Unknown event'}</span></p>
                        <p className="flex items-center gap-2"><Wallet size={15} /> <span>{formatCurrency(item.amount)}</span></p>
                        <p className="flex items-center gap-2"><CalendarDays size={15} /> <span>{item.expenseDate}</span></p>
                        <p className="flex items-center gap-2"><Receipt size={15} /> <span>{item.createdByName}</span></p>
                      </div>

                      {item.notes ? (
                        <div className="mt-4 rounded-2xl border border-white/6 bg-black/15 px-4 py-3">
                          <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Notes</p>
                          <p className="mt-2 wrap-break-word text-sm leading-6 text-zinc-300">{item.notes}</p>
                        </div>
                      ) : null}

                      {item.receiptFile ? (
                        <a
                          href={item.receiptFile}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-zinc-200 transition hover:text-white"
                        >
                          <FileImage size={14} />
                          View receipt image
                        </a>
                      ) : null}

                      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                        <span>Created {formatDateTime(item.createdAt)}</span>
                        <span>Updated {formatDateTime(item.updatedAt)}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleEdit(item)}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200 transition hover:text-white sm:w-auto"
                      >
                        <Save size={15} />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        disabled={deletingId === item.id}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-400/15 bg-rose-500/10 px-4 py-2 text-sm text-rose-200 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                      >
                        <Trash2 size={15} />
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
