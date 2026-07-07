import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowUpRight,
  CircleDollarSign,
  RefreshCcw,
  ScanLine,
  Ticket,
  Users,
} from 'lucide-react'
import StatCard from '../components/ui/StatCard'
import { useAuth } from '../lib/auth'
import { apiRequest, ApiError } from '../lib/api'
import { formatCurrency, formatDateTime, formatNumber } from '../lib/format'

const spotlightCards = [
  {
    title: 'Orders & Payments',
    description: 'Next module to wire with reporting endpoints and refund controls.',
    icon: CircleDollarSign,
  },
  {
    title: 'Events & Tickets',
    description: 'Catalog operations, ticket inventory, and featured event control.',
    icon: Ticket,
  },
  {
    title: 'Activity & Scans',
    description: 'Real-time scanner logs and entry monitoring for live operations.',
    icon: ScanLine,
  },
]

function LoadingBlock() {
  return (
    <div className="panel-surface panel-border panel-shadow rounded-[2rem] p-6">
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-28 rounded-full bg-white/8" />
        <div className="h-8 w-72 rounded-full bg-white/8" />
        <div className="h-20 rounded-3xl bg-white/6" />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { token, logout } = useAuth()
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const loadOverview = async ({ silent = false } = {}) => {
    if (!token) {
      return
    }

    if (silent) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setError('')

    try {
      const response = await apiRequest('/api/admin/reports/overview', {
        token,
      })

      setOverview(response.data)
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        logout()
        return
      }

      setError(requestError.message || 'Failed to load dashboard overview.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadOverview()
  }, [token])

  const statCards = useMemo(() => {
    if (!overview) {
      return []
    }

    return [
      {
        eyebrow: 'Gross',
        title: 'Successful Revenue',
        value: formatCurrency(overview.payments?.successfulAmount),
        delta: `${formatNumber(overview.payments?.success)} paid`,
      },
      {
        eyebrow: 'Orders',
        title: 'Total Orders',
        value: formatNumber(overview.orders?.total),
        delta: `${formatNumber(overview.orders?.pending)} pending`,
      },
      {
        eyebrow: 'Attendance',
        title: 'Tickets Used',
        value: formatNumber(overview.tickets?.used),
        delta: `${formatNumber(overview.tickets?.valid)} valid`,
      },
      // {
      //   eyebrow: 'Payments',
      //   title: 'Refunded Payments',
      //   value: formatNumber(overview.payments?.refunded),
      //   delta: `${formatCurrency(overview.payments?.pendingAmount)} pending`,
      // },
    ]
  }, [overview])

  const orderMix = useMemo(() => {
    if (!overview?.orders) {
      return []
    }

    return [
      // { label: 'Pending', value: overview.orders.pending },
      { label: 'Paid', value: overview.orders.paid },
      { label: 'Completed', value: overview.orders.completed },
      { label: 'Cancelled', value: overview.orders.cancelled },
    ]
  }, [overview])

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingBlock />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <LoadingBlock key={index} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="panel-surface panel-border panel-shadow rounded-[2rem] p-6 lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            
            <h1 className="mt-4 text-3xl font-semibold leading-tight text-white lg:text-4xl">
              NukhbaGlobal administration.
            </h1>
          
          </div>
         
        </div>
      </section>

      {error && (
        <section className="rounded-[2rem] border border-rose-400/20 bg-rose-500/8 px-5 py-4 text-rose-100">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Overview loading failed</p>
              <p className="mt-1 text-sm text-rose-100/85">{error}</p>
            </div>
          </div>
        </section>
      )}

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {statCards.map((card) => (
          <StatCard
            key={card.title}
            eyebrow={card.eyebrow}
            title={card.title}
            value={card.value}
            delta={card.delta}
          />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="panel-surface panel-border panel-shadow rounded-[2rem] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Recent Orders</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">Latest activity feed</h2>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/8 bg-white/4 px-4 py-2 text-sm text-zinc-200 transition hover:bg-white/8"
            >
              Orders module next
              <ArrowUpRight size={16} />
            </button>
          </div>
          <div className="mt-6 grid gap-4">
            {overview?.recentOrders?.map((order) => {
              const statusTone =
                order.orderStatus === 'paid' || order.orderStatus === 'completed'
                  ? 'text-emerald-200 bg-emerald-500/10 border-emerald-400/15'
                  : order.orderStatus === 'cancelled'
                    ? 'text-rose-200 bg-rose-500/10 border-rose-400/15'
                    : 'text-amber-100 bg-amber-500/10 border-amber-400/15'

              return (
                <div
                  key={order.id}
                  className="rounded-3xl border border-white/8 bg-white/4 p-5 transition hover:bg-white/6"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">{order.orderNumber}</p>
                      <h3 className="mt-2 text-lg font-medium text-white">{order.customerName}</h3>
                      <p className="mt-1 text-sm text-zinc-400">
                        {formatCurrency(order.totalAmount)} · {formatDateTime(order.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusTone}`}>
                        Order: {order.orderStatus}
                      </span>
                      <span className="rounded-full border border-white/8 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-300">
                        Payment: {order.paymentStatus || 'n/a'}
                      </span>
                      <span className="rounded-full border border-white/8 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-300">
                        {order.gatewayName || 'No gateway'}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}

            {!overview?.recentOrders?.length && (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/3 p-6 text-sm text-zinc-500">
                No recent orders were returned by the API.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="panel-surface panel-border panel-shadow rounded-[2rem] p-6">
            <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Order Mix</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">Current status distribution</h2>
            <ul className="mt-5 space-y-4 text-sm leading-6 text-zinc-400">
              {orderMix.map((item) => (
                <li
                  key={item.label}
                  className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/4 px-4 py-3"
                >
                  <span>{item.label}</span>
                  <span className="font-medium text-white">{formatNumber(item.value)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="panel-surface panel-border panel-shadow rounded-[2rem] p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white/5 p-3 text-zinc-200">
                <Users size={20} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Payments Snapshot</p>
                <h3 className="mt-1 text-lg font-semibold text-white">Current finance summary</h3>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-zinc-400">
              Success: {formatCurrency(overview?.payments?.successfulAmount)} · Pending: {formatCurrency(overview?.payments?.pendingAmount)} · Failed: {formatNumber(overview?.payments?.failed)}
            </p>
            <div className="mt-5 grid gap-3">
              {spotlightCards.map((card) => {
                const Icon = card.icon

                return (
                  <div key={card.title} className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
                    <div className="rounded-2xl bg-amber-200/10 p-2 text-amber-100">
                      <Icon size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-white">{card.title}</h4>
                      <p className="mt-1 text-xs leading-5 text-zinc-500">{card.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
