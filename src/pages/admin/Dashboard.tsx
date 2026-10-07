import { useMembers, usePayments, useExpenses } from '@/hooks/useData';
import { useRentalIncome } from '@/hooks/useFeatures';
import { useHoldingSummary } from '@/hooks/useHolding';
import { useNavigate } from 'react-router-dom';
import { useLang } from '@/hooks/useLang';
import { StatCard, Card, Badge } from '@/components/ui';
import {
    formatCurrency,
    formatMonth,
    getCurrentMonth,
    formatDate,
} from '@/lib/utils';
import { TrendingUp, TrendingDown, Users, AlertCircle } from 'lucide-react';

function SkeletonRow() {
    return (
        <div className='flex items-center justify-between py-2.5 animate-pulse'>
            <div className='space-y-1.5'>
                <div className='h-3 w-32 bg-stone-200 rounded' />
                <div className='h-2.5 w-20 bg-stone-100 rounded' />
            </div>
            <div className='h-3 w-14 bg-stone-200 rounded' />
        </div>
    );
}

export default function AdminDashboard() {
    const { i18n, lang } = useLang();
    const calendarMonth = getCurrentMonth(); // YYYY-MM
    const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const { members, loading: mLoading } = useMembers();
    // Fetch payments without strict single-month boundary to allow precise date filtering
    const { payments, loading: pLoading } = usePayments();
    const { expenses, loading: eLoading } = useExpenses(calendarMonth);
    const { totalRental, loading: rLoading } = useRentalIncome(calendarMonth);
    const {
        balances: holdingBalances,
        totalHeld,
        loading: hLoading,
    } = useHoldingSummary();
    const navigate = useNavigate();

    const activeMembers = members.filter((m) => m.status === 'active');

    // Filter payments strictly by transaction date (payment_date or created_at)
    const todayPayments = payments.filter((p) => {
        const pDate = p.payment_date || p.created_at?.split('T')[0];
        return pDate === todayStr;
    });

    const thisMonthPayments = payments.filter((p) => {
        const pDate = p.payment_date || p.created_at?.split('T')[0];
        return pDate && pDate.startsWith(calendarMonth);
    });

    // Today's total collections (all payment types)
    const todayTotalCollected = todayPayments.reduce((s, p) => s + Number(p.amount || 0), 0);

    // This month's collections
    const monthlyPayments = thisMonthPayments.filter(
        (p) => (p.payment_type ?? 'monthly') === 'monthly',
    );
    const imamFoodPayments = thisMonthPayments.filter(
        (p) => p.payment_type === 'imam_food',
    );

    const totalCollected = monthlyPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const imamFoodCollected = imamFoodPayments.reduce(
        (s, p) => s + Number(p.amount || 0),
        0,
    );

    const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    const balance = totalCollected - totalExpenses;

    const paidMemberIds = new Set(monthlyPayments.map((p) => p.member_id));
    const unpaidMembers = activeMembers.filter((m) => !paidMemberIds.has(m.id));
    const expectedTotal = activeMembers.reduce(
        (s, m) => s + Number(m.monthly_amount || 0),
        0,
    );
    const collectionRate =
        expectedTotal > 0
            ? Math.round((totalCollected / expectedTotal) * 100)
            : 0;

    const dataLoading =
        mLoading || pLoading || eLoading || rLoading || hLoading;

    return (
      <div>
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-stone-900">
            {i18n.dashboard}
          </h1>
          <p className="text-sm text-stone-500 mt-0.5">
            {formatMonth(calendarMonth, lang)} — {i18n.overview}
            {dataLoading && (
              <span className="ml-2 text-amber-600 text-xs animate-pulse">
                ● {i18n.loading}
              </span>
            )}
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          {/* Today's Collection Card */}
          <StatCard
            label="Today's Collection"
            value={pLoading ? "..." : formatCurrency(todayTotalCollected)}
            sub={`${todayPayments.length} payments today`}
            valueClass="text-emerald-700"
          />
          <StatCard
            label={i18n.collected}
            value={pLoading ? "..." : formatCurrency(totalCollected)}
            sub={
              pLoading
                ? ""
                : `${monthlyPayments.length} ${i18n.payments} (${i18n.thisMonth})`
            }
            valueClass="text-green-700"
          />
          <StatCard
            label={i18n.expenses}
            value={eLoading ? "..." : formatCurrency(totalExpenses)}
            sub={i18n.thisMonth}
            valueClass="text-red-700"
          />
          <StatCard
            label={i18n.balance}
            value={dataLoading ? "..." : formatCurrency(balance)}
            sub={dataLoading ? "" : balance >= 0 ? i18n.surplus : i18n.deficit}
            valueClass={balance >= 0 ? "text-green-700" : "text-red-700"}
          />
          <StatCard
            label={i18n.imamFoodAllowance}
            value={
              pLoading
                ? "..."
                : imamFoodCollected > 0
                  ? formatCurrency(imamFoodCollected)
                  : "—"
            }
            sub={
              pLoading
                ? ""
                : imamFoodPayments.length > 0
                  ? `${imamFoodPayments.length} payments`
                  : "None this month"
            }
            valueClass="text-purple-700"
          />
        </div>

        {/* Pending alert */}
        {!dataLoading && unpaidMembers.length > 0 && (
          <Card className="mb-6 border-amber-200 bg-amber-50">
            <div className="flex items-start gap-3">
              <AlertCircle
                size={18}
                className="text-amber-600 flex-shrink-0 mt-0.5"
              />
              <div>
                <p className="text-sm font-medium text-amber-800 mb-2">
                  {unpaidMembers.length} {i18n.membersNotPaid}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {unpaidMembers.map((m) => (
                    <span
                      key={m.id}
                      className="text-xs bg-white border border-amber-200 text-amber-700 rounded-md px-2 py-0.5"
                    >
                      {m.id} · {lang === "ml" ? m.name_ml || m.name : m.name}
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
              <h2 className="text-sm font-semibold text-stone-800">
                {i18n.recentPayments}
              </h2>
            </div>
            <div className="divide-y divide-stone-100">
              {pLoading || mLoading ? (
                Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
              ) : payments.length === 0 ? (
                <p className="text-sm text-stone-400 py-4 text-center">
                  {i18n.noPaymentsThisMonth}
                </p>
              ) : (
                payments.slice(0, 6).map((p) => {
                  const member = members.find((m) => m.id === p.member_id);
                  return member ? (
                    <div
                      key={p.id}
                      className="flex items-center justify-between py-2.5"
                    >
                      <div>
                        <p className="text-sm font-medium text-stone-800">
                          {lang === "ml"
                            ? member.name_ml || member.name
                            : member.name}
                          {p.payment_type === "imam_food" && (
                            <span className="ml-1.5 text-xs bg-purple-50 border border-purple-200 text-purple-700 rounded-full px-1.5 py-0.5">
                              Imam
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-stone-400">
                          {formatDate(p.payment_date || p.created_at)} ·{" "}
                          {p.method}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-green-700">
                        {formatCurrency(p.amount)}
                      </span>
                    </div>
                  ) : null;
                })
              )}
            </div>
          </Card>

          {/* Recent Expenses */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown size={16} className="text-red-500" />
              <h2 className="text-sm font-semibold text-stone-800">
                {i18n.recentExpenses}
              </h2>
            </div>
            <div className="divide-y divide-stone-100">
              {eLoading ? (
                Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
              ) : expenses.length === 0 ? (
                <p className="text-sm text-stone-400 py-4 text-center">
                  {i18n.noExpensesThisMonth}
                </p>
              ) : (
                expenses.slice(0, 6).map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between py-2.5"
                  >
                    <div>
                      <p className="text-sm font-medium text-stone-800">
                        {e.description}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge
                          text={e.category}
                          variant={
                            e.category === "salary"
                              ? "info"
                              : e.category === "utility"
                                ? "warning"
                                : "neutral"
                          }
                        />
                        <span className="text-xs text-stone-400">
                          {formatDate(e.expense_date)}
                        </span>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-red-600">
                      {formatCurrency(e.amount)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Members Overview */}
        <Card className="mt-4">
          <div className="flex items-center gap-2 mb-3">
            <Users size={16} className="text-stone-500" />
            <h2 className="text-sm font-semibold text-stone-800">
              {i18n.membersOverview}
            </h2>
          </div>
          {mLoading ? (
            <div className="h-4 w-48 bg-stone-200 rounded animate-pulse" />
          ) : (
            <>
              <div className="flex gap-4 text-sm flex-wrap">
                <div>
                  <span className="text-stone-500">{i18n.total}: </span>
                  <span className="font-medium">{members.length}</span>
                </div>
                <div>
                  <span className="text-stone-500">{i18n.active}: </span>
                  <span className="font-medium text-green-700">
                    {activeMembers.length}
                  </span>
                </div>
                <div>
                  <span className="text-stone-500">{i18n.inactive}: </span>
                  <span className="font-medium text-stone-400">
                    {members.length - activeMembers.length}
                  </span>
                </div>
                <div>
                  <span className="text-stone-500">{i18n.paid}: </span>
                  <span className="font-medium text-green-700">
                    {monthlyPayments.length}
                  </span>
                </div>
                <div>
                  <span className="text-stone-500">{i18n.pending}: </span>
                  <span className="font-medium text-amber-700">
                    {unpaidMembers.length}
                  </span>
                </div>
              </div>
              <div className="mt-3 h-2 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-700"
                  style={{ width: `${collectionRate}%` }}
                />
              </div>
              <p className="text-xs text-stone-400 mt-1">
                {collectionRate}% {i18n.collectionRate}
              </p>
            </>
          )}
        </Card>

        {/* Cash Holdings Summary */}
        {!hLoading &&
          holdingBalances.filter((b) => b.amount > 0).length > 0 && (
            <Card
              className="mt-4 cursor-pointer hover:border-amber-300 transition-colors"
              onClick={() => navigate("/admin/cash-holding")}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-base">💵</span>
                  <h2 className="text-sm font-semibold text-stone-800">
                    Cash Holdings
                  </h2>
                </div>
                <span className="text-sm font-bold text-amber-700">
                  {formatCurrency(totalHeld)}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {holdingBalances
                  .filter((b) => b.amount > 0)
                  .map((b) => (
                    <div
                      key={b.person}
                      className="flex items-center gap-1.5 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5"
                    >
                      <div className="w-5 h-5 rounded-full bg-amber-200 flex items-center justify-center text-amber-800 font-bold text-xs flex-shrink-0">
                        {b.person[0].toUpperCase()}
                      </div>
                      <span className="text-xs font-medium text-stone-700">
                        {b.person}
                      </span>
                      <span className="text-xs font-bold text-amber-700">
                        {formatCurrency(b.amount)}
                      </span>
                    </div>
                  ))}
              </div>
              <p className="text-xs text-stone-400 mt-2">
                Click to manage transfers →
              </p>
            </Card>
          )}
      </div>
    );
}