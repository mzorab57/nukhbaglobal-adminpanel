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
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(!isFormData && body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  })

  let payload = null

  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok || payload?.status === false || payload?.success === false) {
    throw new ApiError(
      payload?.message || 'Request failed.',
      response.status,
      payload,
    )
  }

  return payload
}

export async function uploadImage(token, file, directory = 'media') {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('directory', directory)

  const response = await apiRequest('/api/admin/uploads/image', {
    method: 'POST',
    token,
    body: formData,
  })

  return response.data
}
