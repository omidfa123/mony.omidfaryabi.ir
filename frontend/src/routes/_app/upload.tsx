import { useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { uploadStatement } from '../../server/api'
import { Card } from '../../components/ui'
import { monthLabel, toman } from '../../lib/format'
import type { UploadResult } from '../../lib/types'

export const Route = createFileRoute('/_app/upload')({
  component: UploadPage,
})

function UploadPage() {
  const router = useRouter()
  const upload = useServerFn(uploadStatement)
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<UploadResult | null>(null)
  const [drag, setDrag] = useState(false)

  const send = async () => {
    if (!file) return
    setBusy(true)
    setError('')
    setResult(null)
    const fd = new FormData()
    fd.append('file', file)
    const res = await upload({ data: fd })
    setBusy(false)
    if (res.ok && res.result) {
      setResult(res.result)
      await router.invalidate()
    } else {
      setError(res.error)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">بارگذاری صورتحساب</h1>
        <p className="text-muted">تراکنش‌های تکراری خودکار رد می‌شوند، پس بارگذاری بازه‌های هم‌پوشان مشکلی ندارد.</p>
      </div>

      <Card>
        <ol className="space-y-2 text-sm">
          <li><b>۱.</b> در اپ رسالت برو به «سپرده» ← «گردش».</li>
          <li><b>۲.</b> «بر اساس تاریخ» را بزن و کل ماه را انتخاب کن (مثلاً 1405/08/01 تا 1405/08/30).</li>
          <li><b>۳.</b> «نمایش» را بزن، فایل PDF را ذخیره کن و اینجا بارگذاری کن.</li>
        </ol>
      </Card>

      <label
        htmlFor="pdf"
        onDragOver={(e) => {
          e.preventDefault()
          setDrag(true)
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDrag(false)
          const f = e.dataTransfer.files[0]
          if (f) setFile(f)
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition ${
          drag ? 'border-accent bg-accent/5' : 'border-line bg-card'
        }`}
      >
        <span className="text-lg font-bold">{file ? file.name : 'فایل PDF را اینجا بکش یا بزن تا انتخاب کنی'}</span>
        <span className="mt-1 text-sm text-muted">{file ? `${Math.round(file.size / 1024)} کیلوبایت` : 'PDF «صورت حساب سپرده» بانک رسالت'}</span>
        <input id="pdf" type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </label>

      <button
        disabled={!file || busy}
        onClick={send}
        className="w-full rounded-lg bg-ink px-4 py-3 font-semibold text-paper disabled:opacity-40"
      >
        {busy ? 'در حال خواندن صورتحساب…' : 'بارگذاری و دسته‌بندی'}
      </button>

      {error && <p className="rounded-lg border border-out/40 bg-out/10 p-3 text-sm text-out">{error}</p>}

      {result && (
        <Card className="border-in/40">
          <p className="text-lg font-bold text-in">
            {result.added} تراکنش جدید اضافه شد
            {result.found > result.added && <span className="text-sm font-medium text-muted"> ({result.found - result.added} مورد از قبل ذخیره بود)</span>}
          </p>
          <p className="num mt-1 text-sm text-muted">
            جمع صورتحساب: برداشت {toman(result.totalOutToman)} تومان · واریز {toman(result.totalInToman)} تومان. با جمع بالای فایل PDF
            مقایسه کن.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {result.months.map((m) => (
              <Link key={m} to="/month/$ym" params={{ ym: m }} className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold hover:border-accent">
                دیدن {monthLabel(m)} ←
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
