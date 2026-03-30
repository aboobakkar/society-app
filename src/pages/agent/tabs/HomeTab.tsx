import { useState } from 'react'
import { useTodaySummary } from '@/hooks/useAgent'
import { Member } from '@/types'
import { formatCurrency, formatMonth } from '@/lib/utils'
import { PaymentSheet } from '../components/PaymentSheet'
import { TrendingUp, Users, Clock, ChevronRight } from 'lucide-react'

export function HomeTab() {
  const { payments, totalToday, count, loading, refetch } = useTodaySummary()
  const [sheetMember, setSheetMember] = useState<Member | null>(null)
  const [sheetMonth, setSheetMonth] = useState<string | undefined>()

  return (
    <div className="p-4 space-y-4 pb-28">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl p-4 text-white shadow-lg shadow-indigo-200">
          <div className="flex items-center gap-2 mb-3 opacity-80">
            <TrendingUp size={16} />
            <span className="text-xs font-medium uppercase tracking-wide">Today's Collection</span>
          </div>
          <p className="text-3xl font-bold">{loading ? '–' : formatCurrency(totalToday)}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl p-4 text-white shadow-lg shadow-emerald-200">
          <div className="flex items-center gap-2 mb-3 opacity-80">
            <Users size={16} />
            <span className="text-xs font-medium uppercase tracking-wide">Payments</span>
          </div>
          <p className="text-3xl font-bold">{loading ? '–' : count}</p>
          <p className="text-xs opacity-75 mt-1">recorded today</p>
        </div>
      </div>

      {/* Today's Recordings */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Clock size={15} className="text-stone-400" />
          <h2 className="text-sm font-semibold text-stone-600 uppercase tracking-wide">Today's Recordings</h2>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-16 bg-stone-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : payments.length === 0 ? (
          <div className="bg-stone-50 border border-stone-100 rounded-2xl p-8 text-center">
            <p className="text-stone-400 text-sm">No payments recorded yet today</p>
            <p className="text-stone-300 text-xs mt-1">Tap a member in the Due tab to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {payments.map(payment => (
              <button
                key={payment.id}
                onClick={() => {
                  if (payment.member) {
                    setSheetMember(payment.member)
                    setSheetMonth(payment.month)
                  }
                }}
                className="w-full flex items-center gap-3 bg-white border border-stone-200 rounded-2xl p-4 text-left hover:shadow-sm transition-all active:scale-[0.98]"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-base flex-shrink-0">
                  {payment.member?.name[0].toUpperCase() || '?'}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-stone-900 truncate">{payment.member?.name || payment.member_id}</p>
                  <p className="text-xs text-stone-400">{payment.member?.id} · {formatMonth(payment.month, 'en')}</p>
                </div>
                {/* Amount + Method */}
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-emerald-600">{formatCurrency(payment.amount)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                    ${payment.method === 'cash' ? 'bg-amber-50 text-amber-700'
                      : payment.method === 'online' ? 'bg-blue-50 text-blue-700'
                      : 'bg-purple-50 text-purple-700'}`}>
                    {payment.method}
                  </span>
                </div>
                <ChevronRight size={14} className="text-stone-300 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      <PaymentSheet
        member={sheetMember}
        open={!!sheetMember}
        defaultMonth={sheetMonth}
        onClose={() => setSheetMember(null)}
        onSuccess={refetch}
      />
    </div>
  )
}
