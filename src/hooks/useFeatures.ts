import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { RentalIncome, AgentCollectionSummary, DailyCollectionSummary, PaymentLog } from '@/types'
import toast from 'react-hot-toast'

// Returns the last day of a month as YYYY-MM-DD
function getMonthEnd(year: string, month: string): string {
  const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
  return `${year}-${month}-${String(lastDay).padStart(2, '0')}`
}

// Re-use the same useWhenReady pattern from useData.ts
function useWhenReady(cb: () => void) {
  const cbRef = useRef(cb)
  cbRef.current = cb
  useEffect(() => {
    let active = true
    let called = false
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      if (!active || called) return
      if (sess) { called = true; cbRef.current() }
      else if (_event === 'INITIAL_SESSION') { called = true }
    })
    return () => { active = false; subscription.unsubscribe() }
  }, [])
}

// ============================================
// RENTAL INCOME
// ============================================
export function useRentalIncome(month?: string) {
  const [items, setItems] = useState<RentalIncome[]>([])
  const [loading, setLoading] = useState(true)

  const silentRefetch = useCallback(async () => {
    let query = supabase
      .from('rental_income')
      .select('*')
      .order('income_date', { ascending: false })
    if (month) {
      const [y, m] = month.split('-')
      query = query
        .gte('income_date', `${y}-${m}-01`)
        .lte('income_date', getMonthEnd(y, m))
    }
    const { data, error } = await query
    if (error) console.error('[useRentalIncome]', error.message)
    else setItems(data || [])
  }, [month])

  const fetch = useCallback(async () => {
    setLoading(true)
    await silentRefetch()
    setLoading(false)
  }, [silentRefetch])

  useWhenReady(fetch)

  const addRental = async (record: {
    payer_name: string
    payer_mobile?: string
    amount: number
    income_date: string
    description?: string
    notes?: string
    recorded_by?: string
  }) => {
    try {
      const { data, error } = await supabase
        .from('rental_income')
        .insert(record)
        .select()
        .single()
      if (error) { toast.error(error.message); return null }
      toast.success('Rental income recorded')
      await silentRefetch()
      return data as RentalIncome
    } catch (e: any) { toast.error(e?.message || 'Unexpected error'); return null }
  }

  const deleteRental = async (id: string) => {
    try {
      const { error } = await supabase.from('rental_income').delete().eq('id', id)
      if (error) { toast.error(error.message); return false }
      toast.success('Record deleted')
      await silentRefetch()
      return true
    } catch (e: any) { toast.error(e?.message || 'Unexpected error'); return false }
  }

  const totalRental = items.reduce((s, r) => s + r.amount, 0)

  return { items, loading, totalRental, refetch: fetch, addRental, deleteRental }
}

// ============================================
// AGENT COLLECTION SUMMARY
// ============================================
export function useAgentSummary(month: string) {
  const [data, setData] = useState<AgentCollectionSummary[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data: rows, error } = await supabase
      .from('agent_collection_summary')
      .select('*')
      .eq('collection_month', month)
      .order('total_amount', { ascending: false })
    if (error) console.error('[useAgentSummary]', error.message)
    else setData(rows || [])
    setLoading(false)
  }, [month])

  useWhenReady(fetch)
  useEffect(() => { fetch() }, [fetch])

  // Aggregate by agent (multiple days → one row per agent)
  const byAgent = Object.values(
    data.reduce((acc, row) => {
      const key = row.recorded_by || 'unknown'
      if (!acc[key]) {
        acc[key] = {
          recorded_by: row.recorded_by,
          agent_name: row.agent_name,
          agent_email: row.agent_email,
          payment_count: 0,
          total_amount: 0,
          cash_count: 0,
          online_count: 0,
          bank_count: 0,
        }
      }
      acc[key].payment_count += row.payment_count
      acc[key].total_amount += row.total_amount
      acc[key].cash_count += row.cash_count
      acc[key].online_count += row.online_count
      acc[key].bank_count += row.bank_count
      return acc
    }, {} as Record<string, any>)
  )

  return { data, byAgent, loading, refetch: fetch }
}

// ============================================
// DAILY COLLECTION SUMMARY
// ============================================
export function useDailyCollection(month: string) {
  const [data, setData] = useState<DailyCollectionSummary[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data: rows, error } = await supabase
      .from('daily_collection_summary')
      .select('*')
      .eq('month', month)
      .order('day', { ascending: false })
    if (error) console.error('[useDailyCollection]', error.message)
    else setData(rows || [])
    setLoading(false)
  }, [month])

  useWhenReady(fetch)
  useEffect(() => { fetch() }, [fetch])

  return { data, loading, refetch: fetch }
}

// ============================================
// PAYMENT AUDIT LOGS
// ============================================
export function usePaymentLogs(paymentId?: string) {
  const [logs, setLogs] = useState<PaymentLog[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('payment_logs')
      .select('*')
      .order('changed_at', { ascending: false })
    if (paymentId) query = query.eq('payment_id', paymentId)
    const { data, error } = await query
    if (error) console.error('[usePaymentLogs]', error.message)
    else setLogs(data || [])
    setLoading(false)
  }, [paymentId])

  useWhenReady(fetch)

  return { logs, loading, refetch: fetch }
}
