import { useMembers, usePayments, useExpenses } from '@/hooks/useData';
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
    const currentMonth = getCurrentMonth();

    const { members, loading: mLoading } = useMembers();
    const { payments, loading: pLoading } = usePayments(currentMonth);
    const { expenses, loading: eLoading } = useExpenses(currentMonth);

    // Never block the full page — render with whatever data is available
    const activeMembers = members.filter((m) => m.status === 'active');
    const totalCollected = payments.reduce((s, p) => s + p.amount, 0);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const balance = totalCollected - totalExpenses;
    const paidMemberIds = new Set(payments.map((p) => p.member_id));
    const unpaidMembers = activeMembers.filter((m) => !paidMemberIds.has(m.id));
    const expectedTotal = activeMembers.reduce(
        (s, m) => s + m.monthly_amount,
        0,
    );
    const collectionRate =
        expectedTotal > 0
            ? Math.round((totalCollected / expectedTotal) * 100)
            : 0;

    const dataLoading = mLoading || pLoading || eLoading;

    return (
        <div>
            <div className='mb-6'>
                <h1 className='text-xl font-semibold text-stone-900'>
                    {i18n.dashboard}
                </h1>
                <p className='text-sm text-stone-500 mt-0.5'>
                    {formatMonth(currentMonth, lang)} — {i18n.overview}
                    {dataLoading && (
                        <span className='ml-2 text-amber-600 text-xs animate-pulse'>
                            ● {i18n.loading}
                        </span>
                    )}
                </p>
            </div>

            {/* Stats — show skeleton values while loading */}
            <div className='grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6'>
                <StatCard
                    label={i18n.collected}
                    value={pLoading ? '...' : formatCurrency(totalCollected)}
                    sub={pLoading ? '' : `${payments.length} ${i18n.payments}`}
                    valueClass='text-green-700'
                />
                <StatCard
                    label={i18n.expenses}
                    value={eLoading ? '...' : formatCurrency(totalExpenses)}
                    sub={i18n.thisMonth}
                    valueClass='text-red-700'
                />
                <StatCard
                    label={i18n.balance}
                    value={dataLoading ? '...' : formatCurrency(balance)}
                    sub={
                        dataLoading
                            ? ''
                            : balance >= 0
                              ? i18n.surplus
                              : i18n.deficit
                    }
                    valueClass={
                        balance >= 0 ? 'text-green-700' : 'text-red-700'
                    }
                />
                <StatCard
                    label={i18n.collectionRate}
                    value={dataLoading ? '...' : `${collectionRate}%`}
                    sub={
                        dataLoading
                            ? ''
                            : `${payments.length}/${activeMembers.length} ${i18n.paid}`
                    }
                    valueClass={
                        collectionRate === 100
                            ? 'text-green-700'
                            : 'text-amber-700'
                    }
                />
            </div>

            {/* Pending alert */}
            {!dataLoading && unpaidMembers.length > 0 && (
                <Card className='mb-6 border-amber-200 bg-amber-50'>
                    <div className='flex items-start gap-3'>
                        <AlertCircle
                            size={18}
                            className='text-amber-600 flex-shrink-0 mt-0.5'
                        />
                        <div>
                            <p className='text-sm font-medium text-amber-800 mb-2'>
                                {unpaidMembers.length} {i18n.membersNotPaid}
                            </p>
                            <div className='flex flex-wrap gap-1.5'>
                                {unpaidMembers.map((m) => (
                                    <span
                                        key={m.id}
                                        className='text-xs bg-white border border-amber-200 text-amber-700 rounded-md px-2 py-0.5'
                                    >
                                        {m.id} ·{' '}
                                        {lang === 'ml'
                                            ? m.name_ml || m.name
                                            : m.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
                {/* Recent Payments */}
                <Card>
                    <div className='flex items-center gap-2 mb-4'>
                        <TrendingUp size={16} className='text-green-600' />
                        <h2 className='text-sm font-semibold text-stone-800'>
                            {i18n.recentPayments}
                        </h2>
                    </div>
                    <div className='divide-y divide-stone-100'>
                        {pLoading || mLoading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <SkeletonRow key={i} />
                            ))
                        ) : payments.length === 0 ? (
                            <p className='text-sm text-stone-400 py-4 text-center'>
                                {i18n.noPaymentsThisMonth}
                            </p>
                        ) : (
                            payments.slice(0, 6).map((p) => {
                                const member = members.find(
                                    (m) => m.id === p.member_id,
                                );
                                return member ? (
                                    <div
                                        key={p.id}
                                        className='flex items-center justify-between py-2.5'
                                    >
                                        <div>
                                            <p className='text-sm font-medium text-stone-800'>
                                                {lang === 'ml'
                                                    ? member.name_ml ||
                                                      member.name
                                                    : member.name}
                                            </p>
                                            <p className='text-xs text-stone-400'>
                                                {formatDate(p.payment_date)} ·{' '}
                                                {p.method}
                                            </p>
                                        </div>
                                        <span className='text-sm font-semibold text-green-700'>
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
                    <div className='flex items-center gap-2 mb-4'>
                        <TrendingDown size={16} className='text-red-500' />
                        <h2 className='text-sm font-semibold text-stone-800'>
                            {i18n.recentExpenses}
                        </h2>
                    </div>
                    <div className='divide-y divide-stone-100'>
                        {eLoading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <SkeletonRow key={i} />
                            ))
                        ) : expenses.length === 0 ? (
                            <p className='text-sm text-stone-400 py-4 text-center'>
                                {i18n.noExpensesThisMonth}
                            </p>
                        ) : (
                            expenses.slice(0, 6).map((e) => (
                                <div
                                    key={e.id}
                                    className='flex items-center justify-between py-2.5'
                                >
                                    <div>
                                        <p className='text-sm font-medium text-stone-800'>
                                            {e.description}
                                        </p>
                                        <div className='flex items-center gap-2 mt-0.5'>
                                            <Badge
                                                text={e.category}
                                                variant={
                                                    e.category === 'salary'
                                                        ? 'info'
                                                        : e.category ===
                                                            'utility'
                                                          ? 'warning'
                                                          : 'neutral'
                                                }
                                            />
                                            <span className='text-xs text-stone-400'>
                                                {formatDate(e.expense_date)}
                                            </span>
                                        </div>
                                    </div>
                                    <span className='text-sm font-semibold text-red-600'>
                                        {formatCurrency(e.amount)}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </Card>
            </div>

            {/* Members overview */}
            <Card className='mt-4'>
                <div className='flex items-center gap-2 mb-3'>
                    <Users size={16} className='text-stone-500' />
                    <h2 className='text-sm font-semibold text-stone-800'>
                        {i18n.membersOverview}
                    </h2>
                </div>
                {mLoading ? (
                    <div className='h-4 w-48 bg-stone-200 rounded animate-pulse' />
                ) : (
                    <>
                        <div className='flex gap-4 text-sm flex-wrap'>
                            <div>
                                <span className='text-stone-500'>
                                    {i18n.total}:{' '}
                                </span>
                                <span className='font-medium'>
                                    {members.length}
                                </span>
                            </div>
                            <div>
                                <span className='text-stone-500'>
                                    {i18n.active}:{' '}
                                </span>
                                <span className='font-medium text-green-700'>
                                    {activeMembers.length}
                                </span>
                            </div>
                            <div>
                                <span className='text-stone-500'>
                                    {i18n.inactive}:{' '}
                                </span>
                                <span className='font-medium text-stone-400'>
                                    {members.length - activeMembers.length}
                                </span>
                            </div>
                            <div>
                                <span className='text-stone-500'>
                                    {i18n.paid}:{' '}
                                </span>
                                <span className='font-medium text-green-700'>
                                    {payments.length}
                                </span>
                            </div>
                            <div>
                                <span className='text-stone-500'>
                                    {i18n.pending}:{' '}
                                </span>
                                <span className='font-medium text-amber-700'>
                                    {unpaidMembers.length}
                                </span>
                            </div>
                        </div>
                        <div className='mt-3 h-2 bg-stone-100 rounded-full overflow-hidden'>
                            <div
                                className='h-full bg-green-500 rounded-full transition-all duration-700'
                                style={{ width: `${collectionRate}%` }}
                            />
                        </div>
                        <p className='text-xs text-stone-400 mt-1'>
                            {collectionRate}% {i18n.collectionRate}
                        </p>
                    </>
                )}
            </Card>
        </div>
    );
}
