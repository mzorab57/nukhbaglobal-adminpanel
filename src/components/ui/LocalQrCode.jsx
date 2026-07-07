import { useEffect, useState } from 'react'
import { generateQrDataUrl } from '../../lib/qr'

export default function LocalQrCode({ value, size = 180, className = '', alt = 'QR code' }) {
  const [dataUrl, setDataUrl] = useState(null)

  useEffect(() => {
    let ignore = false

    const load = async () => {
      const url = await generateQrDataUrl(value, { width: size })

      if (!ignore) {
        setDataUrl(url)
      }
    }

    void load()

    return () => {
      ignore = true
    }
  }, [size, value])

  if (!dataUrl) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-xs text-zinc-500 ${className}`}
        style={{ width: size, height: size }}
      >
        Generating QR...
      </div>
    )
  }

  return (
    <img
      src={dataUrl}
      alt={alt}
      width={size}
      height={size}
      className={className}
    />
  )
}
