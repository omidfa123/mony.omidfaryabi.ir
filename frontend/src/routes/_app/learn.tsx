import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { getPlan, savePlan } from '../../server/api'
import { Card, Progress } from '../../components/ui'
import { plan } from '../../lib/plan'

export const Route = createFileRoute('/_app/learn')({
  loader: () => getPlan(),
  component: LearnPage,
})

function LearnPage() {
  const initial = Route.useLoaderData()
  const save = useServerFn(savePlan)
  const [done, setDone] = useState<Record<string, boolean>>(initial ?? {})
  const total = plan.reduce((a, w) => a + w.steps.length, 0)
  const count = Object.values(done).filter(Boolean).length

  const toggle = async (id: string) => {
    const next = { ...done, [id]: !done[id] }
    setDone(next)
    await save({ data: next })
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">برنامه ۸ هفته‌ای تا ماشین</h1>
        <p className="text-muted">هر هفته یک موضوع. هر کاری انجام دادی تیک بزن؛ پیشرفتت ذخیره می‌شود.</p>
        <div className="mt-4 flex items-center gap-3">
          <Progress value={count} max={total} tone="in" />
          <span className="num shrink-0 text-sm font-semibold">{count}/{total}</span>
        </div>
      </div>

      {plan.map((w) => {
        const wDone = w.steps.filter((s) => done[s.id]).length
        return (
          <Card key={w.week}>
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h2 className="text-lg font-bold">
                <span className="text-muted">هفته {w.week} · </span>
                {w.theme}
              </h2>
              <span className="num text-xs text-muted">{wDone}/{w.steps.length}</span>
            </div>
            <ul className="space-y-3">
              {w.steps.map((s) => (
                <li key={s.id} className="flex gap-3">
                  <input
                    id={s.id}
                    type="checkbox"
                    checked={!!done[s.id]}
                    onChange={() => toggle(s.id)}
                    className="mt-1 h-4 w-4 shrink-0 accent-[var(--in)]"
                  />
                  <label htmlFor={s.id} className="min-w-0">
                    <span className={`font-bold ${done[s.id] ? 'text-muted line-through' : ''}`}>{s.title}</span>
                    <span className="block text-sm text-muted">{s.detail}</span>
                    {s.link && (
                      <a href={s.link.href} target="_blank" rel="noreferrer" className="text-sm text-accent underline">
                        {s.link.label} ↖
                      </a>
                    )}
                  </label>
                </li>
              ))}
            </ul>
          </Card>
        )
      })}
    </div>
  )
}
