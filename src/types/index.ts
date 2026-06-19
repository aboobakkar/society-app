// ============================================
// Database Types
// ============================================

export type Role = 'superadmin' | 'admin' | 'member' | 'agent'
export type MemberStatus = 'active' | 'inactive'
export type PaymentMethod = 'cash' | 'online' | 'bank'
export type PaymentType = 'monthly' | 'imam_food'
export type ExpenseCategory = 'salary' | 'utility' | 'maintenance' | 'event' | 'other'
export type LogAction = 'created' | 'updated' | 'deleted'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: Role
  member_id: string | null
  created_at: string
  updated_at: string
}

export interface Member {
  id: string
  name: string
  name_ml: string | null
  mobile: string
  monthly_amount: number
  status: MemberStatus
  address: string | null
  joined_month: string
  notes: string | null
  opening_balance: number
  due_from_month: string | null
  due_from_month_paid_amount: number
  advance_balance: number
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  member_id: string
  month: string
  amount: number
  method: PaymentMethod
  payment_type: PaymentType
  payment_date: string
  reference_no: string | null
  notes: string | null
  recorded_by: string | null
  created_at: string
  member?: Member
}

export interface PaymentLog {
  id: string
  payment_id: string | null
  action: LogAction
  member_id: string | null
  month: string | null
  amount: number | null
  method: string | null
  payment_type: string | null
  payment_date: string | null
  notes: string | null
  changed_by: string | null
  changed_by_name: string | null
  changed_at: string
  old_data: Record<string, any> | null
  new_data: Record<string, any> | null
}

export interface Expense {
  id: string
  category: ExpenseCategory
  description: string
  amount: number
  expense_date: string
  paid_to: string | null
  reference_no: string | null
  notes: string | null
  recorded_by: string | null
  created_at: string
}

export interface RentalIncome {
  id: string
  payer_name: string
  payer_mobile: string | null
  amount: number
  income_date: string
  description: string | null
  notes: string | null
  recorded_by: string | null
  created_at: string
}

export interface AgentCollectionSummary {
  recorded_by: string | null
  agent_name: string | null
  agent_email: string | null
  collection_date: string
  collection_month: string
  payment_count: number
  total_amount: number
  cash_count: number
  online_count: number
  bank_count: number
}

export interface DailyCollectionSummary {
  day: string
  month: string
  payment_count: number
  total_amount: number
  cash_count: number
  online_count: number
  cash_amount: number
  online_amount: number
}

export interface Settings {
  id: number
  society_name: string
  society_name_ml: string | null
  default_monthly_amount: number
  current_fiscal_year: string
  address: string | null
  phone: string | null
}

// ============================================
// App-level types
// ============================================
export interface MonthlyReport {
  month: string
  payment_count: number
  total_collected: number
  total_expenses: number
  balance: number
  paid_member_ids: string[]
}

export interface MemberPaymentStatus {
  member: Member
  paid_months: string[]
  pending_months: string[]
  total_paid: number
}

export type Language = 'en' | 'ml'

export interface AuthUser {
  id: string
  email: string
  profile: Profile
}