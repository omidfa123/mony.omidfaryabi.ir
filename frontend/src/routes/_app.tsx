import { Link, Outlet, createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { getMe, logout } from '../server/api'

// Every page under this layout needs a signed-in session.
export const Route = createFileRoute('/_app')({
  beforeLoad: async () => {
    const me = await getMe()
    if (!me.signedIn) throw redirect({ to: '/login' })
  },
  component: AppLayout,
})

const nav = [
  { to: '/', label: 'ماه‌ها' },
  { to: '/upload', label: 'بارگذاری' },
  { to: '/goal', label: 'هدف ماشین' },
  { to: '/learn', label: 'یادگیری' },
  { to: '/settings', label: 'تنظیمات' },
] as const

function AppLayout() {
  const router = useRouter()
  const doLogout = useServerFn(logout)
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-x-6 px-4 py-3">
          <Link to="/" className="flex flex-1 items-baseline gap-2 sm:flex-none">
            <span className="text-lg font-bold">حساب و کتاب</span>
          </Link>
          <nav className="hidden flex-1 gap-1 text-sm sm:flex">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: n.to === '/' }}
                className="rounded-lg px-3 py-1.5 font-medium text-muted hover:text-ink"
                activeProps={{ className: 'bg-card text-ink shadow-sm ring-1 ring-line' }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <button
            className="text-sm text-muted hover:text-ink"
            onClick={async () => {
              await doLogout()
              await router.navigate({ to: '/login' })
            }}
          >
            خروج
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pt-6 pb-28 sm:py-8">
        <Outlet />
      </main>
      {/* Phones: tab bar at the bottom, within thumb reach. */}
      <nav className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-5 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
        {nav.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            activeOptions={{ exact: n.to === '/' }}
            className="flex flex-col items-center gap-1 py-2.5 text-xs font-medium text-muted"
            activeProps={{ className: 'text-ink' }}
          >
            {({ isActive }) => (
              <>
                <span className={`h-1 w-6 rounded-full ${isActive ? 'bg-accent' : 'bg-transparent'}`} />
                {n.label}
              </>
            )}
          </Link>
        ))}
      </nav>
    </div>
  )
}
