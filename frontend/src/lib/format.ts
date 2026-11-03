const nf = new Intl.NumberFormat('en-US')

// Numbers are wrapped in a left-to-right isolate so a minus or plus sign stays
// next to the number inside right-to-left Persian text.
const iso = (s: string) => `⁦${s}⁩`

/** 12,345,678 */
export const toman = (n: number) => iso(nf.format(Math.round(n)))

/** +12,345 / −12,345 */
export const signed = (n: number, sign: '+' | '−') => iso(`${sign}${nf.format(Math.round(n))}`)

/** 12.3 میلیون / 850 هزار */
export function short(n: number) {
  const a = Math.abs(n)
  const sign = n < 0 ? '−' : ''
  const dec = (x: number, d: number) => x.toFixed(d).replace('.', '٫')
  if (a >= 1_000_000_000) return `${iso(sign + dec(a / 1_000_000_000, 2))} میلیارد`
  if (a >= 1_000_000) return `${iso(sign + dec(a / 1_000_000, 1))} میلیون`
  if (a >= 1_000) return `${iso(sign + Math.round(a / 1_000))} هزار`
  return iso(sign + Math.round(a))
}

export const monthNames = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند']

/** "1405-08" -> "آبان 1405" */
export function monthLabel(ym: string) {
  const [y, m] = ym.split('-')
  return `${monthNames[Number(m) - 1] ?? m} ${y}`
}

/** Monthly payment for a loan (annual rate in %). */
export function installment(amount: number, ratePct: number, months: number) {
  const r = ratePct / 100 / 12
  if (months <= 0) return 0
  if (r === 0) return amount / months
  return (amount * r) / (1 - Math.pow(1 + r, -months))
}

/** The backend's catch-all category for transactions nobody has labeled yet. */
export const NEEDS_LABEL = 'نامشخص'

export const kindLabel: Record<string, string> = {
  spending: 'هزینه',
  income: 'درآمد',
  transfer: 'جابه‌جایی',
  unknown: 'نامشخص',
}

export const directionLabel: Record<string, string> = {
  in: 'واریز',
  out: 'برداشت',
  any: 'هر دو',
}
