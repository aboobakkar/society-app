import { useState } from 'react'
import { useAgentSummary, useDailyCollection } from '@/hooks/useFeatures'
import { PageHeader, Card, StatCard, Spinner } from '@/components/ui'
import { formatCurrency, getCurrentMonth, getMonthOptions, formatDate } from '@/lib/utils'
import { Users, Calendar, TrendingUp } from 'lucide-react'

export default function AgentCollectionsPage() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
  const { byAgent, loading: agentLoading } = useAgentSummary(selectedMonth)
  const { data: dailyData, loading: dailyLoading } = useDailyCollection(selectedMonth)
  const currentMonth2 = getCurrentMonth()
  const monthOptions = getMonthOptions(2023).filter(m => m <= currentMonth2)

  const totalByAgents = byAgent.reduce((s, a) => s + a.total_amount, 0)
  const totalDays = dailyData.length

  return (
    <div>
      <PageHeader
        title="Agent Collections"
        subtitle="Per-agent and day-wise breakdown"
        action={
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="px-3 py-2 text-sm border border-stone-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            {monthOptions.slice().reverse().map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        }
      />

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        <StatCard
          label="Total Collected"
          value={agentLoading ? '...' : formatCurrency(totalByAgents)}
          sub={`by ${byAgent.length} agent${byAgent.length !== 1 ? 's' : ''}`}
          valueClass="text-green-700"
        />
        <StatCard
          label="Active Days"
          value={dailyLoading ? '...' : totalDays}
          sub="days with collections"
          valueClass="text-stone-700"
        />
        <StatCard
          label="Daily Average"
          value={totalDays > 0 ? formatCurrency(Math.round(totalByAgents / totalDays)) : '—'}
          sub="per active day"
          valueClass="text-stone-700"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ── Agent-wise Summary ── */}
        <Card padding={false}>
          <div className="px-5 py-3 border-b border-stone-200 flex items-center gap-2">
            <Users size={15} className="text-indigo-500" />
            <h2 className="text-sm font-semibold text-stone-800">By Agent</h2>
          </div>
          {agentLoading ? (
            <div className="p-5"><Spinner /></div>
          ) : byAgent.length === 0 ? (
            <p className="text-sm text-stone-400 p-5 text-center">No agent collections this month</p>
          ) : (
            <div className="divide-y divide-stone-100">
              {byAgent.map((agent, i) => (
                <div key={agent.recorded_by || i} className="px-5 py-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm flex-shrink-0">
                        {(agent.agent_name || agent.agent_email || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-stone-900">
                          {agent.agent_name || agent.agent_email || 'Unknown Agent'}
                        </p>
                        <p className="text-xs text-stone-400">{agent.payment_count} payments</p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-green-700">{formatCurrency(agent.total_amount)}</p>
                  </div>
                  {/* Method breakdown */}
                  <div className="flex gap-2 flex-wrap">
                    {agent.cash_count > 0 && (
                      <span className="text-xs bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-full">
                        Cash: {agent.cash_count}
                      </span>
                    )}
                    {agent.online_count > 0 && (
                      <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full">
                        Online: {agent.online_count}
                      </span>
                    )}
                    {agent.bank_count > 0 && (
                      <span className="text-xs bg-purple-50 text-purple-700 border border-purple-100 px-2 py-0.5 rounded-full">
                        Bank: {agent.bank_count}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ── Day-wise Summary ── */}
        <Card padding={false}>
          <div className="px-5 py-3 border-b border-stone-200 flex items-center gap-2">
            <Calendar size={15} className="text-green-600" />
            <h2 className="text-sm font-semibold text-stone-800">Day-wise</h2>
          </div>
          {dailyLoading ? (
            <div className="p-5"><Spinner /></div>
          ) : dailyData.length === 0 ? (
            <p className="text-sm text-stone-400 p-5 text-center">No collections this month</p>
          ) : (
            <div className="overflow-y-auto max-h-96">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-stone-50 border-b border-stone-200">
                  <tr>
                    {['Date', 'Count', 'Cash', 'Online', 'Total'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-stone-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {dailyData.map(row => (
                    <tr key={row.day} className="hover:bg-stone-50">
                      <td className="px-4 py-2.5 text-stone-700 text-xs font-medium">
                        {formatDate(row.day)}
                      </td>
                      <td className="px-4 py-2.5 text-stone-500 text-xs">{row.payment_count}</td>
                      <td className="px-4 py-2.5 text-amber-700 text-xs">
                        {row.cash_amount > 0 ? formatCurrency(row.cash_amount) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-blue-700 text-xs">
                        {row.online_amount > 0 ? formatCurrency(row.online_amount) : '—'}
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-green-700 text-xs">
                        {formatCurrency(row.total_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
