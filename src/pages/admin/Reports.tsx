import { useState } from 'react'
import { useMembers, usePayments, useMonthlyReport } from '@/hooks/useData'
import { useLang } from '@/hooks/useLang'
import { Card, PageHeader, StatCard, Spinner, Badge } from '@/components/ui'
import { formatCurrency, formatMonth, getMonthsInYear, isPastOrCurrentMonth } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'

const MONTHS_SHORT_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const MONTHS_SHORT_ML = ['ജന','ഫെബ','മാർ','ഏപ്','മേ','ജൂൺ','ജൂ','ഓഗ','സെ','ഒക്','നവ','ഡി']

export default function ReportsPage() {
  const { t, lang } = useLang()
  const currentYear = new Date().getFullYear().toString()
  const [year, setYear] = useState(currentYear)
  const { members } = useMembers()
  const { data: monthlyData, loading } = useMonthlyReport(year)

  const activeMembers = members.filter(m => m.status === 'active')
  const yearMonths = getMonthsInYear(year)

  // For member grid, fetch all payments for the year
  const { payments: allPayments } = usePayments()

  const yearPayments = allPayments.filter(p => p.month.startsWith(year))
  const totalYearCollected = yearPayments.reduce((s, p) => s + p.amount, 0)
  const totalYearExpenses = monthlyData.reduce((s, m) => s + m.expenses, 0)

  const chartData = monthlyData.map((m, i) => ({
    name: lang === 'ml' ? MONTHS_SHORT_ML[i] : MONTHS_SHORT_EN[i],
    [t('Collected', 'ശേഖരം')]: m.collected,
    [t('Expenses', 'ചെലവ്')]: m.expenses,
  }))

  const memberStatus = activeMembers.map(m => {
    const paid = yearMonths.filter(month =>
      isPastOrCurrentMonth(month) && yearPayments.some(p => p.member_id === m.id && p.month === month)
    )
    const pending = yearMonths.filter(month =>
      isPastOrCurrentMonth(month) && !yearPayments.some(p => p.member_id === m.id && p.month === month)
    )
    return { ...m, paid, pending, totalPaid: paid.length * m.monthly_amount }
  })

  const pastMonths = yearMonths.filter(m => isPastOrCurrentMonth(m))

  if (loading) return <Spinner />

  return (
    <div>
      <PageHeader
        title={t('Reports', 'റിപ്പോർട്ട്')}
        action={
          <select value={year} onChange={e => setYear(e.target.value)}
            className="px-3 py-2 text-sm border border-stone-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500">
            {['2023','2024','2025','2026'].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        }
      />

      {/* Year summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label={t('Year Collected', 'വാർഷിക ശേഖരം')} value={formatCurrency(totalYearCollected)} valueClass="text-green-700" />
        <StatCard label={t('Year Expenses', 'വാർഷിക ചെലവ്')} value={formatCurrency(totalYearExpenses)} valueClass="text-red-700" />
        <StatCard label={t('Net Balance', 'നെറ്റ് ബാലൻസ്')}
          value={formatCurrency(totalYearCollected - totalYearExpenses)}
          valueClass={(totalYearCollected - totalYearExpenses) >= 0 ? 'text-green-700' : 'text-red-700'}
        />
        <StatCard label={t('Avg Monthly Collection', 'ശരാ. മാസ ശേഖരം')}
          value={formatCurrency(Math.round(totalYearCollected / Math.max(pastMonths.length, 1)))}
          valueClass="text-stone-700"
        />
      </div>

      {/* Bar Chart */}
      <Card className="mb-6">
        <h2 className="text-sm font-semibold text-stone-800 mb-4">{t('Monthly Collection vs Expenses', 'മാസ ശേഖരം vs ചെലവ്')}</h2>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0ede8" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#78716c' }} />
            <YAxis tick={{ fontSize: 11, fill: '#78716c' }} tickFormatter={v => `₹${v >= 1000 ? `${v/1000}k` : v}`} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey={t('Collected', 'ശേഖരം')} fill="#15803d" radius={[3,3,0,0]} />
            <Bar dataKey={t('Expenses', 'ചെലവ്')} fill="#dc2626" radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Monthly Table */}
      <Card className="mb-6" padding={false}>
        <div className="px-5 py-3 border-b border-stone-200">
          <h2 className="text-sm font-semibold text-stone-800">{t('Monthly Summary', 'മാസ സംഗ്രഹം')} {year}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">
                {[t('Month','മാസം'), t('Collected','ശേഖരം'), t('Expenses','ചെലവ്'), t('Balance','ബാലൻസ്'), t('Paid','അടച്ചത്'), t('Pending','കുടിശ്ശിക')].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-stone-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {monthlyData.map((row, i) => {
                if (!isPastOrCurrentMonth(yearMonths[i]) && row.collected === 0 && row.expenses === 0) return null
                const pending = activeMembers.length - row.paidCount
                return (
                  <tr key={row.month} className="hover:bg-stone-50">
                    <td className="px-4 py-2.5 font-medium text-stone-800">
                      {lang === 'ml' ? MONTHS_SHORT_ML[i] : MONTHS_SHORT_EN[i]} {year}
                    </td>
                    <td className="px-4 py-2.5 text-green-700 font-medium">{formatCurrency(row.collected)}</td>
                    <td className="px-4 py-2.5 text-red-600">{formatCurrency(row.expenses)}</td>
                    <td className={`px-4 py-2.5 font-semibold ${row.balance >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {formatCurrency(row.balance)}
                    </td>
                    <td className="px-4 py-2.5 text-green-700">{row.paidCount}</td>
                    <td className="px-4 py-2.5">
                      {pending > 0
                        ? <span className="text-amber-700 font-medium">{pending}</span>
                        : <span className="text-green-700">✓</span>
                      }
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Member payment grid */}
      <Card padding={false}>
        <div className="px-5 py-3 border-b border-stone-200">
          <h2 className="text-sm font-semibold text-stone-800">{t('Member-wise Status', 'അംഗ-അനുസൃത സ്ഥിതി')} {year}</h2>
          <p className="text-xs text-stone-400 mt-0.5">{t('✓ = paid, ✗ = pending', '✓ = അടച്ചത്, ✗ = കുടിശ്ശിക')}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">
                <th className="px-4 py-2.5 text-left font-medium text-stone-500 sticky left-0 bg-stone-50 min-w-36">{t('Member', 'അംഗം')}</th>
                {pastMonths.map((m, i) => (
                  <th key={m} className="px-1.5 py-2.5 text-center font-medium text-stone-500 min-w-8">
                    {lang === 'ml' ? MONTHS_SHORT_ML[parseInt(m.split('-')[1])-1] : MONTHS_SHORT_EN[parseInt(m.split('-')[1])-1]}
                  </th>
                ))}
                <th className="px-4 py-2.5 text-right font-medium text-stone-500">{t('Total Paid', 'ആകെ')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {memberStatus.map(m => (
                <tr key={m.id} className="hover:bg-stone-50">
                  <td className="px-4 py-2.5 sticky left-0 bg-white">
                    <p className="font-medium text-stone-800">{lang === 'ml' ? m.name_ml || m.name : m.name}</p>
                    <p className="text-stone-400">{m.id}</p>
                  </td>
                  {pastMonths.map(month => {
                    const paid = m.paid.includes(month)
                    return (
                      <td key={month} className="px-1.5 py-2.5 text-center">
                        <span className={paid ? 'text-green-600' : 'text-red-400'}>{paid ? '✓' : '✗'}</span>
                      </td>
                    )
                  })}
                  <td className="px-4 py-2.5 text-right font-semibold text-green-700">
                    {formatCurrency(m.totalPaid)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
