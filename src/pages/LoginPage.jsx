import { useState } from 'react'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import BrandMark from '../components/ui/BrandMark'
import TextInput from '../components/ui/TextInput'
import { getDefaultRoute } from '../lib/access'
import { useAuth } from '../lib/auth'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [form, setForm] = useState({
    email: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (field) => (event) => {
    setForm((current) => ({
      ...current,
      [field]: event.target.value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const authenticatedUser = await login(form)
      navigate(getDefaultRoute(authenticatedUser), { replace: true })
    } catch (submissionError) {
      setError(submissionError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4 lg:p-8">
      <div className="grid-glow absolute inset-0 opacity-40" />
      <div className="absolute inset-y-10 left-10 hidden w-72 rounded-full bg-amber-300/10 blur-3xl lg:block" />
      <div className="absolute right-10 top-10 hidden h-60 w-60 rounded-full bg-indigo-400/10 blur-3xl lg:block" />
      <div className="relative grid w-full max-w-6xl overflow-hidden rounded-4xl panel-border panel-shadow lg:grid-cols-[1.1fr_0.9fr]">
        <section className="panel-surface p-8 lg:p-12">
          <BrandMark />
          <div className="mt-16 max-w-xl">
            <p className="text-xs uppercase tracking-[0.4em] text-amber-100/60">Secure Access</p>
            <h2 className="mt-4 text-4xl font-semibold leading-tight text-white lg:text-5xl">
              Premium control for events, payments, and live operations.
            </h2>
            <p className="mt-6 max-w-lg text-base leading-8 text-zinc-400">
              This shell gives your client an elegant command center to manage orders, reports, tickets, and catalog operations from one sleek dashboard.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-white/8 bg-white/4 p-5">
                <p className="text-sm text-zinc-500">Live visibility</p>
                <h3 className="mt-2 text-lg font-medium text-white">Orders, scans, and payment activity</h3>
              </div>
              <div className="rounded-3xl border border-amber-200/10 bg-amber-300/8 p-5">
                <p className="text-sm text-amber-100/70">Ready next</p>
                <h3 className="mt-2 text-lg font-medium text-white">Orders, events, reports modules</h3>
              </div>
            </div>
          </div>
        </section>
        <section className="bg-[#0c0d10] p-8 lg:p-12">
          <div className="mx-auto flex h-full max-w-md flex-col justify-center">
            <div className="mb-8 inline-flex items-center gap-2 self-start rounded-full border border-emerald-300/10 bg-emerald-300/8 px-4 py-2 text-xs uppercase tracking-[0.3em] text-emerald-100">
              <ShieldCheck size={14} />
              Protected Admin Access
            </div>
            <h3 className="text-3xl font-semibold text-white">Sign In</h3>
            <p className="mt-3 text-sm leading-7 text-zinc-400">
              Sign in with your admin account to load live overview metrics, payment summaries, and recent order activity from the backend.
            </p>
            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <TextInput
                label="Email"
                type="email"
                placeholder="admin@nukhbaglobal.com"
                value={form.email}
                onChange={handleChange('email')}
              />
              <TextInput
                label="Password"
                type="password"
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange('password')}
              />
              {error && (
                <div className="rounded-2xl border border-rose-300/15 bg-rose-400/8 px-4 py-3 text-sm text-rose-100">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 via-amber-200 to-orange-200 px-5 text-sm font-semibold text-zinc-900 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? 'Signing In...' : 'Enter Dashboard'}
                <ArrowRight size={16} />
              </button>
            </form>
            <div className="mt-8 rounded-3xl border border-white/8 bg-white/4 p-5 text-sm text-zinc-400">
              <p className="font-medium text-zinc-200">Backend-ready auth</p>
              <p className="mt-2">
                This screen now authenticates against the backend API and stores a signed bearer token locally for the protected dashboard.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
