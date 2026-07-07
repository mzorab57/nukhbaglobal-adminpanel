import QRCode from 'qrcode'

export async function generateQrDataUrl(value, options = {}) {
  const normalized = String(value ?? '').trim()

  if (!normalized) {
    return null
  }

  return QRCode.toDataURL(normalized, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 320,
    color: {
      dark: '#0a0a0a',
      light: '#ffffff',
    },
    ...options,
  })
}
