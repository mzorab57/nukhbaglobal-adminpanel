import { useEffect, useMemo, useState } from 'react'
import { Printer, Receipt, RefreshCcw, ShoppingBag, Ticket, Wallet } from 'lucide-react'
import LocalQrCode from '../components/ui/LocalQrCode'
import StatCard from '../components/ui/StatCard'
import { ApiError, apiRequest } from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatCurrency, formatDateTime, formatNumber } from '../lib/format'
import { openPrintablePassesWindow } from '../lib/printablePasses'

const INITIAL_CUSTOMER_FORM = {
  customer_name: '',
  customer_phone: '',
  customer_email: '',
  customer_address: '',
  donation_amount: '0',
}

export default function OfficeSalesPage() {
  const { token, logout } = useAuth()
  const [events, setEvents] = useState([])
  const [selectedEventId, setSelectedEventId] = useState('')
  const [checkoutFeed, setCheckoutFeed] = useState(null)
  const [customerForm, setCustomerForm] = useState(INITIAL_CUSTOMER_FORM)
  const [quantities, setQuantities] = useState({})
  const [createdSale, setCreatedSale] = useState(null)
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [loadingFeed, setLoadingFeed] = useState(false)
  const [creatingSale, setCreatingSale] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadEvents = async () => {
      setLoadingEvents(true)
      setError('')

      try {
        const response = await apiRequest('/api/catalog/events?upcoming=1&limit=50')
        const items = Array.isArray(response.data?.items) ? response.data.items : []
        setEvents(items)

        if (!selectedEventId && items[0]?.id) {
          setSelectedEventId(String(items[0].id))
        }
      } catch (requestError) {
        setError(requestError.message || 'Failed to load office sale events.')
      } finally {
        setLoadingEvents(false)
      }
    }

    void loadEvents()
  }, [])

  useEffect(() => {
    if (!selectedEventId) {
      setCheckoutFeed(null)
      setQuantities({})
      return
    }

    const loadCheckoutFeed = async () => {
      setLoadingFeed(true)
      setError('')

      try {
        const response = await apiRequest(`/api/catalog/events/${selectedEventId}/checkout`)
        setCheckoutFeed(response.data)

        const nextQuantities = {}
        ;(response.data?.tickets ?? []).forEach((ticket) => {
          nextQuantities[ticket.id] = 0
        })
        setQuantities(nextQuantities)
      } catch (requestError) {
        setError(requestError.message || 'Failed to load checkout feed.')
      } finally {
        setLoadingFeed(false)
      }
    }

    void loadCheckoutFeed()
  }, [selectedEventId])

  const selectedItems = useMemo(
    () =>
      (checkoutFeed?.tickets ?? [])
        .map((ticket) => ({
          ticket,
          quantity: Number(quantities[ticket.id] || 0),
        }))
        .filter((item) => item.quantity > 0),
    [checkoutFeed, quantities],
  )

  const totals = useMemo(() => {
    const ticketsSubtotal = selectedItems.reduce(
      (sum, item) => sum + Number(item.ticket.price || 0) * item.quantity,
      0,
    )
    const donationAmount = Number(customerForm.donation_amount || 0)

    return {
      ticketsSubtotal,
      donationAmount: Number.isNaN(donationAmount) ? 0 : donationAmount,
      total: ticketsSubtotal + (Number.isNaN(donationAmount) ? 0 : donationAmount),
      issuedCount: selectedItems.reduce((sum, item) => sum + item.quantity, 0),
    }
  }, [customerForm.donation_amount, selectedItems])

  const summaryCards = useMemo(
    () => [
      {
        eyebrow: 'Office',
        title: 'Available events',
        value: formatNumber(events.length),
        delta: loadingEvents ? 'Loading...' : 'Live catalog',
      },
      {
        eyebrow: 'Selection',
        title: 'Tickets selected',
        value: formatNumber(totals.issuedCount),
        delta: 'Ready to issue',
      },
      {
        eyebrow: 'Cash',
        title: 'Tickets subtotal',
        value: formatCurrency(totals.ticketsSubtotal),
        delta: `Donation ${formatCurrency(totals.donationAmount)}`,
      },
      {
        eyebrow: 'Checkout',
        title: 'Sale total',
        value: formatCurrency(totals.total),
        delta: 'Cash office payment',
      },
    ],
    [events.length, loadingEvents, totals],
  )

  const updateCustomerField = (field) => (event) => {
    setCustomerForm((current) => ({
      ...current,
      [field]: event.target.value,
    }))
  }

  const handleQuantityChange = (ticketId, nextValue, maxPerUser) => {
    const normalized = Math.max(0, Math.min(maxPerUser || 99, Number(nextValue || 0)))

    setQuantities((current) => ({
      ...current,
      [ticketId]: Number.isNaN(normalized) ? 0 : normalized,
    }))
  }

  const resetSaleForm = () => {
    setCustomerForm(INITIAL_CUSTOMER_FORM)
    setCreatedSale(null)
    setError('')
    setQuantities((current) =>
      Object.fromEntries(Object.keys(current).map((key) => [key, 0])),
    )
  }

  const handleCreateCashSale = async (event) => {
    event.preventDefault()

    if (!token) {
      return
    }

    setCreatingSale(true)
    setError('')

    try {
      const response = await apiRequest('/api/admin/office-sales/create', {
        method: 'POST',
        token,
        body: {
          ...customerForm,
          donation_amount: Number(customerForm.donation_amount || 0),
          items: selectedItems.map((item) => ({
            ticket_id: item.ticket.id,
            quantity: item.quantity,
          })),
        },
      })

      setCreatedSale(response.data)
      setQuantities((current) =>
        Object.fromEntries(Object.keys(current).map((key) => [key, 0])),
      )
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        logout()
        return
      }

      setError(requestError.message || 'Failed to create office cash sale.')
    } finally {
      setCreatingSale(false)
    }
  }

  const handlePrintSale = async (payload = createdSale?.printable) => {
    if (!payload) {
      return
    }

    setPrinting(true)

    try {
      await openPrintablePassesWindow(payload)
    } catch (printError) {
      setError(printError.message || 'Failed to open the printable passes window.')
    } finally {
      setPrinting(false)
    }
  }

  return (
    <div className="space-y-6 text-white">
      <section className="panel-surface  panel-shadow rounded-4xl p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.35em] text-amber-100/55"></p>
            <h1 className="mt-3 text-xl lg:text-2xl font-semibold text-amber-100/70">Office Cash Sales</h1>
           
          </div>
         
        </div>
      </section>

      {error ? (
        <section className="rounded-4xl border border-rose-400/20 bg-rose-500/8 px-5 py-4 text-sm text-rose-100">
          {error}
        </section>
      ) : null}

      {/* <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <StatCard key={card.title} eyebrow={card.eyebrow} title={card.title} value={card.value} delta={card.delta} />
        ))}
      </section> */}

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <form onSubmit={handleCreateCashSale} className="space-y-6">
          <div className="panel-surface panel-border panel-shadow rounded-4xl p-6">
            <div className="flex items-center gap-3">
              <ShoppingBag className="text-amber-100" size={18} />
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Step 1</p>
                <h2 className="mt-1 text-xl font-semibold text-white">Choose event and tickets</h2>
              </div>
            </div>

            <div className="mt-5 space-y-5">
              <label className="space-y-2">
                <span className="text-sm text-zinc-300">Event</span>
                <select
                  value={selectedEventId}
                  onChange={(event) => setSelectedEventId(event.target.value)}
                  className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none"
                >
                  {events.map((eventItem) => (
                    <option key={eventItem.id} value={eventItem.id}>
                      {eventItem.titleText} · {eventItem.date}
                    </option>
                  ))}
                </select>
              </label>

              {checkoutFeed?.event ? (
                <div className="rounded-3xl border border-white/8 bg-black/10 p-5">
                  <p className="text-lg font-semibold text-white">{checkoutFeed.event.titleText}</p>
                  <p className="mt-2 text-sm text-zinc-400">
                    {formatDateTime(checkoutFeed.event.date)} · {formatCurrency(checkoutFeed.summary?.minimumPrice || 0)} minimum
                  </p>
                </div>
              ) : null}

              <div className="space-y-3">
                {(checkoutFeed?.tickets ?? []).map((ticket) => (
                  <div key={ticket.id} className="rounded-3xl border border-white/8 bg-white/4 p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">{ticket.titleText}</p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {ticket.subEventTitleText || 'Main event'} · Remaining {formatNumber(ticket.remainingCount)} · Max {formatNumber(ticket.maxPerUser)}
                        </p>
                        <p className="mt-2 text-sm text-amber-100">{formatCurrency(ticket.price)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs uppercase tracking-[0.18em] text-zinc-500">Quantity</span>
                        <input
                          type="number"
                          min="0"
                          max={ticket.maxPerUser || ticket.remainingCount || 99}
                          value={quantities[ticket.id] ?? 0}
                          onChange={(event) =>
                            handleQuantityChange(ticket.id, event.target.value, Math.min(ticket.maxPerUser || 99, ticket.remainingCount || 99))
                          }
                          className="h-12 w-24 rounded-2xl border border-white/8 bg-black/20 px-4 text-white outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {!loadingFeed && (checkoutFeed?.tickets ?? []).length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-white/10 bg-white/3 p-5 text-sm text-zinc-500">
                    No sellable tickets are currently available for this event.
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="panel-surface panel-border panel-shadow rounded-4xl p-6">
            <div className="flex items-center gap-3">
              <Wallet className="text-amber-100" size={18} />
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Step 2</p>
                <h2 className="mt-1 text-xl font-semibold text-white">Customer and cash details</h2>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm text-zinc-300">Customer Name</span>
                <input value={customerForm.customer_name} onChange={updateCustomerField('customer_name')} className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none" />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-zinc-300">Customer Phone</span>
                <input value={customerForm.customer_phone} onChange={updateCustomerField('customer_phone')} className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none" />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-zinc-300">Customer Email</span>
                <input type="email" value={customerForm.customer_email} onChange={updateCustomerField('customer_email')} className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none" />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-zinc-300">Donation Amount</span>
                <input type="number" min="0" step="1000" value={customerForm.donation_amount} onChange={updateCustomerField('donation_amount')} className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none" />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm text-zinc-300">Address</span>
                <input value={customerForm.customer_address} onChange={updateCustomerField('customer_address')} className="h-12 w-full rounded-2xl border border-white/8 bg-white/4 px-4 text-white outline-none" />
              </label>
            </div>

            <div className="mt-5 rounded-3xl border border-white/8 bg-black/10 p-5">
              <div className="flex items-center justify-between text-sm text-zinc-300">
                <span>Tickets subtotal</span>
                <span className="text-white">{formatCurrency(totals.ticketsSubtotal)}</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm text-zinc-300">
                <span>Donation</span>
                <span className="text-white">{formatCurrency(totals.donationAmount)}</span>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-white/8 pt-4 text-base font-semibold text-white">
                <span>Cash total</span>
                <span>{formatCurrency(totals.total)}</span>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={creatingSale || selectedItems.length === 0}
                className="inline-flex items-center gap-2 rounded-2xl bg-linear-to-r from-amber-300 via-amber-200 to-orange-200 px-5 py-3 text-sm font-semibold text-zinc-900 transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Receipt size={16} />
                {creatingSale ? 'Creating cash sale...' : 'Create cash sale & issue tickets'}
              </button>
            </div>
          </div>
        </form>

        <aside className="space-y-6">
          <div className="panel-surface panel-border panel-shadow rounded-4xl p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Step 3</p>
                <h2 className="mt-1 text-xl font-semibold text-white">Print-ready ticket output</h2>
              </div>
              {createdSale?.printable ? (
                <button
                  type="button"
                  onClick={() => handlePrintSale(createdSale.printable)}
                  disabled={printing}
                  className="inline-flex items-center gap-2 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-100 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Printer size={16} />
                  {printing ? 'Opening...' : 'Print / Save PDF'}
                </button>
              ) : null}
            </div>

            {!createdSale ? (
              <div className="mt-6 rounded-3xl border border-dashed border-white/10 bg-white/3 p-6 text-sm leading-6 text-zinc-500">
                Create a cash sale to instantly receive local printable passes with QR codes. The browser print dialog lets you print them directly or save them as PDF for office customers.
              </div>
            ) : (
              <div className="mt-6 space-y-5">
                <div className="rounded-3xl border border-white/8 bg-white/4 p-5">
                  <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">{createdSale.order.orderNumber}</p>
                  <h3 className="mt-2 text-lg font-semibold text-white">{createdSale.order.customer.name}</h3>
                  <p className="mt-1 text-sm text-zinc-400">{createdSale.order.customer.email || createdSale.order.customer.phone}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full border border-emerald-400/15 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200">
                      {createdSale.order.status}
                    </span>
                    <span className="rounded-full border border-amber-400/15 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-100">
                      Cash payment
                    </span>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/8 bg-white/4 p-5">
                  <div className="grid gap-3 text-sm text-zinc-300">
                    <p>Invoice: <span className="text-white">{createdSale.payment.invoiceNumber}</span></p>
                    <p>Total: <span className="text-white">{formatCurrency(createdSale.order.amounts.total)}</span></p>
                    <p>Issued Tickets: <span className="text-white">{formatNumber(createdSale.summary.issuedTicketsCount)}</span></p>
                  </div>
                </div>

                <div className="space-y-4">
                  {(createdSale.printable?.printablePasses ?? []).map((passItem) => (
                    <article key={passItem.ticketCode} className="rounded-3xl border border-white/8 bg-[#0f0f12] p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-white">{passItem.display?.title || 'Event Pass'}</p>
                          <p className="mt-1 text-xs text-zinc-500">{passItem.display?.subtitle || 'Ticket'} · {passItem.ticketCode}</p>
                          <p className="mt-2 text-xs text-zinc-400">
                            Passenger {passItem.display?.passengerName || 'Guest'} · {passItem.display?.eventDate ? formatDateTime(passItem.display.eventDate) : 'No date'}
                          </p>
                        </div>
                        <LocalQrCode
                          value={passItem.qrPayload}
                          size={130}
                          className="rounded-2xl border border-white/8 bg-white p-2"
                          alt={`QR for ${passItem.ticketCode}`}
                        />
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* <div className="panel-surface panel-border rounded-4xl p-6">
            <div className="flex items-center gap-3">
              <Ticket className="text-amber-100" size={18} />
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Notes</p>
                <h3 className="mt-1 text-lg font-semibold text-white">How it works</h3>
              </div>
            </div>
            <div className="mt-5 space-y-3 text-sm leading-7 text-zinc-400">
              <p>Cash sales create an order, mark payment as successful, and issue valid tickets immediately.</p>
              <p>QR codes are generated locally inside the admin panel, without any external API call.</p>
              <p>Use the print action to print hard copies or choose “Save as PDF” from the browser print dialog.</p>
            </div>
          </div> */}
        </aside>
      </section>
    </div>
  )
}
