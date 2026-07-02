import { useEffect, useMemo, useState } from 'react'
import { Eye, Filter, RefreshCcw, RotateCcw, Search, XCircle } from 'lucide-react'
import { apiRequest, ApiError } from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatCurrency, formatDateTime, formatNumber } from '../lib/format'
import StatCard from '../components/ui/StatCard'

const INITIAL_FILTERS = {
  q: '',
  status: '',
  payment_status: '',
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

function toneForStatus(status) {
  if (status === 'paid' || status === 'completed' || status === 'success') {
    return 'border-emerald-400/15 bg-emerald-500/10 text-emerald-200'
  }

  if (status === 'cancelled' || status === 'failed' || status === 'refunded') {
    return 'border-rose-400/15 bg-rose-500/10 text-rose-200'
  }

  return 'border-amber-400/15 bg-amber-500/10 text-amber-100'
}

export default function OrdersPage() {
  const { token, logout } = useAuth()
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [ordersPayload, setOrdersPayload] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [selectedOrderId, setSelectedOrderId] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [submittingAction, setSubmittingAction] = useState('')
  const [error, setError] = useState('')

  const loadOrders = async ({ silent = false, nextPage = page } = {}) => {
    if (!token) {
      return
    }

    if (!silent) {
      setLoading(true)
    }

    setError('')

    try {
      const response = await apiRequest(`/api/admin/orders?${buildQueryString(filters, nextPage)}`, {
        token,
      })

      setOrdersPayload(response.data)
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        logout()
        return
      }

      setError(requestError.message || 'Failed to load orders.')
    } finally {
      setLoading(false)
    }
  }

  const loadOrderDetails = async (orderId) => {
    if (!token || !orderId) {
      return
    }

    setDetailsLoading(true)

    try {
      const response = await apiRequest(`/api/admin/orders/${orderId}`, {
        token,
      })
      setSelectedOrder(response.data)
      setSelectedOrderId(orderId)
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        logout()
        return
      }

      setError(requestError.message || 'Failed to load order details.')
    } finally {
      setDetailsLoading(false)
    }
  }

  useEffect(() => {
    loadOrders({ nextPage: 1 })
    setPage(1)
  }, [token])

  const handleFilterChange = (field) => (event) => {
    setFilters((current) => ({
      ...current,
      [field]: event.target.value,
    }))
  }

  const handleApplyFilters = async (event) => {
    event.preventDefault()
    setSelectedOrder(null)
    setSelectedOrderId(null)
    setPage(1)
    await loadOrders({ nextPage: 1 })
  }

  const handleResetFilters = async () => {
    setFilters(INITIAL_FILTERS)
    setSelectedOrder(null)
    setSelectedOrderId(null)
    setPage(1)
    setLoading(true)

    try {
      const response = await apiRequest('/api/admin/orders?page=1&per_page=10', {
        token,
      })
      setOrdersPayload(response.data)
      setError('')
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        logout()
        return
      }

      setError(requestError.message || 'Failed to reset filters.')
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (action) => {
    if (!selectedOrder?.order?.id || !token) {
      return
    }

    const reason = window.prompt(`Optional ${action} reason:`) ?? ''
    setSubmittingAction(action)

    try {
      await apiRequest(`/api/admin/orders/${selectedOrder.order.id}/${action}`, {
        method: 'POST',
        token,
        body: reason.trim() ? { reason: reason.trim() } : {},
      })

      await Promise.all([
        loadOrders({ silent: true, nextPage: page }),
        loadOrderDetails(selectedOrder.order.id),
      ])
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        logout()
        return
      }

      setError(requestError.message || `Failed to ${action} order.`)
    } finally {
      setSubmittingAction('')
    }
  }

  const summaryCards = useMemo(() => {
    const items = ordersPayload?.items ?? []

    const totalAmount = items.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0)
    const pendingCount = items.filter((item) => item.orderStatus === 'pending').length
    const paidCount = items.filter((item) => item.orderStatus === 'paid' || item.orderStatus === 'completed').length
    const refundedCount = items.filter((item) => item.payment?.status === 'refunded').length

    return [
      {
        eyebrow: 'Visible',
        title: 'Orders In View',
        value: formatNumber(items.length),
        delta: `${formatNumber(ordersPayload?.pagination?.total || 0)} total`,
      },
      {
        eyebrow: 'Volume',
        title: 'Visible GMV',
        value: formatCurrency(totalAmount),
        delta: `${formatNumber(paidCount)} paid/completed`,
      },
      {
        eyebrow: 'Attention',
        title: 'Pending Orders',
        value: formatNumber(pendingCount),
        delta: 'Need follow-up',
      },
      {
        eyebrow: 'Recovery',
        title: 'Refunded Payments',
        value: formatNumber(refundedCount),
        delta: 'Current result set',
      },
    ]
  }, [ordersPayload])

  const pagination = ordersPayload?.pagination

  return (
    <div className="space-y-6">
      <section className="panel-surface panel-border panel-shadow rounded-[2rem] p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.35em] text-amber-100/55">Orders Module</p>
            <h1 className="mt-3 text-3xl font-semibold text-white">Orders, payments, refunds, and detail review.</h1>
            <p className="mt-3 text-sm leading-7 text-zinc-400">
              This module is wired to backend reporting endpoints with filters, live order details, and guarded admin actions.
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadOrders({ silent: true, nextPage: page })}
            className="inline-flex items-center gap-2 self-start rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-zinc-200 transition hover:bg-white/8"
          >
            <RefreshCcw size={16} />
            Refresh list
          </button>
        </div>
      </section>

      {error && (
        <section className="rounded-[2rem] border border-rose-400/20 bg-rose-500/8 px-5 py-4 text-sm text-rose-100">
          {error}
        </section>
      )}

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <StatCard key={card.title} eyebrow={card.eyebrow} title={card.title} value={card.value} delta={card.delta} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <form onSubmit={handleApplyFilters} className="panel-surface panel-border panel-shadow rounded-[2rem] p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <Filter size={16} />
              Filters
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <label className="space-y-2 text-sm text-zinc-300 xl:col-span-3">
                <span>Search</span>
                <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
                  <Search size={16} className="text-zinc-500" />
                  <input
                    value={filters.q}
                    onChange={handleFilterChange('q')}
                    placeholder="Order number, customer, email, phone, gateway id"
                    className="w-full bg-transparent text-white outline-none placeholder:text-zinc-500"
                  />
                </div>
              </label>
              <label className="space-y-2 text-sm text-zinc-300">
                <span>Order Status</span>
                <select value={filters.status} onChange={handleFilterChange('status')} className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none">
                  <option value="">All</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="refunded">Refunded</option>
                </select>
              </label>
              <label className="space-y-2 text-sm text-zinc-300">
                <span>Payment Status</span>
                <select value={filters.payment_status} onChange={handleFilterChange('payment_status')} className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none">
                  <option value="">All</option>
                  <option value="pending">Pending</option>
                  <option value="success">Success</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                </select>
              </label>
              <label className="space-y-2 text-sm text-zinc-300">
                <span>Date From</span>
                <input type="date" value={filters.date_from} onChange={handleFilterChange('date_from')} className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none" />
              </label>
              <label className="space-y-2 text-sm text-zinc-300">
                <span>Date To</span>
                <input type="date" value={filters.date_to} onChange={handleFilterChange('date_to')} className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none" />
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

          <div className="panel-surface panel-border panel-shadow overflow-hidden rounded-[2rem]">
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Orders Table</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Filtered results</h2>
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
                    <th className="px-5 py-3">Order</th>
                    <th className="px-5 py-3">Customer</th>
                    <th className="px-5 py-3">Amount</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Counts</th>
                    <th className="px-5 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="px-5 py-10 text-center text-sm text-zinc-500">
                        Loading orders...
                      </td>
                    </tr>
                  ) : ordersPayload?.items?.length ? (
                    ordersPayload.items.map((order) => (
                      <tr
                        key={order.id}
                        className={`border-t border-white/6 text-sm text-zinc-300 ${
                          selectedOrderId === order.id ? 'bg-white/4' : ''
                        }`}
                      >
                        <td className="px-5 py-4 align-top">
                          <p className="font-medium text-white">{order.orderNumber}</p>
                          <p className="mt-1 text-xs text-zinc-500">{formatDateTime(order.createdAt)}</p>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <p className="font-medium text-white">{order.customerName}</p>
                          <p className="mt-1 text-xs text-zinc-500">{order.customerEmail || order.customerPhone}</p>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <p className="font-medium text-white">{formatCurrency(order.totalAmount)}</p>
                          <p className="mt-1 text-xs text-zinc-500">Donation {formatCurrency(order.donationAmount)}</p>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <div className="flex flex-wrap gap-2">
                            <span className={`rounded-full border px-3 py-1 text-xs font-medium ${toneForStatus(order.orderStatus)}`}>
                              {order.orderStatus}
                            </span>
                            <span className={`rounded-full border px-3 py-1 text-xs font-medium ${toneForStatus(order.payment?.status || 'pending')}`}>
                              {order.payment?.status || 'n/a'}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 align-top text-xs text-zinc-400">
                          <p>{formatNumber(order.itemsCount)} items</p>
                          <p className="mt-1">{formatNumber(order.quantityCount)} qty</p>
                          <p className="mt-1">{formatNumber(order.issuedTicketsCount)} issued</p>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <button
                            type="button"
                            onClick={() => loadOrderDetails(order.id)}
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
                      <td colSpan="6" className="px-5 py-10 text-center text-sm text-zinc-500">
                        No orders found for the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {pagination && (
              <div className="flex items-center justify-between px-5 py-4 text-sm text-zinc-400">
                <p>{formatNumber(pagination.total)} total orders</p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={pagination.page <= 1}
                    onClick={async () => {
                      const nextPage = pagination.page - 1
                      setPage(nextPage)
                      await loadOrders({ nextPage })
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
                      await loadOrders({ nextPage })
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
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Order Drawer</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Details & Actions</h2>
            </div>
            {selectedOrder && (
              <button type="button" onClick={() => setSelectedOrder(null)} className="rounded-2xl border border-white/8 bg-white/4 p-2 text-zinc-300">
                <XCircle size={16} />
              </button>
            )}
          </div>

          {!selectedOrder && !detailsLoading && (
            <div className="mt-6 rounded-3xl border border-dashed border-white/10 bg-white/3 p-6 text-sm leading-6 text-zinc-500">
              Select an order from the table to inspect payment details, ticket issuance, and refund or cancel actions.
            </div>
          )}

          {detailsLoading && (
            <div className="mt-6 rounded-3xl border border-white/8 bg-white/4 p-6 text-sm text-zinc-400">
              Loading selected order...
            </div>
          )}

          {selectedOrder && (
            <div className="mt-6 space-y-5">
              <div className="rounded-3xl border border-white/8 bg-white/4 p-5">
                <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">{selectedOrder.order.orderNumber}</p>
                <h3 className="mt-2 text-lg font-semibold text-white">{selectedOrder.order.customer.name}</h3>
                <p className="mt-1 text-sm text-zinc-400">{selectedOrder.order.customer.email || selectedOrder.order.customer.phone}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className={`rounded-full border px-3 py-1 text-xs font-medium ${toneForStatus(selectedOrder.order.status)}`}>
                    {selectedOrder.order.status}
                  </span>
                  <span className={`rounded-full border px-3 py-1 text-xs font-medium ${toneForStatus(selectedOrder.payment.status || 'pending')}`}>
                    {selectedOrder.payment.status || 'n/a'}
                  </span>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl border border-white/8 bg-white/4 p-5">
                  <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Amounts</p>
                  <div className="mt-3 space-y-2 text-sm text-zinc-300">
                    <p>Tickets: <span className="text-white">{formatCurrency(selectedOrder.order.amounts.tickets)}</span></p>
                    <p>Donation: <span className="text-white">{formatCurrency(selectedOrder.order.amounts.donation)}</span></p>
                    <p>Total: <span className="text-white">{formatCurrency(selectedOrder.order.amounts.total)}</span></p>
                  </div>
                </div>
                <div className="rounded-3xl border border-white/8 bg-white/4 p-5">
                  <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Payment</p>
                  <div className="mt-3 space-y-2 text-sm text-zinc-300">
                    <p>Gateway: <span className="text-white">{selectedOrder.payment.gatewayName || 'N/A'}</span></p>
                    <p>Invoice: <span className="text-white">{selectedOrder.payment.invoiceNumber || 'N/A'}</span></p>
                    <p>Paid At: <span className="text-white">{selectedOrder.payment.paidAt ? formatDateTime(selectedOrder.payment.paidAt) : 'N/A'}</span></p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/8 bg-white/4 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Order Items</p>
                  <span className="text-xs text-zinc-500">{formatNumber(selectedOrder.items.length)} rows</span>
                </div>
                <div className="mt-4 space-y-3">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-white/6 bg-black/10 px-4 py-3">
                      <p className="text-sm font-medium text-white">{item.ticketTitleText}</p>
                      <p className="mt-1 text-xs text-zinc-500">{item.event.titleText} · {formatDateTime(item.event.date)}</p>
                      <p className="mt-2 text-xs text-zinc-400">
                        {formatNumber(item.quantity)} x {formatCurrency(item.pricePerItem)} = {formatCurrency(item.lineAmount)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-white/8 bg-white/4 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Issued Tickets</p>
                  <span className="text-xs text-zinc-500">{formatNumber(selectedOrder.issuedTickets.length)} tickets</span>
                </div>
                <div className="mt-4 space-y-3">
                  {selectedOrder.issuedTickets.length ? selectedOrder.issuedTickets.map((ticket) => (
                    <div key={ticket.id} className="rounded-2xl border border-white/6 bg-black/10 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-white">{ticket.ticketCode}</p>
                        <span className={`rounded-full border px-3 py-1 text-xs font-medium ${toneForStatus(ticket.status)}`}>
                          {ticket.status}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-zinc-500">
                        Passenger: {ticket.passengerName || 'Unassigned'}
                      </p>
                    </div>
                  )) : (
                    <p className="text-sm text-zinc-500">No issued tickets for this order.</p>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-white/8 bg-white/4 p-5">
                <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Admin Actions</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => handleAction('cancel')}
                    disabled={submittingAction !== ''}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <XCircle size={16} />
                    {submittingAction === 'cancel' ? 'Cancelling...' : 'Cancel order'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAction('refund')}
                    disabled={submittingAction !== ''}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RotateCcw size={16} />
                    {submittingAction === 'refund' ? 'Refunding...' : 'Refund order'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </aside>
      </section>
    </div>
  )
}
