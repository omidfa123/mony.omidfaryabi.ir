export type Kind = 'income' | 'spending' | 'transfer' | 'unknown'

export interface Category {
  name: string
  kind: Kind
  budget: number
}

export interface Rule {
  match: string
  direction: 'in' | 'out' | 'any'
  amount: number
  category: string
  note: string
}

export interface Settings {
  ownerName: string
  ownCards: string[]
  carPrice: number
  plannedLoan: number
  emergencyFund: number
  savingsStart: number
  savingsStartMonth: string
  monthlyTarget: number
}

export interface Transaction {
  id: string
  date: string
  time: string
  month: string
  debit: number
  credit: number
  balance: number
  desc: string
  party: string
  match: string
  category: string
  source: 'override' | 'builtin' | 'rule' | 'auto' | 'none'
}

export interface MonthSummary {
  month: string
  firstDate: string
  lastDate: string
  count: number
  income: number
  spending: number
  unlabeledIn: number
  unlabeledOut: number
  saved: number
  needsLabel: number
  opening: number
  closing: number
}

export interface CatLine {
  name: string
  kind: Kind
  budget: number
  in: number
  out: number
  net: number
  count: number
}

export interface NeedGroup {
  party: string
  match: string
  direction: 'in' | 'out'
  count: number
  total: number
  sample: string
  amounts: number[]
}

export interface MonthDetail {
  summary: MonthSummary
  categories: CatLine[]
  needs: NeedGroup[]
  transactions: Transaction[]
}

export interface UploadResult {
  found: number
  added: number
  months: string[]
  totalOutToman: number
  totalInToman: number
}

export interface Goal {
  settings: Settings
  saved: number
  downPayment: number
  needed: number
  remaining: number
  avgSaved: number
  monthsAtPace: number
  monthsAtTarget: number
  history: { month: string; saved: number; cumulative: number; partial: boolean }[]
}
