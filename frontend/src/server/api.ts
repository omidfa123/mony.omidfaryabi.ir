// Server functions: the browser only talks to this TanStack Start server,
// which forwards each call (with the session cookie) to the Go API on the
// private Docker network. The Go API is never exposed to the internet.
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader, setResponseHeader } from '@tanstack/react-start/server'
import { redirect } from '@tanstack/react-router'
import type {
  Category,
  Goal,
  MonthDetail,
  MonthSummary,
  Rule,
  Settings,
  UploadResult,
} from '../lib/types'

async function api<T>(path: string, init: RequestInit = {}, allowAnon = false): Promise<T> {
  const base = process.env.API_URL ?? 'http://localhost:8080'
  const headers = new Headers(init.headers)
  const cookie = getRequestHeader('cookie')
  if (cookie) headers.set('cookie', cookie)
  const res = await fetch(`${base}/api${path}`, { ...init, headers })
  const setCookies = res.headers.getSetCookie?.() ?? []
  if (setCookies.length) setResponseHeader('set-cookie', setCookies)
  if (res.status === 401 && !allowAnon) throw redirect({ to: '/login' })
  const text = await res.text()
  const body = text ? JSON.parse(text) : null
  if (!res.ok) throw new Error(body?.error ?? `درخواست ناموفق بود (${res.status})`)
  return body as T
}

const json = (method: string, data: unknown): RequestInit => ({
  method,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(data),
})

export const getMe = createServerFn({ method: 'GET' }).handler(() =>
  api<{ signedIn: boolean }>('/me', {}, true),
)

export const login = createServerFn({ method: 'POST' })
  .validator((d: { password: string }) => d)
  .handler(async ({ data }) => {
    try {
      await api('/login', json('POST', data), true)
      return { ok: true as const, error: '' }
    } catch (e) {
      return { ok: false as const, error: (e as Error).message }
    }
  })

export const logout = createServerFn({ method: 'POST' }).handler(() => api('/logout', { method: 'POST' }, true))

export const getMonths = createServerFn({ method: 'GET' }).handler(() => api<MonthSummary[]>('/months'))

export const getMonth = createServerFn({ method: 'GET' })
  .validator((d: { ym: string }) => d)
  .handler(({ data }) => api<MonthDetail>(`/months/${encodeURIComponent(data.ym)}`))

export const deleteMonth = createServerFn({ method: 'POST' })
  .validator((d: { ym: string }) => d)
  .handler(({ data }) => api(`/months/${encodeURIComponent(data.ym)}`, { method: 'DELETE' }))

export const uploadStatement = createServerFn({ method: 'POST' })
  .validator((d) => {
    if (!(d instanceof FormData)) throw new Error('فایلی ارسال نشد')
    return d
  })
  .handler(async ({ data }) => {
    try {
      const result = await api<UploadResult>('/upload', { method: 'POST', body: data })
      return { ok: true as const, result, error: '' }
    } catch (e) {
      if (e instanceof Error) return { ok: false as const, result: null, error: e.message }
      throw e
    }
  })

export const setCategory = createServerFn({ method: 'POST' })
  .validator((d: { id: string; category: string }) => d)
  .handler(({ data }) =>
    api(`/transactions/${encodeURIComponent(data.id)}/category`, json('PUT', { category: data.category })),
  )

export const addRule = createServerFn({ method: 'POST' })
  .validator((d: Rule) => d)
  .handler(({ data }) => api('/rules', json('POST', data)))

export const getRules = createServerFn({ method: 'GET' }).handler(() => api<Rule[]>('/rules'))
export const saveRules = createServerFn({ method: 'POST' })
  .validator((d: Rule[]) => d)
  .handler(({ data }) => api('/rules', json('PUT', data)))

export const getCategories = createServerFn({ method: 'GET' }).handler(() => api<Category[]>('/categories'))
export const saveCategories = createServerFn({ method: 'POST' })
  .validator((d: Category[]) => d)
  .handler(({ data }) => api('/categories', json('PUT', data)))

export const getSettings = createServerFn({ method: 'GET' }).handler(() => api<Settings>('/settings'))
export const saveSettings = createServerFn({ method: 'POST' })
  .validator((d: Settings) => d)
  .handler(({ data }) => api('/settings', json('PUT', data)))

export const getGoal = createServerFn({ method: 'GET' }).handler(() => api<Goal>('/goal'))

export const getPlan = createServerFn({ method: 'GET' }).handler(() => api<Record<string, boolean>>('/plan'))
export const savePlan = createServerFn({ method: 'POST' })
  .validator((d: Record<string, boolean>) => d)
  .handler(({ data }) => api('/plan', json('PUT', data)))
