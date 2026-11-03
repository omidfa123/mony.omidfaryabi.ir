import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { getCategories, getRules, getSettings, saveCategories, saveRules, saveSettings } from '../../server/api'
import { Card, SectionTitle } from '../../components/ui'
import { NEEDS_LABEL, directionLabel, kindLabel, toman } from '../../lib/format'
import type { Category, Kind, Rule, Settings } from '../../lib/types'

export const Route = createFileRoute('/_app/settings')({
  loader: async () => {
    const [settings, categories, rules] = await Promise.all([getSettings(), getCategories(), getRules()])
    return { settings, categories, rules }
  },
  component: SettingsPage,
})

const input = 'w-full min-w-0 rounded-lg border border-line bg-paper px-3 py-2 text-sm'

function SettingsPage() {
  const data = Route.useLoaderData()
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">تنظیمات</h1>
        <p className="text-muted">هدف، بودجه ماهانه و قوانین دسته‌بندی تراکنش‌ها. همه مبالغ به تومان.</p>
      </div>
      <GoalSettings initial={data.settings} />
      <Budgets initial={data.categories} />
      <Rules initial={data.rules} categories={data.categories.map((c) => c.name)} />
    </div>
  )
}

function SaveBar({ busy, saved, onSave }: { busy: boolean; saved: boolean; onSave: () => void }) {
  return (
    <div className="mt-4 flex items-center gap-3">
      <button onClick={onSave} disabled={busy} className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-paper disabled:opacity-50">
        {busy ? 'در حال ذخیره…' : 'ذخیره'}
      </button>
      {saved && <span className="text-sm text-in">ذخیره شد</span>}
    </div>
  )
}

function useSaver<T>(fn: (args: { data: T }) => Promise<unknown>) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const run = async (data: T) => {
    setBusy(true)
    setSaved(false)
    await fn({ data })
    await router.invalidate()
    setBusy(false)
    setSaved(true)
  }
  return { busy, saved, run }
}

function GoalSettings({ initial }: { initial: Settings }) {
  const [s, setS] = useState(initial)
  const saver = useSaver(useServerFn(saveSettings))
  const num = (k: keyof Settings, label: string) => (
    <div>
      <label htmlFor={`set-${k}`} className="text-xs font-bold text-muted">{label}</label>
      <input
        id={`set-${k}`}
        type="number"
        inputMode="numeric"
        className={`${input} num mt-1`}
        value={s[k] as number}
        onChange={(e) => setS({ ...s, [k]: Number(e.target.value) || 0 })}
      />
    </div>
  )
  return (
    <Card>
      <SectionTitle>هدف و مشخصات</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {num('carPrice', 'قیمت ماشین')}
        {num('plannedLoan', 'وام در نظر گرفته شده')}
        {num('emergencyFund', 'صندوق اضطراری')}
        {num('monthlyTarget', 'هدف پس‌انداز ماهانه')}
        {num('savingsStart', 'پس‌انداز در شروع')}
        <div>
          <label htmlFor="set-start-month" className="text-xs font-bold text-muted">ماه شروع (مثلاً 1405-08)</label>
          <input id="set-start-month" dir="ltr" className={`${input} num mt-1`} value={s.savingsStartMonth} onChange={(e) => setS({ ...s, savingsStartMonth: e.target.value })} />
        </div>
        <div>
          <label htmlFor="set-owner" className="text-xs font-bold text-muted">نامت در صورتحساب</label>
          <input id="set-owner" dir="auto" className={`${input} fa mt-1`} value={s.ownerName} onChange={(e) => setS({ ...s, ownerName: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="set-cards" className="text-xs font-bold text-muted">شماره کارت‌های خودت (با کاما جدا کن)</label>
          <input
            id="set-cards"
            dir="ltr"
            className={`${input} num mt-1`}
            value={s.ownCards.join(', ')}
            onChange={(e) => setS({ ...s, ownCards: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })}
          />
        </div>
      </div>
      <SaveBar busy={saver.busy} saved={saver.saved} onSave={() => saver.run(s)} />
    </Card>
  )
}

const kinds: Kind[] = ['spending', 'income', 'transfer']

function Budgets({ initial }: { initial: Category[] }) {
  const [cats, setCats] = useState(initial)
  const [newName, setNewName] = useState('')
  const saver = useSaver(useServerFn(saveCategories))
  const totalBudget = cats.filter((c) => c.kind === 'spending').reduce((a, c) => a + c.budget, 0)
  return (
    <Card>
      <SectionTitle aside={<span className="num text-sm text-muted">جمع بودجه هزینه {toman(totalBudget)} تومان</span>}>دسته‌ها و بودجه</SectionTitle>
      {/* Phones: name + remove, then type + budget. Wider: one row of four columns. */}
      <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_4rem] gap-x-3 border-b border-line py-2 text-xs font-bold text-muted sm:grid">
        <span>دسته</span>
        <span>نوع</span>
        <span>بودجه ماهانه</span>
        <span />
      </div>
      <ul className="text-sm">
        {cats.map((c, i) =>
          c.name === NEEDS_LABEL ? null : (
            <li
              key={c.name}
              className="grid grid-cols-2 items-center gap-x-3 gap-y-2 border-b border-line/60 py-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_4rem] sm:py-1.5"
            >
              <span className="font-medium">{c.name}</span>
              <div className="order-3 sm:order-none">
                <label htmlFor={`kind-${i}`} className="sr-only">نوع {c.name}</label>
                <select id={`kind-${i}`} className={input} value={c.kind} onChange={(e) => setCats(cats.map((x, j) => (j === i ? { ...x, kind: e.target.value as Kind } : x)))}>
                  {kinds.map((k) => <option key={k} value={k}>{kindLabel[k]}</option>)}
                </select>
              </div>
              <div className="order-4 sm:order-none">
                <label htmlFor={`budget-${i}`} className="sr-only">بودجه {c.name}</label>
                <input
                  id={`budget-${i}`}
                  type="number"
                  inputMode="numeric"
                  disabled={c.kind !== 'spending'}
                  className={`${input} num disabled:opacity-40`}
                  value={c.budget}
                  onChange={(e) => setCats(cats.map((x, j) => (j === i ? { ...x, budget: Number(e.target.value) || 0 } : x)))}
                />
              </div>
              <div className="order-2 text-end sm:order-none">
                <button className="text-xs text-muted hover:text-out" onClick={() => setCats(cats.filter((_, j) => j !== i))}>حذف</button>
              </div>
            </li>
          ),
        )}
      </ul>
      <div className="mt-3 flex gap-2">
        <label htmlFor="new-cat" className="sr-only">دسته جدید</label>
        <input id="new-cat" placeholder="نام دسته جدید" className={input} value={newName} onChange={(e) => setNewName(e.target.value)} />
        <button
          className="shrink-0 rounded-lg border border-line px-3 text-sm font-semibold"
          disabled={!newName.trim() || cats.some((c) => c.name === newName.trim())}
          onClick={() => {
            setCats([...cats.filter((c) => c.name !== NEEDS_LABEL), { name: newName.trim(), kind: 'spending', budget: 0 }, ...cats.filter((c) => c.name === NEEDS_LABEL)])
            setNewName('')
          }}
        >
          افزودن
        </button>
      </div>
      <SaveBar busy={saver.busy} saved={saver.saved} onSave={() => saver.run(cats)} />
    </Card>
  )
}

function Rules({ initial, categories }: { initial: Rule[]; categories: string[] }) {
  const [rules, setRules] = useState(initial)
  const [draft, setDraft] = useState<Rule>({ match: '', direction: 'out', amount: 0, category: categories[0] ?? '', note: '' })
  const saver = useSaver(useServerFn(saveRules))
  return (
    <Card>
      <SectionTitle aside={<span className="text-xs text-muted">از بالا به پایین بررسی می‌شود؛ اولین قانون منطبق اعمال می‌شود.</span>}>قوانین دسته‌بندی</SectionTitle>
      <div className="mb-4 grid gap-2 rounded-xl border border-dashed border-line p-3 sm:grid-cols-[2fr_1fr_1fr_2fr_auto]">
        <label htmlFor="rule-match" className="sr-only">متن برای تطبیق</label>
        <input id="rule-match" dir="auto" placeholder="نام، فروشگاه، شماره کارت یا پایانه" className={`${input} fa`} value={draft.match} onChange={(e) => setDraft({ ...draft, match: e.target.value })} />
        <label htmlFor="rule-dir" className="sr-only">جهت</label>
        <select id="rule-dir" className={input} value={draft.direction} onChange={(e) => setDraft({ ...draft, direction: e.target.value as Rule['direction'] })}>
          <option value="out">برداشت</option>
          <option value="in">واریز</option>
          <option value="any">هر دو</option>
        </select>
        <label htmlFor="rule-amount" className="sr-only">مبلغ دقیق به ریال</label>
        <input id="rule-amount" type="number" placeholder="مبلغ دقیق ریال (اختیاری)" className={`${input} num`} value={draft.amount || ''} onChange={(e) => setDraft({ ...draft, amount: Number(e.target.value) || 0 })} />
        <label htmlFor="rule-cat" className="sr-only">دسته</label>
        <select id="rule-cat" className={input} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
          {categories.filter((c) => c !== NEEDS_LABEL).map((c) => <option key={c}>{c}</option>)}
        </select>
        <button
          className="rounded-lg bg-ink px-3 py-2 text-sm font-semibold text-paper disabled:opacity-40"
          disabled={!draft.match && !draft.amount}
          onClick={() => {
            setRules([draft, ...rules])
            setDraft({ ...draft, match: '', amount: 0, note: '' })
          }}
        >
          افزودن قانون
        </button>
      </div>
      <ul className="divide-y divide-line text-sm">
        {rules.map((r, i) => (
          <li key={`${r.match}-${r.direction}-${r.amount}-${i}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
            <span className="fa min-w-0 font-semibold">{r.match || `دقیقاً ${toman(r.amount / 10)} تومان`}</span>
            <span className="text-xs text-muted">{directionLabel[r.direction]}</span>
            <span>← <b>{r.category}</b></span>
            {r.note && <span className="text-xs text-muted">{r.note}</span>}
            <span className="ms-auto flex gap-2">
              <button className="text-xs text-muted hover:text-ink disabled:opacity-30" disabled={i === 0} onClick={() => setRules(swap(rules, i, i - 1))} aria-label="بالا">↑</button>
              <button className="text-xs text-muted hover:text-ink disabled:opacity-30" disabled={i === rules.length - 1} onClick={() => setRules(swap(rules, i, i + 1))} aria-label="پایین">↓</button>
              <button className="text-xs text-muted hover:text-out" onClick={() => setRules(rules.filter((_, j) => j !== i))}>حذف</button>
            </span>
          </li>
        ))}
      </ul>
      <SaveBar busy={saver.busy} saved={saver.saved} onSave={() => saver.run(rules)} />
    </Card>
  )
}

function swap<T>(arr: T[], a: number, b: number) {
  const next = [...arr]
  ;[next[a], next[b]] = [next[b], next[a]]
  return next
}
