import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Member, Payment, Expense, Settings } from '@/types'
import toast from 'react-hot-toast'

// ============================================
// MEMBERS
// ============================================
export function useMembers() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  // silentRefetch updates data WITHOUT setting loading=true
  // This prevents the page from re-rendering and unmounting the modal
  const silentRefetch = useCallback(async () => {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('id')
    if (!error) setMembers(data || [])
  }, [])

  const fetch = useCallback(async () => {
    setLoading(true)
    await silentRefetch()
    setLoading(false)
  }, [silentRefetch])

  useEffect(() => { fetch() }, [fetch])

  const addMember = async (member: Omit<Member, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data: idData, error: idError } = await supabase.rpc('generate_member_id')
      if (idError) {
        toast.error('Failed to generate member ID: ' + idError.message)
        return null
      }

      const { data, error } = await supabase
        .from('members')
        .insert({ ...member, id: idData })
        .select()
        .single()

      if (error) { toast.error(error.message); return null }
      toast.success('Member added successfully')
      await silentRefetch()
      return data as Member
    } catch (e: any) {
      toast.error(e?.message || 'Unexpected error')
      return null
    }
  }

  const updateMember = async (id: string, updates: Partial<Member>) => {
    try {
      const { error } = await supabase
        .from('members')
        .update(updates)
        .eq('id', id)
      if (error) { toast.error(error.message); return false }
      toast.success('Member updated')
      await silentRefetch()
      return true
    } catch (e: any) {
      toast.error(e?.message || 'Unexpected error')
      return false
    }
  }

  const toggleMemberStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
    return updateMember(id, { status: newStatus as 'active' | 'inactive' })
  }

  return { members, loading, refetch: fetch, addMember, updateMember, toggleMemberStatus }
}

// ============================================
// PAYMENTS
// ============================================
export function usePayments(month?: string) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)

  const silentRefetch = useCallback(async () => {
    let query = supabase
      .from('payments')
      .select('*, member:members(*)')
      .order('created_at', { ascending: false })
    if (month) query = query.eq('month', month)
    const { data, error } = await query
    if (!error) setPayments(data || [])
  }, [month])

  const fetch = useCallback(async () => {
    setLoading(true)
    await silentRefetch()
    setLoading(false)
  }, [silentRefetch])

  useEffect(() => { fetch() }, [fetch])

  const addPayment = async (payment: {
    member_id: string
    month: string
    amount: number
    method: string
    payment_date: string
    reference_no?: string
    notes?: string
    recorded_by?: string
  }) => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .insert(payment)
        .select('*, member:members(*)')
        .single()

      if (error) {
        if (error.code === '23505') toast.error('Payment already recorded for this member this month')
        else toast.error(error.message)
        return null
      }
      toast.success('Payment recorded')
      await silentRefetch()
      return data as Payment
    } catch (e: any) {
      toast.error(e?.message || 'Unexpected error')
      return null
    }
  }

  const deletePayment = async (id: string) => {
    try {
      const { error } = await supabase.from('payments').delete().eq('id', id)
      if (error) { toast.error(error.message); return false }
      toast.success('Payment deleted')
      await silentRefetch()
      return true
    } catch (e: any) {
      toast.error(e?.message || 'Unexpected error')
      return false
    }
  }

  return { payments, loading, refetch: fetch, addPayment, deletePayment }
}

// ============================================
// EXPENSES
// ============================================
export function useExpenses(month?: string) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)

  const silentRefetch = useCallback(async () => {
    let query = supabase
      .from('expenses')
      .select('*')
      .order('expense_date', { ascending: false })
    if (month) {
      const [y, m] = month.split('-')
      const start = `${y}-${m}-01`
      const end = `${y}-${m}-31`
      query = query.gte('expense_date', start).lte('expense_date', end)
    }
    const { data, error } = await query
    if (!error) setExpenses(data || [])
  }, [month])

  const fetch = useCallback(async () => {
    setLoading(true)
    await silentRefetch()
    setLoading(false)
  }, [silentRefetch])

  useEffect(() => { fetch() }, [fetch])

  const addExpense = async (expense: {
    category: string
    description: string
    amount: number
    expense_date: string
    paid_to?: string
    reference_no?: string
    notes?: string
    recorded_by?: string
  }) => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .insert(expense)
        .select()
        .single()

      if (error) { toast.error(error.message); return null }
      toast.success('Expense recorded')
      await silentRefetch()
      return data as Expense
    } catch (e: any) {
      toast.error(e?.message || 'Unexpected error')
      return null
    }
  }

  const deleteExpense = async (id: string) => {
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id)
      if (error) { toast.error(error.message); return false }
      toast.success('Expense deleted')
      await silentRefetch()
      return true
    } catch (e: any) {
      toast.error(e?.message || 'Unexpected error')
      return false
    }
  }

  return { expenses, loading, refetch: fetch, addExpense, deleteExpense }
}

// ============================================
// SETTINGS
// ============================================
export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('settings').select('*').single().then(({ data, error }) => {
      if (!error) setSettings(data as Settings)
      setLoading(false)
    })
  }, [])

  const updateSettings = async (updates: Partial<Settings>) => {
    const { error } = await supabase.from('settings').update(updates).eq('id', 1)
    if (error) { toast.error(error.message); return false }
    setSettings(prev => prev ? { ...prev, ...updates } : null)
    toast.success('Settings saved')
    return true
  }

  return { settings, loading, updateSettings }
}

// ============================================
// REPORT DATA
// ============================================
export function useMonthlyReport(year: string) {
  const [data, setData] = useState<{
    month: string
    collected: number
    expenses: number
    balance: number
    paidCount: number
  }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchReport() {
      setLoading(true)
      const months = Array.from({ length: 12 }, (_, i) =>
        `${year}-${String(i + 1).padStart(2, '0')}`
      )

      const [{ data: paymentsData }, { data: expensesData }] = await Promise.all([
        supabase.from('payments').select('month, amount').gte('month', `${year}-01`).lte('month', `${year}-12`),
        supabase.from('expenses').select('expense_date, amount').gte('expense_date', `${year}-01-01`).lte('expense_date', `${year}-12-31`),
      ])

      const result = months.map(month => {
        const monthPayments = (paymentsData || []).filter(p => p.month === month)
        const [y, m] = month.split('-')
        const monthExpenses = (expensesData || []).filter(e => {
          const [ey, em] = e.expense_date.split('-')
          return ey === y && em === m
        })
        const collected = monthPayments.reduce((s, p) => s + p.amount, 0)
        const expenses = monthExpenses.reduce((s, e) => s + e.amount, 0)
        return { month, collected, expenses, balance: collected - expenses, paidCount: monthPayments.length }
      })

      setData(result)
      setLoading(false)
    }

    fetchReport()
  }, [year])

  return { data, loading }
}