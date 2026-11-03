import { useMemo, useState } from 'react'
import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { addRule, deleteMonth, getCategories, getMonth, setCategory } from '../../server/api'
import { BudgetBar, Card, CategorySelect, Pill, SectionTitle, Stat } from '../../components/ui'
import { NEEDS_LABEL, directionLabel, monthLabel, short, signed, toman } from '../../lib/format'
import type { NeedGroup, Transaction } from '../../lib/types'

export const Route = createFileRoute('/_app/month/$ym')({
  loader: async ({ params }) => {
    const [detail, categories] = await Promise.all([getMonth({ data: { ym: params.ym } }), getCategories()])
    return { detail, categories }
  },
  component: MonthPage,
})

function MonthPage() {
  const { detail, categories } = Route.useLoaderData()
  const { ym } = Route.useParams()
  const { summary: s, categories: lines, needs, transactions } = detail
  const names = categories.map((c) => c.name)
  const spending = lines.filter((l) => l.kind === 'spending')
  const income = lines.filter((l) => l.kind === 'income' && l.count > 0)
  const transfers = lines.filter((l) => l.kind === 'transfer' && l.count > 0)
  const totalBudget = spending.reduce((a, l) => a + l.budget, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{monthLabel(ym)}</h1>
          <p className="text-sm text-muted">
            {s.firstDate} تا {s.lastDate} · {s.count} تراکنش · مانده از {short(s.opening)} به {short(s.closing)}
          </p>
        </div>
        <MonthActions ym={ym} transactions={transactions} />
      </div>

      <Card>
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          <Stat label="درآمد" value={s.income} tone="in" />
          <Stat label="هزینه" value={s.spending} tone="out" hint={totalBudget ? `بودجه ${short(totalBudget)}` : undefined} />
          <Stat label="پس‌انداز" value={s.saved} tone={s.saved >= 0 ? 'gold' : 'out'} hint={s.income ? `${Math.round((s.saved / s.income) * 100)}٪ درآمد` : undefined} />
          <Stat label="نامشخص" value={s.unlabeledOut} tone="warn" hint={`${s.needsLabel} مورد · جزو هزینه حساب شده`} />
        </div>
      </Card>

      {needs.length > 0 && <NeedsLabel needs={needs} names={names} />}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <SectionTitle aside={<span className="text-xs text-muted">نوار = خرج شده · خط = بودجه</span>}>هزینه در برابر بودجه</SectionTitle>
          <ul className="space-y-3">
            {spending
              .filter((l) => l.count > 0 || l.budget > 0)
              .sort((a, b) => b.net - a.net)
              .map((l) => (
                <li key={l.name}>
                  <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium">{l.name}</span>
                    <span className="num">
                      <span className={l.budget > 0 && l.net > l.budget ? 'font-bold text-out' : 'font-semibold'}>{short(l.net)}</span>
                      {l.budget > 0 && <span className="text-muted"> / {short(l.budget)}</span>}
                    </span>
                  </div>
                  <BudgetBar spent={l.net} budget={l.budget} />
                </li>
              ))}
          </ul>
        </Card>
        <div className="space-y-6">
          <Card>
            <SectionTitle>پول ورودی</SectionTitle>
            <SimpleList lines={income.map((l) => ({ name: l.name, value: l.net }))} tone="text-in" empty="این ماه درآمدی ثبت نشده." />
          </Card>
          <Card>
            <SectionTitle>جابه‌جا شده، خرج نشده</SectionTitle>
            <SimpleList
              lines={transfers.map((l) => ({ name: l.name, value: l.out, extra: l.in ? `واریز ${short(l.in)}` : '' }))}
              tone="text-muted"
              empty="جابه‌جایی بین حساب‌ها نبود."
            />
            <p className="mt-3 text-xs text-muted">حساب‌های خودت، وام برادرت و پولی که برگشته جزو هزینه نیست.</p>
          </Card>
        </div>
      </div>

      <Transactions transactions={transactions} names={names} />
    </div>
  )
}

function SimpleList({ lines, tone, empty }: { lines: { name: string; value: number; extra?: string }[]; tone: string; empty: string }) {
  if (lines.length === 0) return <p className="text-sm text-muted">{empty}</p>
  return (
    <ul className="divide-y divide-line text-sm">
      {lines.map((l) => (
        <li key={l.name} className="flex justify-between gap-3 py-2">
          <span>{l.name}</span>
          <span className="num">
            <span className={`font-semibold ${tone}`}>{short(l.value)}</span>
            {l.extra && <span className="ms-2 text-xs text-muted">{l.extra}</span>}
          </span>
        </li>
      ))}
    </ul>
  )
}

function NeedsLabel({ needs, names }: { needs: NeedGroup[]; names: string[] }) {
  return (
    <Card className="border-warn/40">
      <SectionTitle aside={<span className="text-xs text-muted">یک بار دسته را انتخاب کن، ماه بعد خودکار دسته‌بندی می‌شود.</span>}>
        این کیست؟ <Pill tone="warn">{needs.length}</Pill>
      </SectionTitle>
      <ul className="divide-y divide-line">
        {needs.map((g) => (
          <NeedRow key={`${g.direction}|${g.party}`} g={g} names={names} />
        ))}
      </ul>
    </Card>
  )
}

function NeedRow({ g, names }: { g: NeedGroup; names: string[] }) {
  const router = useRouter()
  const add = useServerFn(addRule)
  const [cat, setCat] = useState('')
  const [busy, setBusy] = useState(false)
  const choices = names.filter((n) => n !== NEEDS_LABEL)
  const id = `need-${g.direction}-${g.match || g.party}`.replace(/\s+/g, '-')
  return (
    <li className="grid gap-3 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={g.direction === 'in' ? 'in' : 'out'}>{directionLabel[g.direction]}</Pill>
          <span className="fa font-bold">{g.party || 'نامعلوم'}</span>
          <span className="num text-sm text-muted">
            {g.count} بار · {toman(g.total)} تومان
          </span>
        </div>
        <p className="fa mt-1 truncate text-xs text-muted" title={g.sample}>{g.sample}</p>
      </div>
      <div className="flex gap-2">
        <label htmlFor={id} className="sr-only">دسته برای {g.party}</label>
        <select
          id={id}
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-line bg-paper px-2 py-1.5 text-sm sm:w-56"
        >
          <option value="">انتخاب دسته…</option>
          {choices.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button
          disabled={!cat || busy || !g.match}
          title={g.match ? `یک قانون ذخیره می‌شود: «${g.match}» ← ${cat || '…'}` : 'نام ثابتی برای به خاطر سپردن ندارد؛ هر تراکنش را پایین‌تر جدا تعیین کن.'}
          className="rounded-lg bg-ink px-3 py-1.5 text-sm font-semibold text-paper disabled:opacity-40"
          onClick={async () => {
            setBusy(true)
            await add({ data: { match: g.match, direction: g.direction, amount: 0, category: cat, note: g.party } })
            await router.invalidate()
            setBusy(false)
          }}
        >
          {busy ? 'در حال ذخیره…' : 'ذخیره'}
        </button>
      </div>
    </li>
  )
}

function Transactions({ transactions, names }: { transactions: Transaction[]; names: string[] }) {
  const router = useRouter()
  const save = useServerFn(setCategory)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('')
  const [limit, setLimit] = useState(40)
  const shown = useMemo(
    () =>
      transactions.filter(
        (t) => (filter === '' || t.category === filter) && (!q || t.desc.includes(q) || t.party.includes(q) || t.category.toLowerCase().includes(q.toLowerCase())),
      ),
    [transactions, q, filter],
  )
  const used = [...new Set(transactions.map((t) => t.category))].sort()
  return (
    <Card>
      <SectionTitle aside={<span className="text-xs text-muted">{shown.length} مورد</span>}>همه تراکنش‌ها</SectionTitle>
      <div className="mb-3 flex flex-wrap gap-2">
        <label htmlFor="tx-search" className="sr-only">جستجو</label>
        <input
          id="tx-search"
          placeholder="جستجوی نام، فروشگاه یا دسته"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-line bg-paper px-3 py-1.5 text-sm"
        />
        <label htmlFor="tx-filter" className="sr-only">فیلتر دسته</label>
        <select id="tx-filter" value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-lg border border-line bg-paper px-2 py-1.5 text-sm">
          <option value="">همه دسته‌ها</option>
          {used.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      {/* Phones: two lines per transaction (who + amount, then date + category). Wider: one row of four columns. */}
      <div className="hidden grid-cols-[4.5rem_minmax(0,1fr)_8rem_14rem] gap-x-3 border-b border-line py-2 text-xs font-bold text-muted sm:grid">
        <span>تاریخ</span>
        <span>طرف حساب / شرح</span>
        <span className="text-end">مبلغ</span>
        <span>دسته</span>
      </div>
      <ul className="text-sm">
        {shown.slice(0, limit).map((t) => (
          <li
            key={t.id}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2 border-b border-line/60 py-3 sm:grid-cols-[4.5rem_minmax(0,1fr)_8rem_14rem] sm:py-2"
          >
            <div className="num order-3 self-center text-xs text-muted sm:order-1 sm:self-start sm:text-sm sm:text-ink">
              {t.date.slice(5)}
              <span className="sm:hidden"> · </span>
              <div className="inline text-xs text-muted sm:block">{t.time.slice(0, 5)}</div>
            </div>
            <div className="order-1 min-w-0 sm:order-2">
              <div className="fa font-medium">{t.party || '—'}</div>
              <div className="fa line-clamp-2 text-xs text-muted" title={t.desc}>{t.desc}</div>
            </div>
            <div className={`num order-2 text-end font-bold whitespace-nowrap sm:order-3 ${t.credit ? 'text-in' : 'text-out'}`}>
              {signed(t.credit || t.debit, t.credit ? '+' : '−')}
            </div>
            <div className="order-4 w-44 sm:w-auto">
              <CategorySelect
                value={t.category}
                categories={names}
                onChange={async (v) => {
                  await save({ data: { id: t.id, category: v } })
                  await router.invalidate()
                }}
              />
              {t.source === 'override' && <p className="mt-0.5 text-xs text-muted">دستی تعیین شده</p>}
            </div>
          </li>
        ))}
      </ul>
      {shown.length > limit && (
        <button onClick={() => setLimit(limit + 80)} className="mt-4 w-full rounded-lg border border-line py-2.5 text-sm font-semibold">
          نمایش بیشتر ({shown.length - limit} مورد دیگر)
        </button>
      )}
    </Card>
  )
}

function MonthActions({ ym, transactions }: { ym: string; transactions: Transaction[] }) {
  const navigate = useNavigate()
  const remove = useServerFn(deleteMonth)
  const [confirming, setConfirming] = useState(false)

  const downloadCsv = () => {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
    const rows = [
      ['تاریخ', 'ساعت', 'دسته', 'طرف حساب', 'برداشت (تومان)', 'واریز (تومان)', 'مانده (تومان)', 'شرح'],
      ...transactions.map((t) => [t.date, t.time, t.category, t.party, t.debit / 10, t.credit / 10, t.balance / 10, t.desc]),
    ]
    const blob = new Blob(['﻿' + rows.map((r) => r.map(esc).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `money-${ym}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button onClick={downloadCsv} className="rounded-lg border border-line bg-card px-3 py-1.5 text-sm font-semibold">
        دانلود اکسل (CSV)
      </button>
      {confirming ? (
        <>
          <span className="text-sm text-out">تراکنش‌های این ماه حذف شود؟</span>
          <button
            className="rounded-lg bg-out px-3 py-1.5 text-sm font-semibold text-white"
            onClick={async () => {
              await remove({ data: { ym } })
              await navigate({ to: '/' })
            }}
          >
            حذف
          </button>
          <button className="text-sm text-muted" onClick={() => setConfirming(false)}>
            نگه دار
          </button>
        </>
      ) : (
        <button onClick={() => setConfirming(true)} className="rounded-lg px-3 py-1.5 text-sm text-muted hover:text-out">
          حذف ماه
        </button>
      )}
    </div>
  )
}
