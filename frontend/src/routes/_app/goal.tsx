import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { getGoal } from '../../server/api'
import { Card, Progress, SectionTitle, Stat } from '../../components/ui'
import { installment, monthLabel, short, toman } from '../../lib/format'

export const Route = createFileRoute('/_app/goal')({
  loader: () => getGoal(),
  component: GoalPage,
})

function GoalPage() {
  const g = Route.useLoaderData()
  const s = g.settings
  const emergencyDone = Math.min(g.saved, s.emergencyFund)
  const downDone = Math.max(0, g.saved - s.emergencyFund)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">هدف ماشین</h1>
        <p className="text-muted">
          ماشین {short(s.carPrice)} · وام {short(s.plannedLoan)} · بقیه را پس‌انداز می‌کنی، اول هم صندوق اضطراری.{' '}
          <Link to="/settings" className="text-accent underline">تغییر</Link>
        </p>
      </div>

      <Card>
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          <Stat label="پس‌انداز تا الان" value={g.saved} tone="gold" />
          <Stat label="باقی‌مانده" value={g.remaining} tone="out" />
          <Stat label="میانگین پس‌انداز ماهانه" value={g.avgSaved} tone={g.avgSaved >= 0 ? 'in' : 'out'} hint="۳ ماه کامل اخیر" />
          <div>
            <p className="text-xs font-bold text-muted">آماده در</p>
            <p className="num mt-1 text-xl font-bold sm:text-2xl">{g.monthsAtPace < 0 ? '—' : g.monthsAtPace === 0 ? 'همین حالا' : `${g.monthsAtPace} ماه`}</p>
            <p className="mt-0.5 text-xs text-muted">{g.monthsAtTarget > 0 ? `${g.monthsAtTarget} ماه با هدف ماهانه ${short(s.monthlyTarget)}` : ''}</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle>قدم ۱ · صندوق اضطراری</SectionTitle>
          <Progress value={emergencyDone} max={s.emergencyFund} tone="in" />
          <p className="num mt-2 text-sm text-muted">{toman(emergencyDone)} از {toman(s.emergencyFund)} تومان</p>
          <p className="mt-3 text-sm">حدود ۳ ماه هزینه، جایی امن و در دسترس. برای ماشین به آن دست نزن.</p>
        </Card>
        <Card>
          <SectionTitle>قدم ۲ · پیش‌پرداخت</SectionTitle>
          <Progress value={downDone} max={g.downPayment} />
          <p className="num mt-2 text-sm text-muted">{toman(downDone)} از {toman(g.downPayment)} تومان</p>
          <p className="mt-3 text-sm">قیمت ماشین منهای وام. پیش‌پرداخت بیشتر یعنی قسط کمتر و امن‌تر.</p>
        </Card>
      </div>

      <LoanCalculator defaultAmount={s.plannedLoan} avgSaved={g.avgSaved} />

      <Card>
        <SectionTitle>ماه به ماه</SectionTitle>
        {g.history.length === 0 ? (
          <p className="text-sm text-muted">برای شروع، صورتحساب یک ماه بعد از {monthLabel(s.savingsStartMonth)} را بارگذاری کن.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="num w-full text-sm">
              <thead>
                <tr className="border-b border-line text-start text-xs text-muted">
                  <th className="py-2 text-start">ماه</th>
                  <th className="py-2 text-end">پس‌انداز</th>
                  <th className="py-2 text-end">جمع پس‌انداز</th>
                </tr>
              </thead>
              <tbody>
                {g.history.map((h) => (
                  <tr key={h.month} className="border-b border-line/60">
                    <td className="py-2">{monthLabel(h.month)} {h.partial && <span className="text-xs text-muted">(ناقص)</span>}</td>
                    <td className={`py-2 text-end font-bold ${h.saved >= 0 ? 'text-gold' : 'text-out'}`}>{short(h.saved)}</td>
                    <td className="py-2 text-end">{short(h.cumulative)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

function LoanCalculator({ defaultAmount, avgSaved }: { defaultAmount: number; avgSaved: number }) {
  const [amount, setAmount] = useState(defaultAmount)
  const [rate, setRate] = useState(23)
  const [months, setMonths] = useState(60)
  const pay = installment(amount, rate, months)
  const total = pay * months
  const comfortable = avgSaved > 0 ? pay <= avgSaved * 0.6 : false
  return (
    <Card>
      <SectionTitle aside={<span className="text-xs text-muted">سود وام خودرو بانک‌ها معمولاً حدود ۲۳٪ است</span>}>محاسبه‌گر وام</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="loan-amount" label="مبلغ وام (تومان)" value={amount} onChange={setAmount} step={10_000_000} />
        <Field id="loan-rate" label="سود سالانه ٪" value={rate} onChange={setRate} step={1} />
        <Field id="loan-months" label="تعداد ماه" value={months} onChange={setMonths} step={6} />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-3">
        <Stat label="قسط ماهانه" value={pay} tone="out" />
        <Stat label="کل بازپرداخت" value={total} />
        <div>
          <p className="text-xs font-bold text-muted">با بودجه‌ات جور است؟</p>
          <p className={`mt-1 text-lg font-bold ${comfortable ? 'text-in' : 'text-out'}`}>
            {avgSaved <= 0 ? 'هنوز داده کافی نیست' : comfortable ? 'بله، با جای نفس' : 'خیلی فشرده است'}
          </p>
          <p className="text-xs text-muted">قاعده سرانگشتی: قسط کمتر از ۶۰٪ پس‌انداز ماهانه‌ات باشد.</p>
        </div>
      </div>
    </Card>
  )
}

function Field({ id, label, value, onChange, step }: { id: string; label: string; value: number; onChange: (n: number) => void; step: number }) {
  return (
    <div>
      <label htmlFor={id} className="text-xs font-bold text-muted">{label}</label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="num mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2"
      />
    </div>
  )
}
