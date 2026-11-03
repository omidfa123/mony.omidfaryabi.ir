import type { ReactNode } from 'react'
import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import '../styles.css'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { title: 'حساب و کتاب' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
    links: [{ rel: 'preload', href: '/fonts/iransansdnweb.woff2', as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' }],
  }),
  component: () => (
    <RootDocument>
      <Outlet />
    </RootDocument>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-md p-10 text-center">
      <p className="text-lg font-bold">این صفحه وجود ندارد.</p>
      <a className="text-accent underline" href="/">
        برگشت به صفحه اصلی
      </a>
    </div>
  ),
})

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-paper text-ink">
        {children}
        <Scripts />
      </body>
    </html>
  )
}
