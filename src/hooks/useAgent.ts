import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Member, Payment } from '@/types'
import { getCurrentMonth } from '@/lib/utils'
import toast from 'react-hot-toast'

// ============================================
// DUE MEMBERS
// ============================================
export function useDueMembers(month?: string) {
  const targetMonth = month || getCurrentMonth()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data: allMembers, error: mErr } = await supabase
      .from('members')
      .select('*')
      .eq('status', 'active')
      .order('name')

    if (mErr) { console.error('[useDueMembers] members:', mErr.message); setLoading(false); return }

    const { data: paidData, error: pErr } = await supabase
      .from('payments')
      .select('member_id')
      .eq('month', targetMonth)

    if (pErr) { console.error('[useDueMembers] payments:', pErr.message); setLoading(false); return }

    const paidIds = new Set((paidData || []).map(p => p.member_id))
    setMembers((allMembers || []).filter(m => !paidIds.has(m.id)) as Member[])
    setLoading(false)
  }, [targetMonth])

  useEffect(() => { fetch() }, [fetch])

  return { members, loading, refetch: fetch }
}

// ============================================
// TODAY'S SUMMARY — with cash/UPI/bank breakdown
// ============================================
export function useTodaySummary() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)

  const today = new Date().toISOString().split('T')[0]

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data, error } = await supabase
      .from('payments')
      .select('*, member:members(*)')
      .eq('payment_date', today)
      .eq('recorded_by', user.id)
      .order('created_at', { ascending: false })

    if (error) console.error('[useTodaySummary]', error.message)
    else setPayments(data as Payment[])
    setLoading(false)
  }, [today])

  useEffect(() => { fetch() }, [fetch])

  const totalToday = payments.reduce((s, p) => s + p.amount, 0)
  const cashTotal = payments.filter(p => p.method === 'cash').reduce((s, p) => s + p.amount, 0)
  const onlineTotal = payments.filter(p => p.method === 'online').reduce((s, p) => s + p.amount, 0)
  const bankTotal = payments.filter(p => p.method === 'bank').reduce((s, p) => s + p.amount, 0)
  const cashCount = payments.filter(p => p.method === 'cash').length
  const onlineCount = payments.filter(p => p.method === 'online').length

  return {
    payments, totalToday, count: payments.length,
    cashTotal, onlineTotal, bankTotal,
    cashCount, onlineCount,
    loading, refetch: fetch
  }
}

// ============================================
// ALL MEMBERS — for search
// ============================================
export function useAllMembers() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('members')
      .select('*')
      .eq('status', 'active')
      .order('name')
      .then(({ data, error }) => {
        if (!error) setMembers(data as Member[])
        setLoading(false)
      })
  }, [])

  return { members, loading }
}

// ============================================
// RECORD PAYMENT — agent inserts a payment
// ============================================
export async function recordPayment(params: {
  memberId: string
  month: string
  amount: number
  method: 'cash' | 'online' | 'bank'
  recordedBy: string
  notes?: string
}): Promise<boolean> {
  try {
    const { error } = await supabase.from('payments').insert({
      member_id: params.memberId,
      month: params.month,
      amount: params.amount,
      method: params.method,
      payment_type: 'monthly',
      payment_date: new Date().toISOString().split('T')[0],
      recorded_by: params.recordedBy,
      notes: params.notes || null,
    })

    if (error) {
      if (error.code === '23505') toast.error('Payment already recorded for this member this month')
      else toast.error(error.message)
      return false
    }
    toast.success('Payment recorded ✓')
    return true
  } catch (e: any) {
    toast.error(e?.message || 'Unexpected error')
    return false
  }
}

// ============================================
// RECORD RENTAL INCOME — agent inserts rental
// ============================================
export async function recordRental(params: {
  payerName: string
  payerMobile?: string
  amount: number
  description?: string
  notes?: string
  recordedBy: string
}): Promise<boolean> {
  try {
    const { error } = await supabase.from('rental_income').insert({
      payer_name: params.payerName,
      payer_mobile: params.payerMobile || null,
      amount: params.amount,
      income_date: new Date().toISOString().split('T')[0],
      description: params.description || null,
      notes: params.notes || null,
      recorded_by: params.recordedBy,
    })

    if (error) { toast.error(error.message); return false }
    toast.success('Rental income recorded ✓')
    return true
  } catch (e: any) {
    toast.error(e?.message || 'Unexpected error')
    return false
  }
}
