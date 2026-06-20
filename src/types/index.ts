export type Role = 'owner' | 'employee' | 'client'

export type ParcelStatus = 'Omborda' | 'Yetkazib berildi' | 'Qaytib keldi' | 'Olinmagan'
export type CargoType = 'Pochta' | 'Gabarit' | 'Avia'
export type ExpenseCategory =
  | 'Yuk'
  | 'Ofis'
  | 'Ishchilar'
  | 'Xojaynlar'
  | 'Marketing'
  | 'IT'
  | 'Moliyaviy'
  | 'YetkazibBerish'

export interface Client {
  id: string
  client_code: string
  address: string | null
  phone: string | null
  name: string | null
  extra_phone: string | null
  total_kg: number | null
  total_usd: number | null
}

export interface Parcel {
  id: string
  date: string
  supplier: string | null
  client_code: string
  cargo_type: CargoType | null
  address: string | null
  weight_kg: number | null
  mesta: number | null
  amount_usd: number | null
  amount_sum: number | null
  phone: string | null
  name: string | null
  comment: string | null
  status: ParcelStatus | null
  warehouse_status: string | null
  days_in_warehouse: number | null
  exchange_rate: number | null
}

export interface Employee {
  id: string
  name: string
  role: string | null
}

export interface Expense {
  id: string
  date: string
  category: ExpenseCategory
  expense_item: string | null
  usd: number | null
  sum: number | null
  card_amount: number | null
  total_usd: number | null
  total_sum: number | null
  comment: string | null
  exchange_rate: number | null
  employee_name: string | null
}

export interface Balance {
  id: string
  date: string
  total_balance_usd: number | null
  usd: number | null
  sum: number | null
  card: number | null
  fact_usd: number | null
  fact_sum: number | null
  fact_card: number | null
  diff_usd: number | null
  diff_sum: number | null
  diff_card: number | null
}

export interface DailyFinance {
  id: string
  date: string
  income_usd: number | null
  income_sum: number | null
  income_card: number | null
  expense_usd: number | null
  expense_sum: number | null
  expense_card: number | null
}

export interface ExchangeRate {
  id: string
  date: string
  usd_rate_expense: number | null
  cny_rate: number | null
  usd_rate_income: number | null
}

export interface UserRole {
  id: string
  user_id: string
  role: Role
  client_code: string | null
}

export const STATUS_LABELS: Record<ParcelStatus, string> = {
  Omborda: 'На складе',
  'Yetkazib berildi': 'Доставлено',
  'Qaytib keldi': 'Возврат',
  Olinmagan: 'Не забрано',
}

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  Yuk: 'Груз',
  Ofis: 'Офис',
  Ishchilar: 'Сотрудники',
  Xojaynlar: 'Владельцы',
  Marketing: 'Маркетинг',
  IT: 'IT',
  Moliyaviy: 'Финансовые',
  YetkazibBerish: 'Доставка',
}
