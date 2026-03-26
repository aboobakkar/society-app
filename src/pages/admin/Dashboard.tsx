import { useState } from 'react'
import { useMembers, usePayments, useExpenses } from '@/hooks/useData'
import { useLang } from '@/hooks/useLang'
import { StatCard, Card, Badge, Spinner } from '@/components/ui'
import { formatCurrency, formatMonth, getCurrentMonth, formatDate } from '@/lib/utils'
import { TrendingUp, TrendingDown, Users, AlertCircle } from 'lucide-react'

export default function AdminDashboard() {
  const { t, lang } = useLang()
  const currentMonth = getCurrentMonth()
  const [selectedMonth] = useState(currentMonth)

  const { members, loading: mLoading } = useMembers()
  const { payments, loading: pLoading } = usePayments(selectedMonth)
  const { expenses, loading: eLoading } = useExpenses(selectedMonth)

  if (mLoading || pLoading || eLoading) return <Spinner />

  const activeMembers = members.filter(m => m.status === 'active')
  const totalCollected = payments.reduce((s, p) => s + p.amount, 0)
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const balance = totalCollected - totalExpenses
  const paidMemberIds = new Set(payments.map(p => p.member_id))
  const unpaidMembers = activeMembers.filter(m => !paidMemberIds.has(m.id))
  const expectedTotal = activeMembers.reduce((s, m) => s + m.monthly_amount, 0)
  const collectionRate = expectedTotal > 0 ? Math.round((totalCollected / expectedTotal) * 100) : 0

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-stone-900">{t('Dashboard', 'ഡാഷ്ബോർഡ്')}</h1>
        <p className="text-sm text-stone-500 mt-0.5">{formatMonth(selectedMonth, lang)} — {t('Overview', 'സംഗ്രഹം')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          label={t('Collected', 'ശേഖരിച്ചത്')}
          value={formatCurrency(totalCollected)}
          sub={`${payments.length} ${t('payments', 'പേയ്മെന്റ്')}`}
          valueClass="text-green-700"
        />
        <StatCard
          label={t('Expenses', 'ചെലവ്')}
          value={formatCurrency(totalExpenses)}
          sub={t('this month', 'ഈ മാസം')}
          valueClass="text-red-700"
        />
        <StatCard
          label={t('Balance', 'ബാലൻസ്')}
          value={formatCurrency(balance)}
          sub={balance >= 0 ? t('surplus', 'മിച്ചം') : t('deficit', 'കുറവ്')}
          valueClass={balance >= 0 ? 'text-green-700' : 'text-red-700'}
        />
        <StatCard
          label={t('Collection Rate', 'ശേഖരണ നിരക്ക്')}
          value={`${collectionRate}%`}
          sub={`${payments.length}/${activeMembers.length} ${t('paid', 'അടച്ചത്')}`}
          valueClass={collectionRate === 100 ? 'text-green-700' : 'text-amber-700'}
        />
      </div>

      {/* Pending alert */}
      {unpaidMembers.length > 0 && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800 mb-2">
                {unpaidMembers.length} {t('members have not paid this month', 'അംഗങ്ങൾ ഈ മാസം അടച്ചിട്ടില്ല')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {unpaidMembers.map(m => (
                  <span key={m.id} className="text-xs bg-white border border-amber-200 text-amber-700 rounded-md px-2 py-0.5">
                    {m.id} · {lang === 'ml' ? m.name_ml || m.name : m.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Payments */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-green-600" />
            <h2 className="text-sm font-semibold text-stone-800">{t('Recent Payments', 'സമീപകാല പേയ്മെന്റ്')}</h2>
          </div>
          <div className="divide-y divide-stone-100">
            {payments.slice(0, 6).map(p => {
              const member = members.find(m => m.id === p.member_id)
              return member ? (
                <div key={p.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium text-stone-800">
                      {lang === 'ml' ? member.name_ml || member.name : member.name}
                    </p>
                    <p className="text-xs text-stone-400">{formatDate(p.payment_date)} · {p.method}</p>
                  </div>
                  <span className="text-sm font-semibold text-green-700">{formatCurrency(p.amount)}</span>
                </div>
              ) : null
            })}
            {payments.length === 0 && <p className="text-sm text-stone-400 py-4 text-center">{t('No payments this month', 'ഈ മാസം പേയ്മെന്റൊന്നും ഇല്ല')}</p>}
          </div>
        </Card>

        {/* Recent Expenses */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown size={16} className="text-red-500" />
            <h2 className="text-sm font-semibold text-stone-800">{t('Recent Expenses', 'സമീപകാല ചെലവ്')}</h2>
          </div>
          <div className="divide-y divide-stone-100">
            {expenses.slice(0, 6).map(e => (
              <div key={e.id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm font-medium text-stone-800">{e.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge text={e.category} variant={e.category === 'salary' ? 'info' : e.category === 'utility' ? 'warning' : 'neutral'} />
                    <span className="text-xs text-stone-400">{formatDate(e.expense_date)}</span>
                  </div>
                </div>
                <span className="text-sm font-semibold text-red-600">{formatCurrency(e.amount)}</span>
              </div>
            ))}
            {expenses.length === 0 && <p className="text-sm text-stone-400 py-4 text-center">{t('No expenses this month', 'ഈ മാസം ചെലവൊന്നും ഇല്ല')}</p>}
          </div>
        </Card>
      </div>

      {/* Members summary bar */}
      <Card className="mt-4">
        <div className="flex items-center gap-2 mb-3">
          <Users size={16} className="text-stone-500" />
          <h2 className="text-sm font-semibold text-stone-800">{t('Members Overview', 'അംഗ സംഗ്രഹം')}</h2>
        </div>
        <div className="flex gap-4 text-sm">
          <div><span className="text-stone-500">{t('Total', 'ആകെ')}: </span><span className="font-medium">{members.length}</span></div>
          <div><span className="text-stone-500">{t('Active', 'സജീവം')}: </span><span className="font-medium text-green-700">{activeMembers.length}</span></div>
          <div><span className="text-stone-500">{t('Inactive', 'നിഷ്ക്രിയം')}: </span><span className="font-medium text-stone-400">{members.length - activeMembers.length}</span></div>
          <div><span className="text-stone-500">{t('Paid', 'അടച്ചത്')}: </span><span className="font-medium text-green-700">{payments.length}</span></div>
          <div><span className="text-stone-500">{t('Pending', 'കുടിശ്ശിക')}: </span><span className="font-medium text-amber-700">{unpaidMembers.length}</span></div>
        </div>
        {/* Progress bar */}
        <div className="mt-3 h-2 bg-stone-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all"
            style={{ width: `${collectionRate}%` }}
          />
        </div>
        <p className="text-xs text-stone-400 mt-1">{collectionRate}% {t('collection rate', 'ശേഖരണ നിരക്ക്')}</p>
      </Card>
    </div>
  )
}
