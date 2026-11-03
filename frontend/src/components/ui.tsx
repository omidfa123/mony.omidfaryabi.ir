import type { ReactNode } from 'react'
import { short, toman } from '../lib/format'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-line bg-card p-5 ${className}`}>{children}</section>
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
      <h2 className="text-lg font-bold text-balance">{children}</h2>
      {aside}
    </div>
  )
}

type Tone = 'in' | 'out' | 'gold' | 'ink' | 'warn'
const toneClass: Record<Tone, string> = {
  in: 'text-in',
  out: 'text-out',
  gold: 'text-gold',
  ink: 'text-ink',
  warn: 'text-warn',
}

export function Stat({ label, value, tone = 'ink', hint }: { label: string; value: number; tone?: Tone; hint?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-bold text-muted">{label}</p>
      <p className={`num mt-1 text-xl font-bold sm:text-2xl ${toneClass[tone]}`} title={`${toman(value)} تومان`}>
        {short(value)}
      </p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  )
}

/** Horizontal bar: spent vs budget. Over budget turns brick red. Fills from the right in RTL. */
export function BudgetBar({ spent, budget }: { spent: number; budget: number }) {
  const max = Math.max(spent, budget, 1)
  const over = budget > 0 && spent > budget
  return (
    <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-line/60">
      <div
        className={`absolute inset-y-0 start-0 rounded-full ${over ? 'bg-out' : 'bg-in'}`}
        style={{ width: `${(Math.max(spent, 0) / max) * 100}%` }}
      />
      {budget > 0 && (
        <div className="absolute inset-y-[-2px] w-0.5 bg-ink/70" style={{ insetInlineStart: `${(budget / max) * 100}%` }} title="بودجه" />
      )}
    </div>
  )
}

export function Pill({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'warn' | 'in' | 'out' }) {
  const cls = {
    muted: 'border-line text-muted',
    warn: 'border-warn/40 bg-warn/10 text-warn',
    in: 'border-in/30 bg-in/10 text-in',
    out: 'border-out/30 bg-out/10 text-out',
  }[tone]
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-bold ${cls}`}>{children}</span>
}

export function Progress({ value, max, tone = 'gold' }: { value: number; max: number; tone?: 'gold' | 'in' }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-line/60">
      <div className={`h-full rounded-full ${tone === 'gold' ? 'bg-gold' : 'bg-in'}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function CategorySelect({
  value,
  categories,
  onChange,
  id,
}: {
  value: string
  categories: string[]
  onChange: (v: string) => void
  id?: string
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full min-w-0 rounded-lg border border-line bg-paper px-2 py-1.5 text-sm"
    >
      {!categories.includes(value) && <option value={value}>{value}</option>}
      {categories.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  )
}
