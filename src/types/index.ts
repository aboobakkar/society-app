export type UserRole = "superadmin" | "admin" | "member" | "agent";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  member_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Member {
  id: string;
  name: string;
  name_ml: string | null;
  mobile: string;
  monthly_amount: number;
  status: "active" | "inactive";
  address: string | null;
  joined_month: string;
  joined_date?: string;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
  opening_balance: number;
  opening_due?: number;
  waived_amount?: number;
  due_from_month?: string | null;
  due_from_month_paid_amount?: number;
  advance_balance: number;
  collection_order?: number;
}

export type PaymentMethod = "cash" | "online" | "bank";
export type PaymentType = "monthly" | "imam_food";

export interface Payment {
  id: string;
  member_id: string;
  month: string;
  amount: number;
  method: PaymentMethod;
  payment_date: string;
  reference_no?: string | null;
  notes?: string | null;
  recorded_by?: string | null;
  created_at?: string;
  payment_type?: PaymentType;
  member?: Member;
}

export interface Expense {
  id: string;
  category: "salary" | "utility" | "maintenance" | "event" | "other";
  description: string;
  amount: number;
  expense_date: string;
  paid_to?: string | null;
  reference_no?: string | null;
  notes?: string | null;
  recorded_by?: string | null;
  created_at?: string;
}

export interface RentalIncome {
  id: string;
  payer_name: string;
  payer_mobile?: string | null;
  amount: number;
  income_date: string;
  description?: string | null;
  notes?: string | null;
  recorded_by?: string | null;
  created_at?: string;
}

export interface CashTransfer {
  id: string;
  from_person: string;
  to_person: string;
  amount: number;
  transfer_date: string;
  notes?: string | null;
  recorded_by?: string | null;
  created_at?: string;
}

export interface HoldingPerson {
  id: string;
  name: string;
  role?: string;
  phone?: string;
  order?: number;
}

export interface Settings {
  id: number;
  society_name: string;
  society_name_ml?: string;
  default_monthly_amount: number;
  current_fiscal_year?: string;
  address?: string;
  phone?: string;
  holding_persons?: HoldingPerson[];
}
