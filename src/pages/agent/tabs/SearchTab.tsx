import { useState, useMemo } from 'react'
import { useAllMembers } from '@/hooks/useAgent'
import { Member } from '@/types'
import { formatCurrency, getCurrentMonth } from '@/lib/utils'
import { PaymentSheet } from '../components/PaymentSheet'
import { Search, UserSearch, ChevronRight } from 'lucide-react'

export function SearchTab() {
  const { members, loading } = useAllMembers()
  const [query, setQuery] = useState('')
  const [sheetMember, setSheetMember] = useState<Member | null>(null)
  const [refetchKey, setRefetchKey] = useState(0)

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q || q.length < 1) return []
    return members.filter(m =>
      m.name.toLowerCase().includes(q) ||
      m.id.toLowerCase().includes(q) ||
      m.mobile.includes(q)
    )
  }, [members, query])

  const showResults = query.trim().length > 0

  return (
    <div className="flex flex-col h-full">
      {/* Search header */}
      <div className="bg-white border-b border-stone-100 px-4 py-3">
        <div className="relative">
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name, ID or mobile..."
            autoFocus
            className="w-full pl-10 pr-4 py-3 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-lg leading-none"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto pb-28">
        {!showResults ? (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
            <UserSearch size={52} className="text-stone-200 mb-4" />
            <p className="text-stone-500 font-medium">Search for a member</p>
            <p className="text-stone-400 text-xs mt-1">Type a name, member ID (e.g. SCY001) or mobile number</p>
          </div>
        ) : loading ? (
          <div className="p-4 space-y-3">
            {[1, 2].map(i => <div key={i} className="h-20 bg-stone-100 rounded-2xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
            <p className="text-stone-500 font-medium">No members found</p>
            <p className="text-stone-400 text-xs mt-1">Try "{query}" with a different spelling</p>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {filtered.map(member => (
              <button
                key={`${member.id}-${refetchKey}`}
                onClick={() => setSheetMember(member)}
                className="w-full flex items-center gap-3 bg-white border border-stone-200 hover:border-indigo-200 hover:shadow-sm rounded-2xl p-4 text-left transition-all active:scale-[0.98]"
              >
                {/* Avatar */}
                <div className="w-11 h-11 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-base flex-shrink-0">
                  {member.name[0].toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-stone-900 truncate">{member.name}</p>
                  <p className="text-xs text-stone-400">{member.id}</p>
                  <p className="text-xs text-stone-400">{member.mobile}</p>
                </div>

                {/* Amount + Action */}
                <div className="text-right flex-shrink-0 flex items-center gap-2">
                  <div>
                    <p className="text-sm font-semibold text-stone-700">{formatCurrency(member.monthly_amount)}</p>
                    <p className="text-xs text-stone-400">/month</p>
                  </div>
                  <ChevronRight size={16} className="text-stone-300" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <PaymentSheet
        member={sheetMember}
        open={!!sheetMember}
        defaultMonth={getCurrentMonth()}
        onClose={() => setSheetMember(null)}
        onSuccess={() => {
          setRefetchKey(k => k + 1)
          setSheetMember(null)
        }}
      />
    </div>
  )
}
