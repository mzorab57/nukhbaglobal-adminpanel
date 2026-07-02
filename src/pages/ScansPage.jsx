import { useEffect, useMemo, useState } from 'react'
import { Eye, Filter, RefreshCcw, Search, ShieldCheck, Smartphone, Ticket, XCircle } from 'lucide-react'
import StatCard from '../components/ui/StatCard'
import { ApiError, apiRequest } from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatDateTime, formatNumber } from '../lib/format'

const INITIAL_FILTERS = {
  q: '',
  scanner_user_id: '',
  date_from: '',
  date_to: '',
}

function buildQueryString(filters, page) {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('per_page', '10')

  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      params.set(key, value)
    }
  })

  return params.toString()
}

function toneForTicketStatus(status) {
  if (status === 'used') {
    return 'border-emerald-400/15 bg-emerald-500/10 text-emerald-200'
  }

  if (status === 'cancelled' || status === 'refunded') {
    return 'border-rose-400/15 bg-rose-500/10 text-rose-200'
  }

  return 'border-amber-400/15 bg-amber-500/10 text-amber-100'
}

function uniqueScannersFromLogs(logs) {
  const scannerMap = new Map()

  logs.forEach((log) => {
    const scannerId = log?.scanner?.id

    if (scannerId && !scannerMap.has(scannerId)) {
      scannerMap.set(scannerId, {
        id: scannerId,
        name: log.scanner.name || `Scanner #${scannerId}`,
      })
    }
  })

  return Array.from(scannerMap.values())
}

export default function ScansPage() {
  const { token, logout } = useAuth()
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [overview, setOverview] = useState(null)
  const [logsPayload, setLogsPayload] = useState(null)
  const [selectedLog, setSelectedLog] = useState(null)
  const [selectedLogId, setSelectedLogId] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const handleRequestError = (requestError, fallbackMessage) => {
    if (requestError instanceof ApiError && requestError.status === 401) {
      logout()
      return true
    }

    setError(requestError.message || fallbackMessage)
    return false
  }

  const loadScans = async ({ silent = false, nextPage = page } = {}) => {
    if (!token) {
      return
    }

    if (!silent) {
      setLoading(true)
    } else {
      setRefreshing(true)
    }

    setError('')

    try {
      const [overviewResponse, logsResponse] = await Promise.all([
        apiRequest('/api/admin/reports/scans/overview', {
          token,
        }),
        apiRequest(`/api/admin/reports/scans/logs?${buildQueryString(filters, nextPage)}`, {
          token,
        }),
      ])

      setOverview(overviewResponse.data)
      setLogsPayload(logsResponse.data)

      if (selectedLogId) {
        const refreshedSelected = (logsResponse.data?.items ?? []).find((item) => item.id === selectedLogId)
        if (refreshedSelected) {
          setSelectedLog(refreshedSelected)
        }
      }
    } catch (requestError) {
      handleRequestError(requestError, 'Failed to load scan reports.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadScans({ nextPage: 1 })
    setPage(1)
  }, [token])

  const scannerOptions = useMemo(() => {
    const recentScans = overview?.recentScans ?? []
    const logScanners = uniqueScannersFromLogs(logsPayload?.items ?? [])
    const recentScanners = uniqueScannersFromLogs(recentScans)
    const merged = new Map()

    ;[...recentScanners, ...logScanners].forEach((scanner) => {
      if (!merged.has(scanner.id)) {
        merged.set(scanner.id, scanner)
      }
    })

    return Array.from(merged.values())
  }, [overview, logsPayload])

  const summaryCards = useMemo(() => {
    const summary = overview?.summary

    return [
      {
        eyebrow: 'Traffic',
        title: 'Total Scans',
        value: formatNumber(summary?.totalScans || 0),
        delta: `${formatNumber(summary?.scansToday || 0)} today`,
      },
      {
        eyebrow: 'Team',
        title: 'Unique Scanners',
        value: formatNumber(summary?.uniqueScanners || 0),
        delta: `${formatNumber(summary?.scansThisWeek || 0)} this week`,
      },
      {
        eyebrow: 'Access',
        title: 'Unique Tickets Scanned',
        value: formatNumber(summary?.uniqueTicketsScanned || 0),
        delta: 'Distinct admissions',
      },
    ]
  }, [overview])

  const handleFilterChange = (field) => (event) => {
    setFilters((current) => ({
      ...current,
      [field]: event.target.value,
    }))
  }

  const handleApplyFilters = async (event) => {
    event.preventDefault()
    setPage(1)
    setSelectedLog(null)
    setSelectedLogId(null)
    await loadScans({ nextPage: 1 })
  }

  const handleResetFilters = async () => {
    const nextFilters = { ...INITIAL_FILTERS }
    setFilters(nextFilters)
    setPage(1)
    setSelectedLog(null)
    setSelectedLogId(null)
    setLoading(true)
    setError('')

    try {
      const [overviewResponse, logsResponse] = await Promise.all([
        apiRequest('/api/admin/reports/scans/overview', { token }),
        apiRequest('/api/admin/reports/scans/logs?page=1&per_page=10', { token }),
      ])

      setOverview(overviewResponse.data)
      setLogsPayload(logsResponse.data)
    } catch (requestError) {
      handleRequestError(requestError, 'Failed to reset scan filters.')
    } finally {
      setLoading(false)
    }
  }

  const recentScans = overview?.recentScans ?? []
  const pagination = logsPayload?.pagination

  return (
    <div className="space-y-6">
      <section className="panel-surface panel-border panel-shadow rounded-[2rem] p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.35em] text-amber-100/55">Scan Reports</p>
            <h1 className="mt-3 text-3xl font-semibold text-white">Scanner activity, admissions, and audit visibility.</h1>
            <p className="mt-3 text-sm leading-7 text-zinc-400">
              Review recent admissions, scanner performance, and scan-level metadata from the backend activity log.
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadScans({ silent: true, nextPage: page })}
            className="inline-flex items-center gap-2 self-start rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-zinc-200 transition hover:bg-white/8"
          >
            <RefreshCcw size={16} />
            {refreshing ? 'Refreshing...' : 'Refresh reports'}
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

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <form onSubmit={handleApplyFilters} className="panel-surface panel-border panel-shadow rounded-[2rem] p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <Filter size={16} />
              Filters
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="space-y-2 text-sm text-zinc-300 xl:col-span-2">
                <span>Search</span>
                <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
                  <Search size={16} className="text-zinc-500" />
                  <input
                    value={filters.q}
                    onChange={handleFilterChange('q')}
                    placeholder="Ticket code, order number, customer, scanner"
                    className="w-full bg-transparent text-white outline-none placeholder:text-zinc-500"
                  />
                </div>
              </label>
              <label className="space-y-2 text-sm text-zinc-300">
                <span>Scanner</span>
                <select
                  value={filters.scanner_user_id}
                  onChange={handleFilterChange('scanner_user_id')}
                  className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none"
                >
                  <option value="">All</option>
                  {scannerOptions.map((scanner) => (
                    <option key={scanner.id} value={scanner.id}>
                      {scanner.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm text-zinc-300">
                <span>Date From</span>
                <input
                  type="date"
                  value={filters.date_from}
                  onChange={handleFilterChange('date_from')}
                  className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none"
                />
              </label>
              <label className="space-y-2 text-sm text-zinc-300">
                <span>Date To</span>
                <input
                  type="date"
                  value={filters.date_to}
                  onChange={handleFilterChange('date_to')}
                  className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none"
                />
              </label>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="submit" className="rounded-2xl bg-gradient-to-r from-amber-300 via-amber-200 to-orange-200 px-5 py-3 text-sm font-semibold text-zinc-900">
                Apply filters
              </button>
              <button type="button" onClick={handleResetFilters} className="rounded-2xl border border-white/8 bg-white/4 px-5 py-3 text-sm text-zinc-200">
                Reset
              </button>
            </div>
          </form>

          <section className="panel-surface panel-border panel-shadow rounded-[2rem] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Recent Overview</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Latest admissions</h2>
              </div>
              <span className="text-sm text-zinc-400">{formatNumber(recentScans.length)} recent rows</span>
            </div>
            <div className="mt-5 space-y-3">
              {recentScans.length ? recentScans.map((scan) => (
                <button
                  key={scan.id}
                  type="button"
                  onClick={() => {
                    setSelectedLog(scan)
                    setSelectedLogId(scan.id)
                  }}
                  className="w-full rounded-3xl border border-white/8 bg-white/4 p-4 text-left transition hover:bg-white/7"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{scan.ticket.ticketCode || 'Unknown ticket'}</p>
                      <p className="mt-1 text-xs text-zinc-500">{scan.event.titleText || 'Unknown event'} · {scan.order.orderNumber || 'No order'}</p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${toneForTicketStatus(scan.ticket.ticketStatus)}`}>
                      {scan.ticket.ticketStatus || 'n/a'}
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-zinc-400">
                    {scan.scanner.name || 'Unknown scanner'} · {formatDateTime(scan.createdAt)}
                  </p>
                </button>
              )) : (
                <div className="rounded-3xl border border-dashed border-white/10 bg-white/3 p-5 text-sm text-zinc-500">
                  No recent scan activity is available yet.
                </div>
              )}
            </div>
          </section>

          <div className="panel-surface panel-border panel-shadow overflow-hidden rounded-[2rem]">
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Scan Log Table</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Filtered activity rows</h2>
              </div>
              {pagination && (
                <p className="text-sm text-zinc-400">
                  Page {pagination.page} of {pagination.totalPages}
                </p>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-[0.25em] text-zinc-500">
                    <th className="px-5 py-3">Scan</th>
                    <th className="px-5 py-3">Scanner</th>
                    <th className="px-5 py-3">Event</th>
                    <th className="px-5 py-3">Ticket</th>
                    <th className="px-5 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="px-5 py-10 text-center text-sm text-zinc-500">
                        Loading scan logs...
                      </td>
                    </tr>
                  ) : logsPayload?.items?.length ? (
                    logsPayload.items.map((log) => (
                      <tr
                        key={log.id}
                        className={`border-t border-white/6 text-sm text-zinc-300 ${
                          selectedLogId === log.id ? 'bg-white/4' : ''
                        }`}
                      >
                        <td className="px-5 py-4 align-top">
                          <p className="font-medium text-white">#{log.id}</p>
                          <p className="mt-1 text-xs text-zinc-500">{formatDateTime(log.createdAt)}</p>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <p className="font-medium text-white">{log.scanner.name || 'Unknown scanner'}</p>
                          <p className="mt-1 text-xs text-zinc-500">{log.scanner.email || log.scanner.role || 'N/A'}</p>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <p className="font-medium text-white">{log.event.titleText || 'Unknown event'}</p>
                          <p className="mt-1 text-xs text-zinc-500">{log.order.orderNumber || 'No order link'}</p>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <p className="font-medium text-white">{log.ticket.ticketCode || 'No code'}</p>
                          <div className="mt-2">
                            <span className={`rounded-full border px-3 py-1 text-xs font-medium ${toneForTicketStatus(log.ticket.ticketStatus)}`}>
                              {log.ticket.ticketStatus || 'n/a'}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLog(log)
                              setSelectedLogId(log.id)
                            }}
                            className="inline-flex items-center gap-2 rounded-2xl border border-white/8 bg-white/4 px-4 py-2 text-xs font-medium text-zinc-200 transition hover:bg-white/8"
                          >
                            <Eye size={14} />
                            Details
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-5 py-10 text-center text-sm text-zinc-500">
                        No scan logs found for the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {pagination && (
              <div className="flex items-center justify-between px-5 py-4 text-sm text-zinc-400">
                <p>{formatNumber(pagination.total)} total scan logs</p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={pagination.page <= 1}
                    onClick={async () => {
                      const nextPage = pagination.page - 1
                      setPage(nextPage)
                      await loadScans({ nextPage })
                    }}
                    className="rounded-2xl border border-white/8 bg-white/4 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={async () => {
                      const nextPage = pagination.page + 1
                      setPage(nextPage)
                      await loadScans({ nextPage })
                    }}
                    className="rounded-2xl border border-white/8 bg-white/4 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <aside className="panel-surface panel-border panel-shadow rounded-[2rem] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Scan Drawer</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Activity details</h2>
            </div>
            {selectedLog && (
              <button type="button" onClick={() => setSelectedLog(null)} className="rounded-2xl border border-white/8 bg-white/4 p-2 text-zinc-300">
                <XCircle size={16} />
              </button>
            )}
          </div>

          {!selectedLog && (
            <div className="mt-6 rounded-3xl border border-dashed border-white/10 bg-white/3 p-6 text-sm leading-6 text-zinc-500">
              Select a scan row to inspect scanner identity, order linkage, ticket metadata, and change payloads captured in the activity log.
            </div>
          )}

          {selectedLog && (
            <div className="mt-6 space-y-5">
              <div className="rounded-3xl border border-white/8 bg-white/4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Ticket Scan</p>
                    <h3 className="mt-2 text-lg font-semibold text-white">{selectedLog.ticket.ticketCode || 'Unknown ticket'}</h3>
                    <p className="mt-1 text-sm text-zinc-400">{selectedLog.ticket.passengerName || 'Passenger not set'}</p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-medium ${toneForTicketStatus(selectedLog.ticket.ticketStatus)}`}>
                    {selectedLog.ticket.ticketStatus || 'n/a'}
                  </span>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl border border-white/8 bg-white/4 p-5">
                  <div className="flex items-center gap-2 text-zinc-200">
                    <ShieldCheck size={16} />
                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Scanner</p>
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-zinc-300">
                    <p>Name: <span className="text-white">{selectedLog.scanner.name || 'N/A'}</span></p>
                    <p>Email: <span className="text-white">{selectedLog.scanner.email || 'N/A'}</span></p>
                    <p>Role: <span className="text-white">{selectedLog.scanner.role || 'N/A'}</span></p>
                  </div>
                </div>
                <div className="rounded-3xl border border-white/8 bg-white/4 p-5">
                  <div className="flex items-center gap-2 text-zinc-200">
                    <Smartphone size={16} />
                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Device Metadata</p>
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-zinc-300">
                    <p>When: <span className="text-white">{formatDateTime(selectedLog.createdAt)}</span></p>
                    <p>IP: <span className="text-white">{selectedLog.ipAddress || 'N/A'}</span></p>
                    <p>User Agent: <span className="text-white break-all">{selectedLog.userAgent || 'N/A'}</span></p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/8 bg-white/4 p-5">
                <div className="flex items-center gap-2 text-zinc-200">
                  <Ticket size={16} />
                  <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Ticket & Order</p>
                </div>
                <div className="mt-4 space-y-3 text-sm text-zinc-300">
                  <p>Event: <span className="text-white">{selectedLog.event.titleText || 'N/A'}</span></p>
                  <p>Event Date: <span className="text-white">{selectedLog.event.date ? formatDateTime(selectedLog.event.date) : 'N/A'}</span></p>
                  <p>Ticket Title: <span className="text-white">{selectedLog.ticket.titleText || 'N/A'}</span></p>
                  <p>Order Number: <span className="text-white">{selectedLog.order.orderNumber || 'N/A'}</span></p>
                  <p>Customer: <span className="text-white">{selectedLog.order.customerName || 'N/A'}</span></p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl border border-white/8 bg-white/4 p-5">
                  <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Old Values</p>
                  <pre className="mt-4 overflow-x-auto rounded-2xl border border-white/6 bg-black/15 p-4 text-xs leading-6 text-zinc-300">
                    {JSON.stringify(selectedLog.changes.oldValues || {}, null, 2)}
                  </pre>
                </div>
                <div className="rounded-3xl border border-white/8 bg-white/4 p-5">
                  <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">New Values</p>
                  <pre className="mt-4 overflow-x-auto rounded-2xl border border-white/6 bg-black/15 p-4 text-xs leading-6 text-zinc-300">
                    {JSON.stringify(selectedLog.changes.newValues || {}, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </aside>
      </section>
    </div>
  )
}
