const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'

let _accessToken: string | null = null

export function setAccessToken(token: string | null) {
  _accessToken = token
}

export function getAccessToken() {
  return _accessToken
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  }

  if (_accessToken) headers['Authorization'] = `Bearer ${_accessToken}`

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: 'include' })

  if (res.status === 401 && retry) {
    // Try refreshing the token
    const refreshed = await tryRefresh()
    if (refreshed) return request<T>(path, options, false)
    throw new ApiError(401, 'Session expired. Please log in again.')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    const message =
      body.error ??
      body.message ??
      (body.details ? JSON.stringify(body.details) : null) ??
      'Request failed'
    throw new ApiError(res.status, message, body)
  }

  if (res.status === 204) return undefined as unknown as T
  return res.json() as Promise<T>
}

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
    if (!res.ok) return false
    const body = await res.json()
    // Response is wrapped: { data: { accessToken, user } }
    const accessToken = body.data?.accessToken ?? body.accessToken
    if (!accessToken) return false
    setAccessToken(accessToken)
    return true
  } catch {
    return false
  }
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),

  upload: <T>(path: string, formData: FormData) =>
    request<T>(path, {
      method: 'POST',
      body: formData,
      headers: {} as Record<string, string>, // let browser set Content-Type with boundary
    }),
}
