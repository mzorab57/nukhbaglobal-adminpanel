import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  LogOut,
  Maximize,
  Minimize,
  QrCode,
  RefreshCcw,
  ScanLine,
  ShieldCheck,
  Ticket,
  UserRound,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ApiError, apiRequest } from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatDateTime } from '../lib/format'

function toneForStatus(status) {
  if (status === 'valid') {
    return 'border-emerald-400/15 bg-emerald-500/10 text-emerald-200'
  }

  if (status === 'used') {
    return 'border-amber-400/15 bg-amber-500/10 text-amber-100'
  }

  return 'border-rose-400/15 bg-rose-500/10 text-rose-200'
}

function buildScanError(error, fallbackMessage) {
  if (error instanceof ApiError) {
    return error.message || fallbackMessage
  }

  if (error instanceof Error) {
    return error.message || fallbackMessage
  }

  return fallbackMessage
}

function getAudioContext() {
  if (typeof window === 'undefined') {
    return null
  }

  const AudioContextClass = window.AudioContext || window['webkitAudioContext']

  if (!AudioContextClass) {
    return null
  }

  return AudioContextClass
}

export default function ScannerPage() {
  const { token, user, logout } = useAuth()
  const navigate = useNavigate()
  const containerRef = useRef(null)
  const videoRef = useRef(null)
  const detectorRef = useRef(null)
  const streamRef = useRef(null)
  const detectIntervalRef = useRef(null)
  const restartTimeoutRef = useRef(null)
  const detectionBusyRef = useRef(false)
  const lastDetectedCodeRef = useRef('')
  const audioContextRef = useRef(null)

  const [ticketCode, setTicketCode] = useState('')
  const [previewResult, setPreviewResult] = useState(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [loadingConfirm, setLoadingConfirm] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraMessage, setCameraMessage] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isFocusMode, setIsFocusMode] = useState(false)

  const browserSupportsCamera = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia)
  const browserSupportsQrDetection = typeof window !== 'undefined' && 'BarcodeDetector' in window

  useEffect(() => {
    if (!browserSupportsQrDetection) {
      return
    }

    try {
      detectorRef.current = new window.BarcodeDetector({
        formats: ['qr_code'],
      })
    } catch {
      detectorRef.current = null
    }
  }, [browserSupportsQrDetection])

  useEffect(() => {
    return () => {
      if (restartTimeoutRef.current) {
        window.clearTimeout(restartTimeoutRef.current)
      }
      stopCamera()
    }
  }, [])

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (typeof document === 'undefined') {
        return
      }

      if (!document.fullscreenElement) {
        setIsFocusMode(false)
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  const resumeAudioContext = async () => {
    const AudioContextClass = getAudioContext()

    if (!AudioContextClass) {
      return null
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextClass()
    }

    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume()
    }

    return audioContextRef.current
  }

  const playToneSequence = async (sequence) => {
    const audioContext = await resumeAudioContext()

    if (!audioContext) {
      return
    }

    const baseTime = audioContext.currentTime + 0.02

    sequence.forEach((tone) => {
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      const startAt = baseTime + (tone.offset ?? 0)
      const stopAt = startAt + tone.duration

      oscillator.type = tone.type ?? 'sine'
      oscillator.frequency.setValueAtTime(tone.frequency, startAt)

      gainNode.gain.setValueAtTime(0.0001, startAt)
      gainNode.gain.exponentialRampToValueAtTime(tone.gain ?? 0.035, startAt + 0.01)
      gainNode.gain.exponentialRampToValueAtTime(0.0001, stopAt)

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      oscillator.start(startAt)
      oscillator.stop(stopAt)
    })
  }

  const playDetectionBeep = () => {
    void playToneSequence([
      {
        frequency: 920,
        duration: 0.09,
        gain: 0.028,
        type: 'square',
      },
    ])
  }

  const playSuccessSound = () => {
    void playToneSequence([
      {
        frequency: 740,
        duration: 0.08,
        gain: 0.03,
        type: 'triangle',
        offset: 0,
      },
      {
        frequency: 1040,
        duration: 0.12,
        gain: 0.032,
        type: 'triangle',
        offset: 0.09,
      },
    ])
  }

  const playErrorSound = () => {
    void playToneSequence([
      {
        frequency: 260,
        duration: 0.11,
        gain: 0.03,
        type: 'sawtooth',
      },
      {
        frequency: 180,
        duration: 0.15,
        gain: 0.028,
        type: 'sawtooth',
        offset: 0.1,
      },
    ])
  }

  const stopCamera = () => {
    if (restartTimeoutRef.current) {
      window.clearTimeout(restartTimeoutRef.current)
      restartTimeoutRef.current = null
    }

    if (detectIntervalRef.current) {
      window.clearInterval(detectIntervalRef.current)
      detectIntervalRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setCameraActive(false)
  }

  const resetScanState = () => {
    setTicketCode('')
    setPreviewResult(null)
    setError('')
    setSuccess('')
    lastDetectedCodeRef.current = ''
  }

  const handleLogout = () => {
    stopCamera()
    logout()
    navigate('/login', { replace: true })
  }

  const normalizeTicketCode = (value) => {
    const normalized = String(value ?? '').trim()

    if (normalized.startsWith('NUKHBAGLOBAL:TICKET:')) {
      return normalized.slice('NUKHBAGLOBAL:TICKET:'.length).trim()
    }

    return normalized
  }

  const enterFocusMode = async () => {
    setIsFocusMode(true)

    if (typeof document === 'undefined') {
      return
    }

    const canUseFullscreen = typeof containerRef.current?.requestFullscreen === 'function'
    if (!canUseFullscreen || document.fullscreenElement) {
      return
    }

    try {
      await containerRef.current.requestFullscreen()
    } catch {
      // Fallback overlay mode remains active even if the browser blocks fullscreen.
    }
  }

  const exitFocusMode = async () => {
    if (typeof document !== 'undefined' && document.fullscreenElement && typeof document.exitFullscreen === 'function') {
      try {
        await document.exitFullscreen()
      } catch {
        // Ignore exit failures and still close overlay mode.
      }
    }

    setIsFocusMode(false)
  }

  const previewTicket = async (overrideCode = null) => {
    const codeToPreview = normalizeTicketCode(overrideCode ?? ticketCode)

    if (!codeToPreview) {
      setError('Ticket code is required.')
      return
    }

    setLoadingPreview(true)
    setError('')
    setSuccess('')
    void resumeAudioContext()

    try {
      const response = await apiRequest('/api/scans/preview', {
        method: 'POST',
        token,
        body: {
          ticket_code: codeToPreview,
        },
      })

      setPreviewResult(response.data)
      setTicketCode(codeToPreview)
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        handleLogout()
        return
      }

      setPreviewResult(null)
      setError(buildScanError(requestError, 'Failed to preview ticket.'))
      playErrorSound()
    } finally {
      setLoadingPreview(false)
    }
  }

  const confirmTicket = async () => {
    const codeToConfirm = normalizeTicketCode(ticketCode)

    if (!codeToConfirm) {
      setError('Ticket code is required.')
      return
    }

    setLoadingConfirm(true)
    setError('')
    setSuccess('')
    void resumeAudioContext()

    try {
      const response = await apiRequest('/api/scans/confirm', {
        method: 'POST',
        token,
        body: {
          ticket_code: codeToConfirm,
        },
      })

      setPreviewResult(response.data)
      setSuccess('Ticket scanned successfully.')
      lastDetectedCodeRef.current = codeToConfirm
      playSuccessSound()

      if (browserSupportsCamera && browserSupportsQrDetection) {
        restartTimeoutRef.current = window.setTimeout(() => {
          restartTimeoutRef.current = null
          void startCamera()
        }, 1200)
      }
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        handleLogout()
        return
      }

      setError(buildScanError(requestError, 'Failed to confirm ticket scan.'))
      playErrorSound()
    } finally {
      setLoadingConfirm(false)
    }
  }

  const handleDetectedCode = async (detectedCode) => {
    const normalizedCode = normalizeTicketCode(detectedCode)

    if (!normalizedCode || normalizedCode === lastDetectedCodeRef.current) {
      return
    }

    lastDetectedCodeRef.current = normalizedCode
    setTicketCode(normalizedCode)
    stopCamera()
    playDetectionBeep()
    await previewTicket(normalizedCode)
  }

  const detectQrCode = async () => {
    if (detectionBusyRef.current || !detectorRef.current || !videoRef.current) {
      return
    }

    const video = videoRef.current
    if (video.readyState < 2) {
      return
    }

    detectionBusyRef.current = true

    try {
      const barcodes = await detectorRef.current.detect(video)
      const detectedCode = barcodes?.[0]?.rawValue

      if (detectedCode) {
        await handleDetectedCode(detectedCode)
      }
    } catch {
      // Ignore intermittent camera detection errors and keep polling.
    } finally {
      detectionBusyRef.current = false
    }
  }

  const startCamera = async () => {
    if (!browserSupportsCamera) {
      setCameraMessage('This browser does not support camera access.')
      return
    }

    if (!browserSupportsQrDetection || !detectorRef.current) {
      setCameraMessage('Native QR reading is not available in this browser. Use Chrome/Edge or enter the code manually.')
      return
    }

    stopCamera()
    setCameraMessage('')
    setError('')
    setSuccess('')
    void resumeAudioContext()

    if (typeof window !== 'undefined' && window.innerWidth < 1024 && !isFocusMode) {
      await enterFocusMode()
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
        },
        audio: false,
      })

      streamRef.current = stream

      if (!videoRef.current) {
        return
      }

      videoRef.current.srcObject = stream
      await videoRef.current.play()
      setCameraActive(true)

      detectIntervalRef.current = window.setInterval(() => {
        void detectQrCode()
      }, 700)
    } catch (cameraError) {
      stopCamera()
      setCameraMessage(buildScanError(cameraError, 'Unable to start the camera.'))
    }
  }

  const previewStatus = useMemo(() => {
    if (!previewResult) {
      return null
    }

    return {
      label: previewResult.statusLabel || previewResult.ticketStatus || 'Unknown',
      tone: toneForStatus(previewResult.ticketStatus),
    }
  }, [previewResult])

  return (
    <div
      ref={containerRef}
      className={`${isFocusMode ? 'fixed inset-0 z-50 overflow-y-auto bg-[#09090b] p-3 sm:p-4' : 'min-h-screen bg-[#09090b] p-4 lg:p-6'} text-white`}
    >
      <div className="grid-glow fixed inset-0 -z-10 opacity-40" />
      <div className={`${isFocusMode ? 'mx-auto max-w-6xl space-y-4' : 'mx-auto max-w-[1580px] space-y-6'}`}>
        <section className="panel-surface panel-border panel-shadow rounded-[2rem] p-6 lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.35em] text-amber-100/55">Scanner Console</p>
              <h1 className="mt-3 text-3xl font-semibold text-white lg:text-4xl">
                Premium QR admission screen for live entry operations.
              </h1>
              <p className="mt-4 text-sm leading-7 text-zinc-400">
                Scan a QR code, preview the ticket instantly, then confirm admission against the backend
                in one focused workflow designed for scanner staff.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300">
                <div className="flex items-center gap-2">
                  <UserRound size={16} className="text-amber-100" />
                  <span>{user?.name || 'Scanner user'}</span>
                </div>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-zinc-500">{user?.role || 'scanner'}</p>
              </div>
              <button
                type="button"
                onClick={isFocusMode ? exitFocusMode : enterFocusMode}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-200 transition hover:border-amber-200/20 hover:text-white"
              >
                {isFocusMode ? <Minimize size={16} /> : <Maximize size={16} />}
                {isFocusMode ? 'Exit focus mode' : 'Full-screen mode'}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-200 transition hover:border-rose-300/20 hover:text-white"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          </div>
        </section>

        {(error || success || cameraMessage) && (
          <section className="grid gap-3 lg:grid-cols-3">
            <div className={`rounded-[1.6rem] border px-5 py-4 text-sm ${error ? 'border-rose-400/20 bg-rose-500/10 text-rose-100' : 'border-white/8 bg-white/4 text-zinc-500'}`}>
              <div className="flex items-start gap-3">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-white">Scan notice</p>
                  <p className="mt-1">{error || 'No errors right now.'}</p>
                </div>
              </div>
            </div>
            <div className={`rounded-[1.6rem] border px-5 py-4 text-sm ${success ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100' : 'border-white/8 bg-white/4 text-zinc-500'}`}>
              <div className="flex items-start gap-3">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-white">Admission result</p>
                  <p className="mt-1">{success || 'Preview a ticket, then confirm admission.'}</p>
                </div>
              </div>
            </div>
            <div className={`rounded-[1.6rem] border px-5 py-4 text-sm ${cameraMessage ? 'border-amber-300/20 bg-amber-400/10 text-amber-100' : 'border-white/8 bg-white/4 text-zinc-500'}`}>
              <div className="flex items-start gap-3">
                <ShieldCheck size={18} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-white">Camera status</p>
                  <p className="mt-1">{cameraMessage || (cameraActive ? 'Camera is active and scanning for QR codes.' : 'Camera is idle.')}</p>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className={`${isFocusMode ? 'grid gap-4' : 'grid gap-6 xl:grid-cols-[1.02fr_0.98fr]'}`}>
          <div className="space-y-6">
            <div className="panel-surface panel-border panel-shadow rounded-[2rem] p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Camera Reader</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Live QR detection</h2>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={startCamera}
                    disabled={cameraActive}
                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 via-amber-200 to-orange-200 px-5 py-3 text-sm font-semibold text-zinc-900 transition disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Camera size={16} />
                    Start camera
                  </button>
                  <button
                    type="button"
                    onClick={isFocusMode ? exitFocusMode : enterFocusMode}
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-zinc-200 transition hover:bg-white/8"
                  >
                    {isFocusMode ? <Minimize size={16} /> : <Maximize size={16} />}
                    {isFocusMode ? 'Exit full-screen' : 'Go full-screen'}
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    disabled={!cameraActive}
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-zinc-200 transition hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <RefreshCcw size={16} />
                    Stop
                  </button>
                </div>
              </div>

              <div className="relative mt-6 overflow-hidden rounded-[1.8rem] border border-white/8 bg-black/40">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className={`${isFocusMode ? 'aspect-[3/4] min-h-[68vh] sm:min-h-[72vh]' : 'aspect-[4/3]'} w-full bg-black object-cover`}
                />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className={`${isFocusMode ? 'h-72 w-72 max-w-[78vw] max-h-[78vw]' : 'h-56 w-56'} flex items-center justify-center rounded-[2rem] border border-amber-200/35 bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.28)]`}>
                    <QrCode size={34} className="text-amber-100/80" />
                  </div>
                </div>
              </div>

              <p className="mt-4 text-sm leading-7 text-zinc-400">
                Align the QR code inside the highlighted frame. Once detected, the screen stops the
                camera and loads a preview from the backend automatically.
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.22em] text-zinc-500">
                QR detection beep triggers when a code is captured, and a success tone plays after admission is confirmed.
              </p>
            </div>

            <div className="panel-surface panel-border panel-shadow rounded-[2rem] p-6">
              <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Manual Backup</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Enter ticket code manually</h2>
              <div className="mt-5 flex flex-col gap-3 md:flex-row">
                <div className="flex-1 rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
                  <input
                    value={ticketCode}
                    onChange={(event) => setTicketCode(event.target.value)}
                    placeholder="Paste or type ticket code"
                    className="w-full bg-transparent text-base text-white outline-none placeholder:text-zinc-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => previewTicket()}
                  disabled={loadingPreview || loadingConfirm}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 via-amber-200 to-orange-200 px-5 py-3 text-sm font-semibold text-zinc-900 transition disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ScanLine size={16} />
                  {loadingPreview ? 'Previewing...' : 'Preview ticket'}
                </button>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={resetScanState}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-200 transition hover:bg-white/8"
                >
                  <RefreshCcw size={16} />
                  Scan another
                </button>
              </div>
            </div>
          </div>

          <aside className="panel-surface panel-border panel-shadow rounded-[2rem] p-6">
            <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Preview & Confirm</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Ticket admission drawer</h2>

            {!previewResult ? (
              <div className="mt-6 rounded-[1.8rem] border border-dashed border-white/10 bg-white/3 p-8 text-sm leading-7 text-zinc-500">
                Start the camera or enter a code manually to load ticket details, event context, customer
                information, and confirm whether this admission is valid.
              </div>
            ) : (
              <div className="mt-6 space-y-5">
                <div className="rounded-[1.8rem] border border-white/8 bg-white/4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Ticket Status</p>
                      <h3 className="mt-2 text-xl font-semibold text-white">{previewResult.ticketCode}</h3>
                      <p className="mt-2 text-sm text-zinc-400">
                        {previewResult.event?.titleText || 'Unknown event'} · {formatDateTime(previewResult.event?.date)}
                      </p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${previewStatus?.tone || ''}`}>
                      {previewStatus?.label || 'Unknown'}
                    </span>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-3xl border border-white/8 bg-white/4 p-5">
                    <div className="flex items-center gap-2 text-zinc-200">
                      <UserRound size={16} />
                      <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Customer</p>
                    </div>
                    <div className="mt-4 space-y-2 text-sm text-zinc-300">
                      <p>Name: <span className="text-white">{previewResult.customer?.name || 'N/A'}</span></p>
                      <p>Email: <span className="text-white">{previewResult.customer?.email || 'N/A'}</span></p>
                      <p>Phone: <span className="text-white">{previewResult.customer?.phone || 'N/A'}</span></p>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-white/8 bg-white/4 p-5">
                    <div className="flex items-center gap-2 text-zinc-200">
                      <Ticket size={16} />
                      <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Ticket & Order</p>
                    </div>
                    <div className="mt-4 space-y-2 text-sm text-zinc-300">
                      <p>Ticket: <span className="text-white">{previewResult.ticket?.titleText || 'N/A'}</span></p>
                      <p>Passenger: <span className="text-white">{previewResult.ticket?.passengerName || 'N/A'}</span></p>
                      <p>Order #: <span className="text-white">{previewResult.orderNumber || 'N/A'}</span></p>
                      <p>Payment: <span className="text-white">{previewResult.paymentStatus || 'N/A'}</span></p>
                    </div>
                  </div>
                </div>

                {previewResult.lastScan?.scannedAt ? (
                  <div className="rounded-3xl border border-amber-300/15 bg-amber-400/10 p-5 text-sm text-amber-100">
                    Last scanned at {formatDateTime(previewResult.lastScan.scannedAt)}
                    {previewResult.lastScan.scannedBy?.name ? ` by ${previewResult.lastScan.scannedBy.name}` : ''}
                  </div>
                ) : null}

                <div className="rounded-3xl border border-white/8 bg-white/4 p-5">
                  <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Current scanner</p>
                  <p className="mt-3 text-sm text-zinc-300">
                    {previewResult.scanner?.name || user?.name || 'Scanner'} · {previewResult.scanner?.role || user?.role || 'scanner'}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={confirmTicket}
                    disabled={!previewResult.canScan || loadingConfirm}
                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-300 via-emerald-200 to-lime-200 px-5 py-3 text-sm font-semibold text-zinc-900 transition disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <CheckCircle2 size={16} />
                    {loadingConfirm ? 'Confirming...' : 'Confirm admission'}
                  </button>
                  <button
                    type="button"
                    onClick={() => previewTicket()}
                    disabled={loadingPreview}
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-zinc-200 transition hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <RefreshCcw size={16} />
                    Refresh preview
                  </button>
                </div>
              </div>
            )}
          </aside>
        </section>
      </div>
    </div>
  )
}
