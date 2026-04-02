import { useState, useEffect } from 'react'
import { useTodaySummary, useMonthlyAgentSummary } from '@/hooks/useAgent'
import { Member } from '@/types'
import { formatCurrency, formatMonth, getCurrentMonth } from '@/lib/utils'
import { PaymentSheet } from '../components/PaymentSheet'
import { RentalSheet } from '../components/RentalSheet'
import { supabase } from '@/lib/supabase'
import { TrendingUp, Clock, ChevronRight, Banknote, Smartphone, Wrench, Calendar } from 'lucide-react'

interface TodayRental {
  id: string
  payer_name: string
  amount: number
  description: string | null
  notes: string | null
}

export function HomeTab() {
  const {
    payments, totalToday, count,
    cashTotal, onlineTotal, cashCount, onlineCount,
    loading, refetch
  } = useTodaySummary()

  const monthly = useMonthlyAgentSummary()

  const [sheetMember, setSheetMember] = useState<Member | null>(null)
  const [sheetMonth, setSheetMonth] = useState<string | undefined>()
  const [rentalOpen, setRentalOpen] = useState(false)
  const [todayRentals, setTodayRentals] = useState<TodayRental[]>([])

  // Fetch today's rental income recorded by this agent
  useEffect(() => {
    async function fetchRentals() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase
        .from('rental_income')
        .select('id, payer_name, amount, description, notes')
        .eq('income_date', today)
        .eq('recorded_by', user.id)
        .order('created_at', { ascending: false })
      if (data) setTodayRentals(data)
    }
    fetchRentals()
  }, [rentalOpen]) // re-fetch when rental sheet closes

  const totalRentalToday = todayRentals.reduce((s, r) => s + r.amount, 0)
  const grandTotal = totalToday + totalRentalToday

  return (
    <div className="flex-1 overflow-y-auto pb-36">
      <div className="p-4 space-y-4">

        {/* ── Monthly Summary ── */}
        <div className="bg-white border border-stone-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={14} className="text-stone-400" />
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
              {formatMonth(getCurrentMonth(), 'en')} — My Collection
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center">
              <p className="text-lg font-bold text-stone-900">
                {monthly.loading ? '–' : formatCurrency(monthly.total)}
              </p>
              <p className="text-xs text-stone-400">Total</p>
            </div>
            <div className="text-center border-x border-stone-100">
              <p className="text-lg font-bold text-amber-700">
                {monthly.loading ? '–' : formatCurrency(monthly.cashTotal)}
              </p>
              <p className="text-xs text-stone-400">Cash</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-blue-700">
                {monthly.loading ? '–' : formatCurrency(monthly.onlineTotal)}
              </p>
              <p className="text-xs text-stone-400">Online</p>
            </div>
          </div>
          {!monthly.loading && (
            <p className="text-xs text-stone-400 text-center mt-2">
              {monthly.count} payment{monthly.count !== 1 ? 's' : ''} recorded this month
            </p>
          )}
        </div>

        {/* ── Today's Collection Card ── */}
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl p-4 text-white shadow-lg shadow-indigo-200">
          <div className="flex items-center gap-2 mb-1 opacity-80">
            <TrendingUp size={15} />
            <span className="text-xs font-semibold uppercase tracking-wide">Today's Collection</span>
          </div>
          <p className="text-4xl font-bold mb-3">{loading ? '–' : formatCurrency(grandTotal)}</p>

          {/* Cash / Online breakdown */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/15 rounded-xl px-3 py-2.5 flex items-center gap-2">
              <Banknote size={16} className="opacity-80 flex-shrink-0" />
              <div>
                <p className="text-xs opacity-75">Cash</p>
                <p className="text-sm font-bold">{loading ? '–' : formatCurrency(cashTotal)}</p>
                {cashCount > 0 && <p className="text-xs opacity-60">{cashCount} payment{cashCount > 1 ? 's' : ''}</p>}
              </div>
            </div>
            <div className="bg-white/15 rounded-xl px-3 py-2.5 flex items-center gap-2">
              <Smartphone size={16} className="opacity-80 flex-shrink-0" />
              <div>
                <p className="text-xs opacity-75">Online / UPI</p>
                <p className="text-sm font-bold">{loading ? '–' : formatCurrency(onlineTotal)}</p>
                {onlineCount > 0 && <p className="text-xs opacity-60">{onlineCount} payment{onlineCount > 1 ? 's' : ''}</p>}
              </div>
            </div>
          </div>

          {totalRentalToday > 0 && (
            <div className="mt-2 bg-white/10 rounded-xl px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 opacity-80">
                <Wrench size={13} />
                <span className="text-xs">Rental income</span>
              </div>
              <span className="text-sm font-bold">{formatCurrency(totalRentalToday)}</span>
            </div>
          )}

          <p className="text-xs opacity-60 mt-2">{count} member payment{count !== 1 ? 's' : ''} recorded today</p>
        </div>

        {/* ── Today's Member Payments ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock size={15} className="text-stone-400" />
            <h2 className="text-sm font-semibold text-stone-600 uppercase tracking-wide">Today's Recordings</h2>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <div key={i} className="h-16 bg-stone-100 rounded-2xl animate-pulse" />)}
            </div>
          ) : payments.length === 0 && todayRentals.length === 0 ? (
            <div className="bg-stone-50 border border-stone-100 rounded-2xl p-8 text-center">
              <p className="text-stone-400 text-sm">No recordings yet today</p>
              <p className="text-stone-300 text-xs mt-1">Tap a member in the Due tab to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Member payments */}
              {payments.map(payment => (
                <button key={payment.id}
                  onClick={() => {
                    if (payment.member) {
                      setSheetMember(payment.member)
                      setSheetMonth(payment.month)
                    }
                  }}
                  className="w-full flex items-center gap-3 bg-white border border-stone-200 rounded-2xl p-4 text-left hover:shadow-sm transition-all active:scale-[0.98]">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-base flex-shrink-0">
                    {payment.member?.name[0].toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-stone-900 truncate">
                      {payment.member?.name || payment.member_id}
                    </p>
                    <p className="text-xs text-stone-400">
                      {payment.member?.id} · {formatMonth(payment.month, 'en')}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-emerald-600">{formatCurrency(payment.amount)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                      ${payment.method === 'cash'   ? 'bg-amber-50 text-amber-700'
                      : payment.method === 'online' ? 'bg-blue-50 text-blue-700'
                      :                               'bg-purple-50 text-purple-700'}`}>
                      {payment.method}
                    </span>
                  </div>
                  <ChevronRight size={14} className="text-stone-300 flex-shrink-0" />
                </button>
              ))}

              {/* Rental income entries */}
              {todayRentals.map(rental => (
                <div key={rental.id}
                  className="flex items-center gap-3 bg-teal-50 border border-teal-100 rounded-2xl p-4">
                  <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                    <Wrench size={16} className="text-teal-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-stone-900 truncate">{rental.payer_name}</p>
                    <p className="text-xs text-teal-600">{rental.description || 'Tool rental'}</p>
                  </div>
                  <p className="text-sm font-bold text-teal-700 flex-shrink-0">{formatCurrency(rental.amount)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── FAB: Add Rental Income ── */}
      <button onClick={() => setRentalOpen(true)}
        className="fixed bottom-6 right-4 z-30 flex items-center gap-2 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white px-4 py-3 rounded-2xl shadow-lg shadow-teal-300 transition-all font-semibold text-sm">
        <Wrench size={16} />
        + Rental Income
      </button>

      <PaymentSheet
        member={sheetMember}
        open={!!sheetMember}
        defaultMonth={sheetMonth}
        existingPayment={sheetMember ? payments.find(p => p.member_id === sheetMember.id) : null}
        onClose={() => setSheetMember(null)}
        onSuccess={refetch}
      />

      <RentalSheet
        open={rentalOpen}
        onClose={() => setRentalOpen(false)}
        onSuccess={refetch}
      />
    </div>
  )
}
