// عميل REST للواجهات - Wasel API Client
export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new ApiError(json?.error || `خطأ ${res.status}`, res.status)
  }
  return json as T
}

export const apiPost = <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
  api<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined, headers })

export const apiGet = <T>(path: string) => api<T>(path)
