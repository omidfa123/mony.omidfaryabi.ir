import { Link, createFileRoute } from '@tanstack/react-router'
import { getMonths } from '../../server/api'
import { Card, Pill, SectionTitle } from '../../components/ui'
import { monthLabel, monthNames, short, toman } from '../../lib/format'

export const Route = createFileRoute('/_app/')({
  loader: () => getMonths(),
  component: MonthsPage,
})

function MonthsPage() {
  const months = Route.useLoaderData()

  if (months.length === 0) {
    return (
      <Card className="mx-auto max-w-xl text-center">
        <h1 className="text-2xl font-bold">هنوز صورتحسابی نداری</h1>
        <p className="mt-2 text-muted">
          آخر هر ماه فایل PDF «گردش سپرده» را از اپ رسالت بگیر و اینجا بارگذاری کن. همه تراکنش‌ها دسته‌بندی می‌شوند و
          می‌بینی پولت کجا رفته.
        </p>
        <Link to="/upload" className="mt-6 inline-block rounded-lg bg-ink px-5 py-2.5 font-semibold text-paper">
          بارگذاری اولین صورتحساب
        </Link>
      </Card>
    )
  }

  const maxAbs = Math.max(...months.map((m) => Math.max(m.income, m.spending + m.unlabeledOut)), 1)
  const chrono = [...months].reverse()

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">ماه‌های تو</h1>
          <p className="text-muted">درآمد، هزینه و پس‌انداز هر ماه.</p>
        </div>
        <Link to="/upload" className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-paper">
          بارگذاری صورتحساب
        </Link>
      </div>

      <Card>
        <SectionTitle aside={<Legend />}>ورودی و خروجی</SectionTitle>
        <div className="flex items-end gap-3 overflow-x-auto pb-1">
          {chrono.map((m) => {
            const out = m.spending + m.unlabeledOut
            return (
              <Link key={m.month} to="/month/$ym" params={{ ym: m.month }} className="group flex min-w-16 flex-col items-center gap-1">
                <div className="flex h-36 items-end gap-1">
                  <div className="w-5 rounded-t bg-in/80 group-hover:bg-in" style={{ height: `${(m.income / maxAbs) * 100}%` }} title={`ورودی ${toman(m.income)}`} />
                  <div className="w-5 rounded-t bg-out/80 group-hover:bg-out" style={{ height: `${(out / maxAbs) * 100}%` }} title={`خروجی ${toman(out)}`} />
                </div>
                <span className="text-xs font-bold">{monthNames[Number(m.month.slice(5)) - 1]}</span>
                <span className={`num text-xs font-bold ${m.saved >= 0 ? 'text-gold' : 'text-out'}`}>{short(m.saved)}</span>
              </Link>
            )
          })}
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {months.map((m) => {
          const partial = !m.firstDate.endsWith('/01') || Number(m.lastDate.slice(8)) < 29
          return (
            <Link key={m.month} to="/month/$ym" params={{ ym: m.month }} className="block rounded-2xl border border-line bg-card p-5 transition hover:border-accent">
              <div className="flex items-start justify-between gap-2">
                <p className="text-lg font-bold">{monthLabel(m.month)}</p>
                <div className="flex flex-col items-end gap-1">
                  {partial && <Pill>{m.firstDate.slice(5)} تا {m.lastDate.slice(5)}</Pill>}
                  {m.needsLabel > 0 && <Pill tone="warn">{m.needsLabel} نامشخص</Pill>}
                </div>
              </div>
              <dl className="num mt-4 grid grid-cols-3 gap-2 text-sm">
                <div>
                  <dt className="text-xs text-muted">ورودی</dt>
                  <dd className="font-bold text-in">{short(m.income)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">خروجی</dt>
                  <dd className="font-bold text-out">{short(m.spending + m.unlabeledOut)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">پس‌انداز</dt>
                  <dd className={`font-bold ${m.saved >= 0 ? 'text-gold' : 'text-out'}`}>{short(m.saved)}</dd>
                </div>
              </dl>
            </Link>
          )
        })}
      </div>
      <p className="text-xs text-muted">مبالغ به تومان است. برای ماه‌های ناقص، بازه تاریخ صورتحساب نشان داده می‌شود.</p>
    </div>
  )
}

function Legend() {
  return (
    <div className="flex gap-4 text-xs text-muted">
      <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-sm bg-in" />ورودی</span>
      <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-sm bg-out" />خروجی</span>
      <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-sm bg-gold" />پس‌انداز</span>
    </div>
  )
}
