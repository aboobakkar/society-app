// ============================================
// Database Types
// ============================================

export type Role = 'superadmin' | 'admin' | 'member'
export type MemberStatus = 'active' | 'inactive'
export type PaymentMethod = 'cash' | 'online' | 'bank'
export type PaymentType = 'monthly' | 'imam_food'
export type ExpenseCategory = 'salary' | 'utility' | 'maintenance' | 'event' | 'other'

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
  id: string          // SCY001, SCY002...
  name: string
  name_ml: string | null
  mobile: string
  monthly_amount: number
  status: MemberStatus
  address: string | null
  joined_month: string  // YYYY-MM
  notes: string | null
  opening_balance: number      // total previous dues amount (0 = no dues)
  due_from_month: string | null // YYYY-MM — earliest month of previous dues
  advance_balance: number      // overpayment stored for future deduction
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  member_id: string
  month: string         // YYYY-MM
  amount: number
  method: PaymentMethod
  payment_type: PaymentType  // 'monthly' | 'imam_food'
  payment_date: string  // YYYY-MM-DD
  reference_no: string | null
  notes: string | null
  recorded_by: string | null
  created_at: string
  // joined
  member?: Member
}

export interface Expense {
  id: string
  category: ExpenseCategory
  description: string
  amount: number
  expense_date: string  // YYYY-MM-DD
  paid_to: string | null
  reference_no: string | null
  notes: string | null
  recorded_by: string | null
  created_at: string
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
