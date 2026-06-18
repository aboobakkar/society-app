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

// Helper: get all unpaid due months for a member in order oldest->newest
// Includes the current month so agent can collect it along with arrears
async function getUnpaidDueMonths(memberId: string, dueFromMonth: string): Promise<string[]> {
  const current = new Date().toISOString().slice(0, 7) // YYYY-MM

  // Get all monthly payments already recorded for this member
  const { data } = await supabase
    .from('payments')
    .select('month')
    .eq('member_id', memberId)
    .eq('payment_type', 'monthly')

  const paidMonths = new Set((data || []).map((p: { month: string }) => p.month))

  // Walk from due_from_month up to current month, collect only unpaid ones
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
  paymentType?: 'monthly' | 'imam_food'
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

    const pType = params.paymentType || 'monthly'
    const hasDues = pType === 'monthly' && !!(params.member?.due_from_month && (params.member?.opening_balance || 0) > 0)

    // -- CASE 1: Member has dues -> allocate to oldest unpaid months first ----
    if (hasDues && params.member) {
      // Always fetch fresh member data from DB to avoid stale UI state
      const { data: freshMember, error: fetchErr } = await supabase
        .from('members')
        .select('opening_balance, advance_balance, monthly_amount, due_from_month')
        .eq('id', params.memberId)
        .single()

      if (fetchErr || !freshMember) {
        toast.error('Could not fetch member data. Please try again.')
        return false
      }

      const unpaidMonths = await getUnpaidDueMonths(params.memberId, freshMember.due_from_month!)
      const monthlyRate = freshMember.monthly_amount
      let remaining = params.amount

      // Build payment rows: ONLY insert full months — never a partial month row.
      // A partial row would mark the month as "paid" in the due list when it is not.
      const rows: Array<{
        member_id: string
        month: string
        amount: number
        method: string
        payment_type: string
        payment_date: string
        recorded_by: string
        notes: string | null
      }> = []

      for (const m of unpaidMonths) {
        if (remaining < monthlyRate) break  // cannot cover a full month — stop here
        rows.push({
          member_id: params.memberId,
          month: m,
          amount: monthlyRate,
          method: params.method,
          payment_type: pType,
          payment_date: today,
          recorded_by: params.recordedBy,
          notes: noteText,
        })
        remaining -= monthlyRate
      }

      // Compute what the new opening_balance should be:
      // total paid reduces total dues. Any amount beyond dues becomes advance.
      const totalDues = freshMember.opening_balance || 0
      const newBalance = Math.max(0, totalDues - params.amount)
      const advanceGained = params.amount > totalDues ? params.amount - totalDues : 0

      // Advance due_from_month to the next unpaid month after the last fully-paid one.
      // If no full months were paid (amount < monthlyRate), keep original due_from_month.
      let newDueFromMonth: string | null = null
      if (newBalance > 0 && rows.length > 0) {
        newDueFromMonth = nextMonth(rows[rows.length - 1].month)
      } else if (newBalance > 0) {
        newDueFromMonth = freshMember.due_from_month  // not enough to clear even one month
      }
      // if newBalance === 0, due_from_month stays null (all dues cleared)

      // Special case: payment is less than one full month — just reduce the balance
      if (rows.length === 0) {
        await supabase.from('members').update({
          opening_balance: newBalance,
          due_from_month: newDueFromMonth,
        }).eq('id', params.memberId)
        toast.success(`₹${params.amount} applied to arrears. Remaining arrears: ₹${newBalance}`)
        return true
      }

      // Insert all full-month payment rows
      const { error } = await supabase.from('payments').insert(rows)
      if (error) {
        if (error.code === '23505') toast.error('One or more months already have a payment recorded')
        else toast.error(error.message)
        return false
      }

      // Update member: advance due_from_month, reduce opening_balance, add any advance credit
      await supabase.from('members').update({
        opening_balance: newBalance,
        due_from_month: newDueFromMonth,
        advance_balance: (freshMember.advance_balance || 0) + advanceGained,
      }).eq('id', params.memberId)

      const monthsCount = rows.length
      const leftoverMsg = remaining > 0 ? ` · ₹${remaining} on arrears` : ''
      const advanceMsg = advanceGained > 0 ? ` · ₹${advanceGained} as advance` : ''
      toast.success(`${monthsCount} month${monthsCount > 1 ? 's' : ''} paid ✓${leftoverMsg}${advanceMsg}`)
      return true
    }

    // -- CASE 2: No dues -> single payment for the selected month --------------
    const { error } = await supabase.from('payments').insert({
      member_id: params.memberId,
      month: params.month,
      amount: params.amount,
      method: params.method,
      payment_type: pType,
      payment_date: today,
      recorded_by: params.recordedBy,
      notes: noteText,
    })

    if (error) {
      if (error.code === '23505') toast.error('Payment already recorded for this member this month')
      else toast.error(error.message)
      return false
    }

    // If paid more than monthly amount, save excess as advance_balance (monthly only)
    if (params.member && pType === 'monthly') {
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
  holdingPerson?: string
  recordedBy: string
}): Promise<boolean> {
  try {
    const noteText = [
      params.notes,
      params.holdingPerson ? `Cash held by: ${params.holdingPerson}` : null,
    ].filter(Boolean).join(' | ') || null

    const { error } = await supabase.from('rental_income').insert({
      payer_name: params.payerName,
      payer_mobile: params.payerMobile || null,
      amount: params.amount,
      income_date: new Date().toISOString().split('T')[0],
      description: params.description || null,
      notes: noteText,
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

// ============================================
// ALL AGENTS MONTHLY SUMMARY — society-wide
// ============================================
export function useAllAgentsMonthly() {
  const [data, setData] = useState({
    total: 0, count: 0,
    imamFoodTotal: 0, imamFoodCount: 0,
    monthlyTotal: 0,
  })
  const [loading, setLoading] = useState(true)
  const currentMonth = getCurrentMonth()

  useEffect(() => {
    async function run() {
      const { data: rows, error } = await supabase
        .from('payments')
        .select('amount, payment_type')
        .eq('month', currentMonth)

      if (!error && rows) {
        const monthly = rows.filter(p => (p.payment_type ?? 'monthly') === 'monthly')
        const imam = rows.filter(p => p.payment_type === 'imam_food')
        setData({
          total: rows.reduce((s, p) => s + p.amount, 0),
          count: rows.length,
          monthlyTotal: monthly.reduce((s, p) => s + p.amount, 0),
          imamFoodTotal: imam.reduce((s, p) => s + p.amount, 0),
          imamFoodCount: imam.length,
        })
      }
      setLoading(false)
    }
    run()
  }, [currentMonth])

  return { ...data, loading }
}

// ============================================
// MONTHLY RENTAL INCOME SUMMARY
// ============================================
export function useMonthlyRentalSummary() {
  const [data, setData] = useState({ total: 0, count: 0 })
  const [loading, setLoading] = useState(true)
  const currentMonth = getCurrentMonth()

  useEffect(() => {
    async function run() {
      const [y, m] = currentMonth.split('-')
      const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate()
      const { data: rows, error } = await supabase
        .from('rental_income')
        .select('amount')
        .gte('income_date', `${y}-${m}-01`)
        .lte('income_date', `${y}-${m}-${String(lastDay).padStart(2, '0')}`)

      if (!error && rows) {
        setData({
          total: rows.reduce((s, r) => s + r.amount, 0),
          count: rows.length,
        })
      }
      setLoading(false)
    }
    run()
  }, [currentMonth])

  return { ...data, loading }
}