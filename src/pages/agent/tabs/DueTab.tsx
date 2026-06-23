import { useState, useMemo } from 'react'
import { useDueMembers } from '@/hooks/useAgent'
import { Member } from '@/types'
import { formatCurrency, getCollectionMonth, formatMonth } from '@/lib/utils'
import { PaymentSheet } from '../components/PaymentSheet'
import { Search, AlertCircle, ChevronRight, CheckCircle2 } from 'lucide-react'

export function DueTab() {
  const currentMonth = getCollectionMonth()
  const { members, loading, refetch } = useDueMembers(currentMonth)
  const [query, setQuery] = useState('')
  const [sheetMember, setSheetMember] = useState<Member | null>(null)
  const [paidNow, setPaidNow] = useState<Set<string>>(new Set())

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return members
    return members.filter(m =>
      m.name.toLowerCase().includes(q) ||
      m.id.toLowerCase().includes(q) ||
      m.mobile.includes(q)
    )
  }, [members, query])

  const handleSuccess = (memberId: string) => {
    setPaidNow(prev => new Set(prev).add(memberId))
    refetch()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Sticky header with search */}
      <div className="bg-white border-b border-stone-100 px-4 py-3 space-y-3">
        {/* Month badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="text-amber-500" />
            <span className="text-sm font-semibold text-stone-700">
              Due for {formatMonth(currentMonth, 'en')}
            </span>
          </div>
          {!loading && (
            <span className="text-xs bg-red-50 text-red-600 font-semibold px-2.5 py-1 rounded-full border border-red-100">
              {members.length} pending
            </span>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Name, ID or mobile..."
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto pb-28">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-20 bg-stone-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
            <CheckCircle2 size={48} className="text-emerald-300 mb-4" />
            <p className="text-stone-600 font-semibold">
              {query ? 'No members match your search' : 'All members have paid!'}
            </p>
            <p className="text-stone-400 text-xs mt-1">
              {query ? 'Try a different name or ID' : `All dues for ${formatMonth(currentMonth, 'en')} are cleared`}
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {filtered.map(member => {
              const justPaid = paidNow.has(member.id)
              return (
                <button
                  key={member.id}
                  onClick={() => !justPaid && setSheetMember(member)}
                  disabled={justPaid}
                  className={`w-full flex items-center gap-3 rounded-2xl p-4 text-left transition-all active:scale-[0.98]
                    ${justPaid
                      ? 'bg-emerald-50 border border-emerald-200 opacity-70 cursor-default'
                      : 'bg-white border border-stone-200 hover:border-indigo-200 hover:shadow-sm'
                    }`}
                >
                  {/* Avatar */}
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center text-base font-bold flex-shrink-0
                    ${justPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-red-50 text-red-500'}`}>
                    {justPaid ? '✓' : member.name[0].toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-stone-900 truncate">{member.name}</p>
                    <p className="text-xs text-stone-400">{member.id} · {member.mobile}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-xs text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded-full">
                        {formatCurrency(member.monthly_amount)} due
                      </span>
                      {member.opening_balance > 0 && (
                        <span className="text-xs text-red-600 font-medium bg-red-50 px-2 py-0.5 rounded-full">
                          +{formatCurrency(member.opening_balance)} arrears
                        </span>
                      )}
                    </div>
                  </div>

                  {justPaid ? (
                    <span className="text-xs text-emerald-600 font-semibold flex-shrink-0">Paid ✓</span>
                  ) : (
                    <ChevronRight size={16} className="text-stone-300 flex-shrink-0" />
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <PaymentSheet
        member={sheetMember}
        open={!!sheetMember}
        defaultMonth={currentMonth}
        onClose={() => setSheetMember(null)}
        onSuccess={() => {
          if (sheetMember) handleSuccess(sheetMember.id)
          setSheetMember(null)
        }}
      />
    </div>
  )
}