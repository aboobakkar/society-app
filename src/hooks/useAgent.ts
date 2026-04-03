import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Member, Payment } from '@/types'
import { getCurrentMonth } from '@/lib/utils'
import toast from 'react-hot-toast'

// ============================================
// DUE MEMBERS — ordered by collection_order
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
      .order('collection_order', { ascending: true })   // route order
      .order('id', { ascending: true })                  // fallback

    if (mErr) { console.error('[useDueMembers]', mErr.message); setLoading(false); return }

    const { data: paidData, error: pErr } = await supabase
      .from('payments')
      .select('member_id')
      .eq('month', targetMonth)
      .eq('payment_type', 'monthly')   // only monthly payments count as "paid" for due list

    if (pErr) { console.error('[useDueMembers] payments:', pErr.message); setLoading(false); return }

    const paidIds = new Set((paidData || []).map(p => p.member_id))
    setMembers((allMembers || []).filter(m => !paidIds.has(m.id)) as Member[])
    setLoading(false)
  }, [targetMonth])

  useEffect(() => { fetch() }, [fetch])
  return { members, loading, refetch: fetch }
}

// ============================================
// ALL MEMBERS — ordered by collection_order, paid ones pushed to bottom
// ============================================
export function useAllMembers() {
  const [members, setMembers] = useState<Member[]>([])
  const [paidThisMonth, setPaidThisMonth] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const currentMonth = getCurrentMonth()

  const fetch = useCallback(async () => {
    setLoading(true)
    const [{ data: allData }, { data: paidData }] = await Promise.all([
      supabase.from('members').select('*').eq('status', 'active')
        .order('collection_order', { ascending: true }).order('id', { ascending: true }),
      supabase.from('payments').select('member_id').eq('month', currentMonth).eq('payment_type', 'monthly')
    ])
    if (allData) setMembers(allData as Member[])
    if (paidData) setPaidThisMonth(new Set(paidData.map(p => p.member_id)))
    setLoading(false)
  }, [currentMonth])

  useEffect(() => { fetch() }, [fetch])

  // Sort: unpaid first (in collection_order), paid at bottom
  const sorted = [...members].sort((a, b) => {
    const aPaid = paidThisMonth.has(a.id) ? 1 : 0
    const bPaid = paidThisMonth.has(b.id) ? 1 : 0
    if (aPaid !== bPaid) return aPaid - bPaid
    return (a.collection_order ?? 999) - (b.collection_order ?? 999)
  })

  return { members: sorted, paidThisMonth, loading, refetch: fetch }
}

// ============================================
// TODAY'S SUMMARY — with cash/UPI breakdown
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
  const onlineTotal = payments.filter(p => p.method !== 'cash').reduce((s, p) => s + p.amount, 0)
  const cashCount = payments.filter(p => p.method === 'cash').length
  const onlineCount = payments.filter(p => p.method !== 'cash').length

  return { payments, totalToday, count: payments.length, cashTotal, onlineTotal, cashCount, onlineCount, loading, refetch: fetch }
}

// ============================================
// MONTHLY SUMMARY — agent's own collection this month
// ============================================
export function useMonthlyAgentSummary() {
  const [data, setData] = useState({ total: 0, count: 0, cashTotal: 0, onlineTotal: 0 })
  const [loading, setLoading] = useState(true)
  const currentMonth = getCurrentMonth()

  useEffect(() => {
    async function run() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data, error } = await supabase
        .from('payments')
        .select('amount, method')
        .eq('recorded_by', user.id)
        .eq('month', currentMonth)

      if (!error && data) {
        const total = data.reduce((s, p) => s + p.amount, 0)
        const cashTotal = data.filter(p => p.method === 'cash').reduce((s, p) => s + p.amount, 0)
        const onlineTotal = data.filter(p => p.method !== 'cash').reduce((s, p) => s + p.amount, 0)
        setData({ total, count: data.length, cashTotal, onlineTotal })
      }
      setLoading(false)
    }
    run()
  }, [currentMonth])

  return { ...data, loading }
}

// ============================================
// HOLDING PERSONS — from settings
// ============================================
export function useHoldingPersons() {
  const [persons, setPersons] = useState<string[]>([])

  useEffect(() => {
    supabase.from('settings').select('holding_persons').single().then(({ data }) => {
      if (data?.holding_persons) setPersons(data.holding_persons as string[])
    })
  }, [])

  return persons
}

// ============================================
// RECORD PAYMENT — with smart due allocation
// ============================================

// Helper: get next month string
function nextMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  if (m === 12) return `${y + 1}-01`
  return `${y}-${String(m + 1).padStart(2, '0')}`
}

// Helper: get all unpaid due months for a member in order oldest→newest
async function getUnpaidDueMonths(memberId: string, dueFromMonth: string): Promise<string[]> {
  const current = new Date().toISOString().slice(0, 7) // YYYY-MM

  // Get all monthly payments already recorded for this member
  const { data } = await supabase
    .from('payments')
    .select('month')
    .eq('member_id', memberId)
    .eq('payment_type', 'monthly')

  const paidMonths = new Set((data || []).map((p: { month: string }) => p.month))

  // Walk from due_from_month to current month, collect unpaid ones
  const unpaid: string[] = []
  let cursor = dueFromMonth
  while (cursor <= current) {
    if (!paidMonths.has(cursor)) unpaid.push(cursor)
    cursor = nextMonth(cursor)
  }
  return unpaid // ordered oldest first
}

export async function recordPayment(params: {
  memberId: string
  month: string           // used only if member has NO dues
  amount: number
  method: 'cash' | 'online' | 'bank'
  recordedBy: string
  notes?: string
  holdingPerson?: string
  member?: {              // pass member object for smart due allocation
    opening_balance: number
    advance_balance: number
    monthly_amount: number
    due_from_month: string | null
  }
}): Promise<boolean> {
  try {
    const today = new Date().toISOString().split('T')[0]
    const noteText = [
      params.notes,
      params.holdingPerson ? `Cash held by: ${params.holdingPerson}` : null
    ].filter(Boolean).join(' | ') || null

    const hasDues = !!(params.member?.due_from_month && (params.member?.opening_balance || 0) > 0)

    // ── CASE 1: Member has dues → allocate to oldest unpaid months ──────────
    if (hasDues && params.member) {
      const unpaidMonths = await getUnpaidDueMonths(params.memberId, params.member.due_from_month!)
      const monthlyRate = params.member.monthly_amount
      let remaining = params.amount

      // Build payment rows: fill oldest months first
      const rows = []
      for (const m of unpaidMonths) {
        if (remaining <= 0) break
        const pay = Math.min(remaining, monthlyRate)
        rows.push({
          member_id: params.memberId,
          month: m,
          amount: pay,
          method: params.method,
          payment_type: 'monthly',
          payment_date: today,
          recorded_by: params.recordedBy,
          notes: noteText,
        })
        remaining -= pay
      }

      // Also allocate any leftover to current month if dues are fully cleared
      if (remaining > 0) {
        const current = new Date().toISOString().slice(0, 7)
        rows.push({
          member_id: params.memberId,
          month: current,
          amount: remaining,
          method: params.method,
          payment_type: 'monthly',
          payment_date: today,
          recorded_by: params.recordedBy,
          notes: noteText,
        })
      }

      if (rows.length === 0) {
        toast.error('No unpaid months found to allocate payment')
        return false
      }

      const { error } = await supabase.from('payments').insert(rows)
      if (error) {
        if (error.code === '23505') toast.error('One or more months already have a payment recorded')
        else toast.error(error.message)
        return false
      }

      // Update opening_balance on member
      const newBalance = Math.max(0, (params.member.opening_balance || 0) - params.amount)
      const advanceGained = params.amount > (params.member.opening_balance || 0)
        ? params.amount - (params.member.opening_balance || 0)
        : 0
      await supabase.from('members').update({
        opening_balance: newBalance,
        due_from_month: newBalance > 0 ? params.member.due_from_month : null,
        advance_balance: (params.member.advance_balance || 0) + advanceGained,
      }).eq('id', params.memberId)

      const monthsCount = rows.length
      toast.success(`${monthsCount} month${monthsCount > 1 ? 's' : ''} payment recorded ✓`)
      return true
    }

    // ── CASE 2: No dues → single payment for the given month ────────────────
    const { error } = await supabase.from('payments').insert({
      member_id: params.memberId,
      month: params.month,
      amount: params.amount,
      method: params.method,
      payment_type: 'monthly',
      payment_date: today,
      recorded_by: params.recordedBy,
      notes: noteText,
    })

    if (error) {
      if (error.code === '23505') toast.error('Payment already recorded for this member this month')
      else toast.error(error.message)
      return false
    }

    // If paid more than monthly amount, save excess as advance_balance
    if (params.member) {
      const excess = params.amount - params.member.monthly_amount
      if (excess > 0) {
        // Fetch latest advance_balance directly — avoid stale value from UI state
        const { data: fresh } = await supabase
          .from('members')
          .select('advance_balance')
          .eq('id', params.memberId)
          .single()

        const currentAdvance = fresh?.advance_balance || 0
        const { error: advErr } = await supabase
          .from('members')
          .update({ advance_balance: currentAdvance + excess })
          .eq('id', params.memberId)

        if (advErr) {
          console.error('[recordPayment] advance update failed:', advErr.message)
          toast.success(`Payment recorded ✓ (advance save failed: ${advErr.message})`)
        } else {
          toast.success(`Payment recorded ✓ — ₹${excess} saved as advance`)
        }
        return true
      }
    }

    toast.success('Payment recorded ✓')
    return true
  } catch (e: any) {
    toast.error(e?.message || 'Unexpected error')
    return false
  }
}

// ============================================
// RECORD RENTAL INCOME
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