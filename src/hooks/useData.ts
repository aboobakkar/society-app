import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Member, Payment, Expense, Settings } from '@/types'
import toast from 'react-hot-toast'

// Calls cb() as soon as a Supabase session is confirmed.
// Uses onAuthStateChange instead of getSession() because getSession()
// makes a network call to refresh an expired token and can hang indefinitely,
// leaving every hook stuck on loading=true after a hard page refresh.
function useWhenReady(cb: () => void) {
  const cbRef = useRef(cb)
  cbRef.current = cb

  useEffect(() => {
    let active = true
    let called = false

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      if (!active || called) return
      if (sess) {
        called = true
        cbRef.current()
        // Keep the subscription alive (don't unsubscribe) so we can re-fetch
        // on TOKEN_REFRESHED / SIGNED_IN events within the same page session.
      } else if (_event === 'INITIAL_SESSION') {
        // No session at all (not logged in) — mark called so we don't fire again
        called = true
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])
}


// ============================================
// MEMBERS
// ============================================
export function useMembers() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  const silentRefetch = useCallback(async () => {
    const { data, error } = await supabase.from('members').select('*').order('id')
    if (error) console.error('[useMembers]', error.message)
    else setMembers(data || [])
  }, [])

  const fetch = useCallback(async () => {
    setLoading(true)
    await silentRefetch()
    setLoading(false)
  }, [silentRefetch])

  useWhenReady(fetch)

  const addMember = async (member: Omit<Member, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data: idData, error: idError } = await supabase.rpc('generate_member_id')
      if (idError) { toast.error('Failed to generate member ID: ' + idError.message); return null }
      const { data, error } = await supabase.from('members').insert({ ...member, id: idData }).select().single()
      if (error) { toast.error(error.message); return null }
      toast.success('Member added successfully')
      await silentRefetch()
      return data as Member
    } catch (e: any) { toast.error(e?.message || 'Unexpected error'); return null }
  }

  const updateMember = async (id: string, updates: Partial<Member>) => {
    try {
      const { error } = await supabase.from('members').update(updates).eq('id', id)
      if (error) { toast.error(error.message); return false }
      toast.success('Member updated')
      await silentRefetch()
      return true
    } catch (e: any) { toast.error(e?.message || 'Unexpected error'); return false }
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
    let query = supabase.from('payments').select('*, member:members(*), recorded_by_profile:profiles!payments_recorded_by_fkey(full_name, email)').order('created_at', { ascending: false })
    if (month) query = query.eq('month', month)
    const { data, error } = await query
    if (error) console.error('[usePayments]', error.message)
    else setPayments(data || [])
  }, [month])

  const fetch = useCallback(async () => {
    setLoading(true)
    await silentRefetch()
    setLoading(false)
  }, [silentRefetch])

  useWhenReady(fetch)
  useEffect(() => { fetch() }, [fetch])

  const addPayment = async (payment: {
    member_id: string; month: string; amount: number; method: string
    payment_type?: string; payment_date: string; reference_no?: string; notes?: string; recorded_by?: string
  }) => {
    try {
      const { data, error } = await supabase.from('payments').insert(payment).select('*, member:members(*)').single()
      if (error) {
        if (error.code === '23505') toast.error('This payment type is already recorded for this member this month')
        else toast.error(error.message)
        return null
      }
      toast.success('Payment recorded')
      await silentRefetch()
      return data as Payment
    } catch (e: any) { toast.error(e?.message || 'Unexpected error'); return null }
  }

  const deletePayment = async (id: string) => {
    try {
      const { error } = await supabase.from('payments').delete().eq('id', id)
      if (error) { toast.error(error.message); return false }
      toast.success('Payment deleted')
      await silentRefetch()
      return true
    } catch (e: any) { toast.error(e?.message || 'Unexpected error'); return false }
  }

  const addPaymentsBulk = async (payments: {
    member_id: string; month: string; amount: number; method: string
    payment_type?: string; payment_date: string; reference_no?: string; notes?: string; recorded_by?: string
  }[]) => {
    try {
      const { error } = await supabase.from('payments').insert(payments)
      if (error) {
        if (error.code === '23505') toast.error('One or more months already have a payment recorded')
        else toast.error(error.message)
        return false
      }
      toast.success(`${payments.length} payment${payments.length > 1 ? 's' : ''} recorded`)
      await silentRefetch()
      return true
    } catch (e: any) { toast.error(e?.message || 'Unexpected error'); return false }
  }

  return { payments, loading, refetch: fetch, addPayment, deletePayment, addPaymentsBulk }
}

// ============================================
// EXPENSES
// ============================================
export function useExpenses(month?: string) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)

  const silentRefetch = useCallback(async () => {
    let query = supabase.from('expenses').select('*').order('expense_date', { ascending: false })
    if (month) {
      const [y, m] = month.split('-')
      query = query.gte('expense_date', `${y}-${m}-01`).lte('expense_date', (() => { const d = new Date(parseInt(y), parseInt(m), 0); return `${y}-${m}-${String(d.getDate()).padStart(2,'0')}` })())
    }
    const { data, error } = await query
    if (error) console.error('[useExpenses]', error.message)
    else setExpenses(data || [])
  }, [month])

  const fetch = useCallback(async () => {
    setLoading(true)
    await silentRefetch()
    setLoading(false)
  }, [silentRefetch])

  useWhenReady(fetch)
  useEffect(() => { fetch() }, [fetch])

  const addExpense = async (expense: {
    category: string; description: string; amount: number; expense_date: string
    paid_to?: string; reference_no?: string; notes?: string; recorded_by?: string
  }) => {
    try {
      const { data, error } = await supabase.from('expenses').insert(expense).select().single()
      if (error) { toast.error(error.message); return null }
      toast.success('Expense recorded')
      await silentRefetch()
      return data as Expense
    } catch (e: any) { toast.error(e?.message || 'Unexpected error'); return null }
  }

  const deleteExpense = async (id: string) => {
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id)
      if (error) { toast.error(error.message); return false }
      toast.success('Expense deleted')
      await silentRefetch()
      return true
    } catch (e: any) { toast.error(e?.message || 'Unexpected error'); return false }
  }

  return { expenses, loading, refetch: fetch, addExpense, deleteExpense }
}

// ============================================
// SETTINGS
// ============================================
export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)

  useWhenReady(() => {
    supabase.from('settings').select('*').single().then(({ data, error }) => {
      if (!error) setSettings(data as Settings)
      setLoading(false)
    })
  })

  const updateSettings = async (updates: Partial<Settings>) => {
    try {
      // First try update (row already exists)
      const { data: existing } = await supabase.from('settings').select('id').limit(1).single()
      let error
      if (existing) {
        ;({ error } = await supabase.from('settings').update(updates).eq('id', existing.id))
      } else {
        // No row yet — insert instead
        ;({ error } = await supabase.from('settings').insert(updates))
      }
      if (error) { toast.error(error.message); return false }
      setSettings(prev => prev ? { ...prev, ...updates } : (updates as Settings))
      toast.success('Settings saved')
      return true
    } catch (e: any) {
      toast.error(e?.message || 'Unexpected error saving settings')
      return false
    }
  }

  return { settings, loading, updateSettings }
}

// ============================================
// REPORT DATA
// ============================================
export function useMonthlyReport(year: string) {
  const [data, setData] = useState<{
    month: string; collected: number; expenses: number; balance: number; paidCount: number
  }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function run() {
      const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`)
      const [{ data: pd }, { data: ed }] = await Promise.all([
        supabase.from('payments').select('month, amount').gte('month', `${year}-01`).lte('month', `${year}-12`),
        supabase.from('expenses').select('expense_date, amount').gte('expense_date', `${year}-01-01`).lte('expense_date', `${year}-12-31`),
      ])
      if (cancelled) return
      const result = months.map(month => {
        const mp = (pd || []).filter(p => p.month === month)
        const [y, m] = month.split('-')
        const me = (ed || []).filter(e => { const [ey, em] = e.expense_date.split('-'); return ey === y && em === m })
        const collected = mp.reduce((s, p) => s + p.amount, 0)
        const expenses = me.reduce((s, e) => s + e.amount, 0)
        return { month, collected, expenses, balance: collected - expenses, paidCount: mp.length }
      })
      setData(result)
      setLoading(false)
    }
    run()
    return () => { cancelled = true }
  }, [year])

  return { data, loading }
}