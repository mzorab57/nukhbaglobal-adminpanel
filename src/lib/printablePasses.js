import { generateQrDataUrl } from './qr'

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export async function openPrintablePassesWindow(payload, options = {}) {
  const passes = Array.isArray(payload?.printablePasses) ? payload.printablePasses : []

  if (passes.length === 0) {
    throw new Error('No printable passes are available.')
  }

  const printableWindow = window.open('', '_blank', 'noopener,noreferrer')

  if (!printableWindow) {
    throw new Error('Unable to open the print window.')
  }

  const qrEntries = await Promise.all(
    passes.map(async (passItem) => ({
      passItem,
      qrDataUrl: await generateQrDataUrl(passItem.qrPayload || passItem.ticketCode),
    })),
  )

  const title = options.title || `Printable Passes - ${payload?.order?.orderNumber || 'Order'}`

  const cardsHtml = qrEntries
    .map(({ passItem, qrDataUrl }) => {
      const display = passItem.display || {}

      return `
        <article class="ticket-card">
          <div class="ticket-header">
            <p class="eyebrow">NukhbaGlobal Pass</p>
            <p class="status">${escapeHtml(display.status || 'valid')}</p>
          </div>
          <h1>${escapeHtml(display.title || 'Event Pass')}</h1>
          <p class="subtitle">${escapeHtml(display.subtitle || 'Ticket')}</p>
          <div class="ticket-grid">
            <div class="ticket-meta">
              <p><span>Passenger</span>${escapeHtml(display.passengerName || 'Guest')}</p>
              <p><span>Order</span>${escapeHtml(display.orderNumber || payload?.order?.orderNumber || '')}</p>
              <p><span>Event Date</span>${escapeHtml(display.eventDate || 'N/A')}</p>
              <p><span>Session</span>${escapeHtml(display.subEventTitle || 'Main event')}</p>
              <p><span>Ticket Code</span>${escapeHtml(passItem.ticketCode || '')}</p>
            </div>
            <div class="ticket-qr">
              <img src="${qrDataUrl}" alt="QR code" />
            </div>
          </div>
        </article>
      `
    })
    .join('')

  printableWindow.document.open()
  printableWindow.document.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(title)}</title>
        <style>
          :root { color-scheme: light; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: Inter, Arial, sans-serif;
            background: #f5f5f5;
            color: #111827;
            padding: 24px;
          }
          .sheet {
            max-width: 1120px;
            margin: 0 auto;
          }
          .sheet-header {
            margin-bottom: 24px;
          }
          .sheet-header h1 {
            margin: 0;
            font-size: 28px;
          }
          .sheet-header p {
            margin: 8px 0 0;
            color: #4b5563;
          }
          .cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
            gap: 18px;
          }
          .ticket-card {
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 24px;
            padding: 22px;
            break-inside: avoid;
            box-shadow: 0 10px 30px rgba(17, 24, 39, 0.08);
          }
          .ticket-header {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            align-items: center;
          }
          .eyebrow {
            margin: 0;
            font-size: 11px;
            letter-spacing: 0.18em;
            text-transform: uppercase;
            color: #6b7280;
          }
          .status {
            margin: 0;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.16em;
            color: #92400e;
          }
          h1 {
            margin: 16px 0 0;
            font-size: 24px;
            line-height: 1.2;
          }
          .subtitle {
            margin: 8px 0 0;
            color: #4b5563;
          }
          .ticket-grid {
            display: grid;
            grid-template-columns: 1fr 180px;
            gap: 20px;
            margin-top: 22px;
            align-items: center;
          }
          .ticket-meta {
            display: grid;
            gap: 12px;
          }
          .ticket-meta p {
            margin: 0;
            display: grid;
            gap: 4px;
            font-size: 14px;
          }
          .ticket-meta span {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.14em;
            color: #6b7280;
          }
          .ticket-qr {
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px solid #e5e7eb;
            border-radius: 24px;
            padding: 12px;
            background: #fff;
          }
          .ticket-qr img {
            width: 100%;
            height: auto;
            display: block;
          }
          @media print {
            body {
              background: #fff;
              padding: 0;
            }
            .sheet-header {
              padding: 0 0 12px;
            }
            .cards {
              gap: 12px;
            }
            .ticket-card {
              box-shadow: none;
            }
          }
          @media (max-width: 700px) {
            body { padding: 16px; }
            .ticket-grid { grid-template-columns: 1fr; }
          }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="sheet-header">
            <h1>${escapeHtml(payload?.order?.orderNumber || 'Printable Passes')}</h1>
            <p>Print the tickets directly or choose "Save as PDF" from the browser print dialog.</p>
          </div>
          <section class="cards">
            ${cardsHtml}
          </section>
        </div>
      </body>
    </html>
  `)
  printableWindow.document.close()
  printableWindow.focus()

  if (options.autoPrint !== false) {
    printableWindow.setTimeout(() => {
      printableWindow.print()
    }, 250)
  }

  return printableWindow
}
