import { useState, useMemo } from 'react'
import { useAllMembers } from '@/hooks/useAgent'
import { Member } from '@/types'
import { formatCurrency, getCollectionMonth } from '@/lib/utils'
import { PaymentSheet } from '../components/PaymentSheet'
import { Search, CheckCircle2, ChevronRight } from 'lucide-react'

export function SearchTab() {
  const { members, paidThisMonth, loading } = useAllMembers()
  const [query, setQuery] = useState('')
  const [sheetMember, setSheetMember] = useState<Member | null>(null)
  const [paidNow, setPaidNow] = useState<Set<string>>(new Set())

  // Filter by search query — if empty, show ALL members
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return members  // show all by default
    return members.filter(m =>
      m.name.toLowerCase().includes(q) ||
      m.id.toLowerCase().includes(q) ||
      m.mobile.includes(q)
    )
  }, [members, query])

  const handleSuccess = (memberId: string) => {
    setPaidNow(prev => new Set(prev).add(memberId))
    setSheetMember(null)
  }

  const isPaid = (memberId: string) => paidThisMonth.has(memberId) || paidNow.has(memberId)

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="bg-white border-b border-stone-100 px-4 py-3">
        <div className="relative">
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name, ID or mobile..."
            className="w-full pl-10 pr-10 py-3 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {query && (
            <button onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xl leading-none">
              ×
            </button>
          )}
        </div>

        {/* Summary counts */}
        {!loading && (
          <div className="flex gap-3 mt-2 text-xs text-stone-400">
            <span className="text-green-600 font-medium">{paidThisMonth.size} paid</span>
            <span>·</span>
            <span className="text-amber-600 font-medium">{members.length - paidThisMonth.size} pending</span>
            <span>·</span>
            <span>{members.length} total</span>
          </div>
        )}
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
            <p className="text-stone-500 font-medium">No members found</p>
            <p className="text-stone-400 text-xs mt-1">Try a different name or ID</p>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {/* Section label for pending */}
            {!query && members.filter(m => !isPaid(m.id)).length > 0 && (
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide px-1 pb-1">
                Pending · {members.filter(m => !isPaid(m.id)).length}
              </p>
            )}

            {filtered.map((member, idx) => {
              const paid = isPaid(member.id)
              const prevPaid = idx > 0 ? isPaid(filtered[idx - 1].id) : false
              const showPaidHeader = !query && paid && !prevPaid

              return (
                <div key={member.id}>
                  {/* Divider when transitioning from pending → paid */}
                  {showPaidHeader && (
                    <div className="flex items-center gap-2 pt-3 pb-1">
                      <div className="flex-1 h-px bg-stone-200" />
                      <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">
                        Paid · {members.filter(m => isPaid(m.id)).length}
                      </p>
                      <div className="flex-1 h-px bg-stone-200" />
                    </div>
                  )}

                  <button
                    onClick={() => !paid && setSheetMember(member)}
                    disabled={paid}
                    className={`w-full flex items-center gap-3 rounded-2xl p-4 text-left transition-all active:scale-[0.98]
                      ${paid
                        ? 'bg-stone-50 border border-stone-100 opacity-60 cursor-default'
                        : 'bg-white border border-stone-200 hover:border-indigo-200 hover:shadow-sm'
                      }`}
                  >
                    {/* Avatar */}
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center text-base font-bold flex-shrink-0
                      ${paid ? 'bg-green-100 text-green-600' : 'bg-indigo-100 text-indigo-700'}`}>
                      {paid ? <CheckCircle2 size={20} /> : member.name[0].toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-stone-900 truncate">{member.name}</p>
                      <p className="text-xs text-stone-400">{member.id} · {member.mobile}</p>
                      {member.opening_balance > 0 && (
                        <span className="text-xs text-red-600 font-medium bg-red-50 px-1.5 py-0.5 rounded-full">
                          +{formatCurrency(member.opening_balance)} arrears
                        </span>
                      )}
                    </div>

                    {/* Right side */}
                    <div className="text-right flex-shrink-0 flex items-center gap-2">
                      <div>
                        <p className={`text-sm font-semibold ${paid ? 'text-green-600' : 'text-stone-700'}`}>
                          {paid ? 'Paid ✓' : formatCurrency(member.monthly_amount)}
                        </p>
                        {!paid && <p className="text-xs text-stone-400">/month</p>}
                      </div>
                      {!paid && <ChevronRight size={16} className="text-stone-300" />}
                    </div>
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <PaymentSheet
        member={sheetMember}
        open={!!sheetMember}
        defaultMonth={getCollectionMonth()}
        onClose={() => setSheetMember(null)}
        onSuccess={() => sheetMember && handleSuccess(sheetMember.id)}
      />
    </div>
  )
}