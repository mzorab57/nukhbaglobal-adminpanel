import { useEffect, useMemo, useState } from 'react'
import {
  Eye,
  EyeOff,
  Mail,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Trash2,
  UserCog,
  UserRound,
  Users,
  ChevronDown,
  X,
} from 'lucide-react'
import { ApiError, apiRequest } from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatDateTime, formatNumber } from '../lib/format'

const PERMISSION_OPTIONS = [
  {
    value: 'manage_users',
    label: 'Manage Users',
    description: 'Create, update, and delete team accounts.',
  },
  {
    value: 'manage_events',
    label: 'Manage Events',
    description: 'Control events, schedules, and related content.',
  },
  {
    value: 'manage_catalog',
    label: 'Manage Catalog',
    description: 'Edit countries, cities, sub-events, and catalog data.',
  },
  {
    value: 'manage_tickets',
    label: 'Manage Tickets',
    description: 'Update ticket inventory, pricing, and availability.',
  },
]

const INITIAL_FILTERS = {
  q: '',
  role: '',
  status: '',
}

const EMPTY_FORM = {
  name: '',
  email: '',
  password: '',
  role: 'scanner',
  permissions: [],
  status: '1',
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

function toneForStatus(isActive) {
  return isActive
    ? 'border-emerald-400/15 bg-emerald-500/10 text-emerald-200'
    : 'border-rose-400/15 bg-rose-500/10 text-rose-200'
}

function toneForRole(role) {
  if (role === 'admin') {
    return 'border-amber-300/15 bg-amber-400/10 text-amber-100'
  }

  if (role === 'accountant') {
    return 'border-sky-300/15 bg-sky-400/10 text-sky-100'
  }

  return 'border-fuchsia-300/15 bg-fuchsia-400/10 text-fuchsia-100'
}

function roleLabel(role) {
  if (role === 'admin') {
    return 'Admin'
  }

  if (role === 'accountant') {
    return 'Accountant'
  }

  if (role === 'scanner') {
    return 'Scanner'
  }

  return role
}

function mapUserToForm(user) {
  return {
    name: user.name || '',
    email: user.email || '',
    password: '',
    role: user.role || 'scanner',
    permissions: Array.isArray(user.permissions) ? user.permissions : [],
    status: user.status ? '1' : '0',
  }
}

function buildPayload(form, isEdit) {
  const payload = {
    name: form.name.trim(),
    email: form.email.trim(),
    role: form.role,
    permissions: form.permissions,
    status: Number(form.status),
  }

  if (!isEdit || form.password.trim() !== '') {
    payload.password = form.password.trim()
  }

  return payload
}

export default function UsersManagementPage() {
  const { token, logout, user: currentUser } = useAuth()
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [usersPayload, setUsersPayload] = useState(null)
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [mode, setMode] = useState('create')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false)
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)

  const items = usersPayload?.items ?? []
  const roleOptions = usersPayload?.roleOptions ?? ['admin', 'scanner', 'accountant']

  const handleRequestError = (requestError, fallbackMessage) => {
    if (requestError instanceof ApiError && requestError.status === 401) {
      logout()
      return true
    }

    setError(requestError.message || fallbackMessage)
    return false
  }

  const resetForm = () => {
    setMode('create')
    setSelectedUserId(null)
    setShowPassword(false)
    setForm(EMPTY_FORM)
  }

  const loadUsers = async ({ silent = false, nextFilters = filters } = {}) => {
    if (!token) {
      return
    }

    if (!silent) {
      setLoading(true)
    }

    setError('')

    try {
      const query = buildQueryString(nextFilters)
      const path = query ? `/api/admin/users?${query}` : '/api/admin/users'
      const response = await apiRequest(path, { token })
      setUsersPayload(response.data)
    } catch (requestError) {
      handleRequestError(requestError, 'Failed to load team members.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [token, filters.q, filters.role, filters.status])

  const selectedUser = useMemo(
    () => items.find((item) => item.id === selectedUserId) ?? null,
    [items, selectedUserId],
  )

  const handleEdit = (nextUser) => {
    setMode('edit')
    setSelectedUserId(nextUser.id)
    setShowPassword(false)
    setForm(mapUserToForm(nextUser))
  }

  const handlePermissionToggle = (permissionValue) => {
    setForm((current) => {
      const hasPermission = current.permissions.includes(permissionValue)

      return {
        ...current,
        permissions: hasPermission
          ? current.permissions.filter((permission) => permission !== permissionValue)
          : [...current.permissions, permissionValue],
      }
    })
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
        mode === 'edit' && selectedUserId
          ? `/api/admin/users/${selectedUserId}/update`
          : '/api/admin/users/create'

      await apiRequest(path, {
        method: 'POST',
        token,
        body: buildPayload(form, mode === 'edit'),
      })

      await loadUsers({ silent: true })
      resetForm()
    } catch (requestError) {
      handleRequestError(requestError, 'Failed to save user.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (userId) => {
    if (!token) {
      return
    }

    setDeletingId(userId)
    setError('')

    try {
      await apiRequest(`/api/admin/users/${userId}/delete`, {
        method: 'POST',
        token,
      })

      if (selectedUserId === userId) {
        resetForm()
      }

      await loadUsers({ silent: true })
    } catch (requestError) {
      handleRequestError(requestError, 'Failed to delete user.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-8 text-zinc-100">
      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-amber-100/55">Team Control</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">Users Management</h1>
         
        </div>
        <button
          type="button"
          onClick={() => loadUsers()}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-200 transition hover:border-amber-200/20 hover:text-white"
        >

          <RefreshCcw size={16} />
          Refresh Team
        </button>
        
      </section>

      {/* <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard eyebrow="Team" title="Total users" value={formatNumber(stats.totalUsers)} delta="All accounts" />
        <StatCard eyebrow="Access" title="Active users" value={formatNumber(stats.activeUsers)} delta="Can sign in" />
        <StatCard eyebrow="Leadership" title="Admins" value={formatNumber(stats.admins)} delta="Management access" />
        <StatCard eyebrow="Operations" title="Scanners" value={formatNumber(stats.scanners)} delta={`Accountants ${formatNumber(stats.accountants)}`} />
      </section> */}

      <section className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
        <div className="panel-surface panel-border panel-shadow rounded-[2rem] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Editor</p>
              <h2 className="mt-2 text-xl font-semibold text-white">
                {mode === 'edit' ? 'Update Team Member' : 'Create Team Member'}
              </h2>
            </div>
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-300 transition hover:text-white"
            >
              <Plus size={15} />
              New
            </button>
          </div>

          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.26em] text-zinc-500">Full Name</span>
              <input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-200/25"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.26em] text-zinc-500">Email Address</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-200/25"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <span className="text-xs uppercase tracking-[0.26em] text-zinc-500">
                  {mode === 'edit' ? 'New Password (Optional)' : 'Password'}
                </span>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 pr-12 text-sm text-white outline-none transition focus:border-amber-200/25"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 transition hover:text-white"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.26em] text-zinc-500">Role</span>
                <select
                  value={form.role}
                  onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-200/25"
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {roleLabel(role)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_160px]">
              <div className="space-y-3">
                <span className="text-xs uppercase tracking-[0.26em] text-zinc-500">Permissions</span>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsPermissionsOpen((prev) => !prev)}
                    className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition hover:border-white/20 focus:border-amber-200/25"
                  >
                    <span className={form.permissions.length === 0 ? "text-zinc-400" : "text-white"}>
                      {form.permissions.length === 0 
                        ? "Select permissions..." 
                        : `${form.permissions.length} permission${form.permissions.length > 1 ? 's' : ''} selected`}
                    </span>
                    <ChevronDown size={16} className={`text-zinc-400 transition-transform ${isPermissionsOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isPermissionsOpen && (
                    <div className="absolute z-10 mt-2 w-full rounded-2xl border border-white/10 bg-[#121217] shadow-xl overflow-hidden">
                      <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                        {PERMISSION_OPTIONS.map((option) => {
                          const checked = form.permissions.includes(option.value)
                          return (
                            <label
                              key={option.value}
                              className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition ${checked ? 'bg-amber-400/10' : 'hover:bg-white/5'}`}
                            >
                              <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${checked ? 'border-amber-400 bg-amber-400 text-black' : 'border-zinc-600 bg-transparent'}`}>
                                {checked && (
                                  <svg className="h-3 w-3" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M11.6666 3.5L5.24992 9.91667L2.33325 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                )}
                              </div>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => handlePermissionToggle(option.value)}
                                className="sr-only"
                              />
                              <div className="flex flex-col">
                                <span className={`text-sm font-medium ${checked ? 'text-amber-300' : 'text-zinc-200'}`}>{option.label}</span>
                                <span className={`text-xs ${checked ? 'text-amber-200/70' : 'text-zinc-400'}`}>{option.description}</span>
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
                
                {form.permissions.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {form.permissions.map(val => {
                      const opt = PERMISSION_OPTIONS.find(o => o.value === val)
                      return (
                        <span key={val} className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/20 bg-amber-200/10 py-1 pl-3 pr-1.5 text-xs text-amber-100 transition hover:border-amber-200/40 hover:bg-amber-200/20">
                          {opt?.label}
                          <button 
                            type="button" 
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handlePermissionToggle(val)
                            }} 
                            className="flex h-5 w-5 items-center justify-center rounded-full text-amber-200/50 transition hover:bg-amber-200/20 hover:text-amber-200"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.26em] text-zinc-500">Status</span>
                <select
                  value={form.status}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-200/25"
                >
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </select>
              </label>
            </div>

         

            {error ? (
              <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300/90 to-amber-100 px-5 py-3 text-sm font-medium text-black transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={16} />
                {saving ? 'Saving...' : mode === 'edit' ? 'Save User' : 'Create User'}
              </button>
              {selectedUser ? (
                <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
                  Editing #{selectedUser.id} {selectedUser.email}
                </p>
              ) : null}
            </div>
          </form>
        </div>


{/* lay chap */}
        <div className="space-y-6">

{/* search */}
          <div className="panel-surface panel-border  panel-shadow rounded-[2rem] p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <button
                type="button"
                onClick={() => setIsFiltersOpen((prev) => !prev)}
                className="flex items-center justify-between text-left lg:cursor-default lg:pointer-events-none outline-none"
              >
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Filters</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">Browse team members</h2>
                </div>
                <ChevronDown size={20} className={`text-zinc-500 transition-transform lg:hidden ${isFiltersOpen ? 'rotate-180' : ''}`} />
              </button>
              <div className={`flex-1 flex-col gap-3 md:flex-row lg:max-w-3xl ${isFiltersOpen ? 'flex' : 'hidden lg:flex'}`}>
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                  <input
                    value={filters.q}
                    onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
                    placeholder="Search by name, email, or role"
                    className="w-full rounded-2xl border border-white/10 bg-black/20 py-3 pl-11 pr-4 text-sm text-white outline-none transition focus:border-amber-200/25"
                  />
                </div>
                <select
                  value={filters.role}
                  onChange={(event) => setFilters((current) => ({ ...current, role: event.target.value }))}
                  className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-200/25"
                >
                  <option value="">All roles</option>
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {roleLabel(role)}
                    </option>
                  ))}
                </select>
                <select
                  value={filters.status}
                  onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
                  className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-200/25"
                >
                  <option value="">Any status</option>
                  <option value="1">Active only</option>
                  <option value="0">Inactive only</option>
                </select>
              </div>
            </div>
          </div>

{/* table */}
          <div className="panel-surface panel-border panel-shadow rounded-[2rem] p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Directory</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Team members</h2>
              </div>
              <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400">
                {loading ? 'Loading...' : `${formatNumber(items.length)} member(s)`}
              </div>
            </div>

            <div className="mt-6 space-y-4 overflow-y-auto h-[32rem]">
              {!loading && items.length === 0 ? (
                <div className="rounded-[1.75rem] border border-dashed border-white/10 bg-black/10 px-6 py-12 text-center">
                  <Users className="mx-auto text-zinc-500" size={26} />
                  <p className="mt-4 text-sm text-zinc-300">No team members match the current filters.</p>
                </div>
              ) : null}

              {items.map((teamMember) => {
                const isCurrentUser = currentUser?.id === teamMember.id

                return (
                  <article
                    key={teamMember.id}
                    className="rounded-[1.6rem]   border border-white/8 bg-[#0c0c0f]/80 p-5"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300">
                            #{teamMember.id}
                          </span>
                          <span className={`rounded-full border px-3 py-1 text-xs font-medium ${toneForRole(teamMember.role)}`}>
                            {roleLabel(teamMember.role)}
                          </span>
                          <span className={`rounded-full border px-3 py-1 text-xs font-medium ${toneForStatus(teamMember.status)}`}>
                            {teamMember.status ? 'Active' : 'Inactive'}
                          </span>
                          {isCurrentUser ? (
                            <span className="rounded-full border border-amber-200/20 bg-amber-200/10 px-3 py-1 text-xs text-amber-100">
                              Current user
                            </span>
                          ) : null}
                        </div>

                        <h3 className="mt-4 flex items-center gap-3 text-lg font-semibold text-white">
                          <UserRound size={18} className="text-amber-100" />
                          <span className="truncate">{teamMember.name}</span>
                        </h3>

                        <p className="mt-2 flex items-center gap-2 text-sm text-zinc-400">
                          <Mail size={15} />
                          <span className="truncate">{teamMember.email}</span>
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                          <span>Permissions {formatNumber(teamMember.permissionsCount)}</span>
                          <span>Updated {formatDateTime(teamMember.updatedAt)}</span>
                        </div>

                        {teamMember.permissions?.length ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {teamMember.permissions.map((permission) => (
                              <span
                                key={`${teamMember.id}-${permission}`}
                                className="rounded-full border border-white/8 bg-black/25 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-zinc-400"
                              >
                                {permission}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(teamMember)}
                          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200 transition hover:text-white"
                        >
                          <UserCog size={15} />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(teamMember.id)}
                          disabled={deletingId === teamMember.id || isCurrentUser}
                          className="inline-flex items-center gap-2 rounded-2xl border border-rose-400/15 bg-rose-500/10 px-4 py-2 text-sm text-rose-200 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Trash2 size={15} />
                          Delete
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        </div>
      </section>

   
    </div>
  )
}
