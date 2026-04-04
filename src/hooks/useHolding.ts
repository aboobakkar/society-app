import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export interface HoldingBalance {
  person: string
  collected: number       // total received from payments + rental_income
  transferredOut: number
  transferredIn: number
  amount: number          // net = collected - out + in
}

export interface CashTransfer {
  id: string
  from_person: string
  to_person: string
  amount: number
  transfer_date: string
  notes: string | null
  created_at: string
}

// Extract "Cash held by: NAME" from notes field
function extractHoldingPerson(notes: string | null): string | null {
  if (!notes) return null
  const match = notes.match(/Cash held by:\s*([^|]+?)(\s*\|.*)?$/)
  return match ? match[1].trim() : null
}

function monthEnd(month: string): string {
  const [y, m] = month.split('-')
  const last = new Date(parseInt(y), parseInt(m), 0).getDate()
  return `${y}-${m}-${String(last).padStart(2, '0')}`
}

// ============================================
// HOLDING SUMMARY
// Aggregates from:
//   1. payments table (monthly + imam_food, any method)
//   2. rental_income table (any method)
//   3. cash_transfers table
// ============================================
export function useHoldingSummary(month: string) {
  const [balances, setBalances] = useState<HoldingBalance[]>([])
  const [transfers, setTransfers] = useState<CashTransfer[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)

    const start = `${month}-01`
    const end = monthEnd(month)

    const [
      { data: payments },
      { data: rentals },
      { data: transferData },
    ] = await Promise.all([
      // All payments this month that have a holding person — any method, any type
      supabase
        .from('payments')
        .select('amount, notes')
        .eq('month', month)
        .like('notes', '%Cash held by:%'),

      // All rental income this month that have a holding person
      supabase
        .from('rental_income')
        .select('amount, notes')
        .gte('income_date', start)
        .lte('income_date', end)
        .like('notes', '%Cash held by:%'),

      // All transfers this month
      supabase
        .from('cash_transfers')
        .select('*')
        .gte('transfer_date', start)
        .lte('transfer_date', end)
        .order('created_at', { ascending: false }),
    ])

    // Build collected amounts per person from both sources
    const collected: Record<string, number> = {}

    for (const p of payments || []) {
      const person = extractHoldingPerson(p.notes)
      if (person) collected[person] = (collected[person] || 0) + p.amount
    }

    for (const r of rentals || []) {
      const person = extractHoldingPerson(r.notes)
      if (person) collected[person] = (collected[person] || 0) + r.amount
    }

    // Build transfer maps
    const out: Record<string, number> = {}
    const inn: Record<string, number> = {}
    for (const t of transferData || []) {
      out[t.from_person] = (out[t.from_person] || 0) + t.amount
      inn[t.to_person] = (inn[t.to_person] || 0) + t.amount
    }

    // Merge all unique persons
    const allPersons = new Set([
      ...Object.keys(collected),
      ...Object.keys(out),
      ...Object.keys(inn),
    ])

    const result: HoldingBalance[] = Array.from(allPersons).map(person => {
      const c = collected[person] || 0
      const o = out[person] || 0
      const i = inn[person] || 0
      return {
        person,
        collected: c,
        transferredOut: o,
        transferredIn: i,
        amount: c - o + i,
      }
    }).sort((a, b) => b.amount - a.amount)

    setBalances(result)
    setTransfers((transferData || []) as CashTransfer[])
    setLoading(false)
  }, [month])

  useEffect(() => { fetch() }, [fetch])

  const totalHeld = balances.reduce((s, b) => s + Math.max(0, b.amount), 0)

  return { balances, transfers, totalHeld, loading, refetch: fetch }
}

// ============================================
// RECORD TRANSFER
// ============================================
export async function recordTransfer(params: {
  fromPerson: string
  toPerson: string
  amount: number
  notes?: string
  recordedBy: string
}): Promise<boolean> {
  try {
    const { error } = await supabase.from('cash_transfers').insert({
      from_person: params.fromPerson,
      to_person: params.toPerson,
      amount: params.amount,
      notes: params.notes || null,
      recorded_by: params.recordedBy,
    })
    if (error) { toast.error(error.message); return false }
    toast.success(`Transfer recorded: ${params.fromPerson} → ${params.toPerson}`)
    return true
  } catch (e: any) {
    toast.error(e?.message || 'Unexpected error')
    return false
  }
}