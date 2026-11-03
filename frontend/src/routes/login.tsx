import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { login } from '../server/api'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const router = useRouter()
  const doLogin = useServerFn(login)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <form
        className="w-full max-w-sm rounded-2xl border border-line bg-card p-8 shadow-sm"
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          setError('')
          const res = await doLogin({ data: { password } })
          setBusy(false)
          if (res.ok) {
            await router.navigate({ to: '/' })
          } else {
            setError(res.error)
          }
        }}
      >
        <p className="text-sm font-bold text-muted">حساب و کتاب</p>
        <h1 className="mt-2 text-2xl font-bold">ورود</h1>
        <p className="mt-1 text-sm text-muted">صورتحساب‌ها و پس‌اندازت فقط روی سرور خودت می‌ماند.</p>
        <label htmlFor="password" className="mt-6 block text-sm font-medium">
          رمز عبور
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          dir="ltr"
          className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 outline-none focus:border-accent"
          required
        />
        {error && <p className="mt-3 text-sm text-out">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="mt-6 w-full rounded-lg bg-ink px-4 py-2.5 font-semibold text-paper disabled:opacity-60"
        >
          {busy ? 'در حال ورود…' : 'ورود'}
        </button>
      </form>
    </main>
  )
}
