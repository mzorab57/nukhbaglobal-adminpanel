const DEFAULT_API_BASE_URL = 'http://127.0.0.1:8000'

export class ApiError extends Error {
  constructor(message, status, payload = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

function resolveApiBaseUrl() {
  const configured = import.meta.env.VITE_API_BASE_URL

  if (typeof configured === 'string' && configured.trim() !== '') {
    return configured.replace(/\/+$/, '')
  }

  return DEFAULT_API_BASE_URL
}

export const API_BASE_URL = resolveApiBaseUrl()

export async function apiRequest(path, options = {}) {
  const { method = 'GET', token = null, headers = {}, body } = options

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  let payload = null

  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok || payload?.success === false) {
    throw new ApiError(
      payload?.message || 'Request failed.',
      response.status,
      payload,
    )
  }

  return payload
}
