import { useState, useEffect } from 'react';
import { useMembers, useMonthlyReport } from '@/hooks/useData';
import { useLang } from '@/hooks/useLang';
import { supabase } from '@/lib/supabase';
import { Payment } from '@/types';
import { Card, PageHeader, StatCard, Spinner } from '@/components/ui';
import {
    formatCurrency,
    getMonthsInYear,
    isPastOrCurrentMonth,
} from '@/lib/utils';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';

export default function ReportsPage() {
    const { i18n, lang } = useLang();
    const currentYear = new Date().getFullYear().toString();
    const [year, setYear] = useState(currentYear);
    const { members, loading: membersLoading } = useMembers();
    const { data: monthlyData, loading: reportLoading } =
        useMonthlyReport(year);

    // Fetch all year payments directly — avoids usePayments() infinite loading bug
    const [yearPayments, setYearPayments] = useState<Payment[]>([]);
    const [paymentsLoading, setPaymentsLoading] = useState(true);

    useEffect(() => {
        setPaymentsLoading(true);
        supabase
            .from('payments')
            .select('*')
            .gte('month', `${year}-01`)
            .lte('month', `${year}-12`)
            .then(({ data }) => {
                setYearPayments((data || []) as Payment[]);
                setPaymentsLoading(false);
            });
    }, [year]);

    const activeMembers = members.filter((m) => m.status === 'active');
    const yearMonths = getMonthsInYear(year);
    const pastMonths = yearMonths.filter(isPastOrCurrentMonth);

    const totalYearCollected = yearPayments.reduce((s, p) => s + p.amount, 0);
    const totalYearExpenses = monthlyData.reduce((s, m) => s + m.expenses, 0);

    const monthsShort = lang === 'ml' ? i18n.monthsShort : i18n.monthsShort;

    const chartData = monthlyData.map((m, i) => ({
        name: i18n.monthsShort[i],
        [i18n.collected]: m.collected,
        [i18n.expenses]: m.expenses,
    }));

    const memberStatus = activeMembers.map((m) => {
        const paid = pastMonths.filter((month) =>
            yearPayments.some((p) => p.member_id === m.id && p.month === month),
        );
        const pending = pastMonths.filter(
            (month) =>
                !yearPayments.some(
                    (p) => p.member_id === m.id && p.month === month,
                ),
        );
        return {
            ...m,
            paid,
            pending,
            totalPaid: paid.length * m.monthly_amount,
        };
    });

    if (membersLoading || reportLoading || paymentsLoading) return <Spinner />;

    return (
        <div>
            <PageHeader
                title={i18n.reports}
                action={
                    <select
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        className='px-3 py-2 text-sm border border-stone-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500'
                    >
                        {['2023', '2024', '2025', '2026'].map((y) => (
                            <option key={y} value={y}>
                                {y}
                            </option>
                        ))}
                    </select>
                }
            />

            {/* Year summary */}
            <div className='grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6'>
                <StatCard
                    label={i18n.yearCollected}
                    value={formatCurrency(totalYearCollected)}
                    valueClass='text-green-700'
                />
                <StatCard
                    label={i18n.yearExpenses}
                    value={formatCurrency(totalYearExpenses)}
                    valueClass='text-red-700'
                />
                <StatCard
                    label={i18n.netBalance}
                    value={formatCurrency(
                        totalYearCollected - totalYearExpenses,
                    )}
                    valueClass={
                        totalYearCollected - totalYearExpenses >= 0
                            ? 'text-green-700'
                            : 'text-red-700'
                    }
                />
                <StatCard
                    label={i18n.avgMonthlyCollection}
                    value={formatCurrency(
                        Math.round(
                            totalYearCollected / Math.max(pastMonths.length, 1),
                        ),
                    )}
                    valueClass='text-stone-700'
                />
            </div>

            {/* Bar Chart */}
            <Card className='mb-6'>
                <h2 className='text-sm font-semibold text-stone-800 mb-4'>
                    {i18n.monthlyCollectionVsExpenses}
                </h2>
                <ResponsiveContainer width='100%' height={240}>
                    <BarChart
                        data={chartData}
                        margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                    >
                        <CartesianGrid strokeDasharray='3 3' stroke='#f0ede8' />
                        <XAxis
                            dataKey='name'
                            tick={{ fontSize: 11, fill: '#78716c' }}
                        />
                        <YAxis
                            tick={{ fontSize: 11, fill: '#78716c' }}
                            tickFormatter={(v) =>
                                `₹${v >= 1000 ? `${v / 1000}k` : v}`
                            }
                        />
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar
                            dataKey={i18n.collected}
                            fill='#15803d'
                            radius={[3, 3, 0, 0]}
                        />
                        <Bar
                            dataKey={i18n.expenses}
                            fill='#dc2626'
                            radius={[3, 3, 0, 0]}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </Card>

            {/* Monthly Summary Table */}
            <Card className='mb-6' padding={false}>
                <div className='px-5 py-3 border-b border-stone-200'>
                    <h2 className='text-sm font-semibold text-stone-800'>
                        {i18n.monthlySummary} {year}
                    </h2>
                </div>
                <div className='overflow-x-auto'>
                    <table className='w-full text-sm'>
                        <thead>
                            <tr className='bg-stone-50 border-b border-stone-200'>
                                {[
                                    i18n.month,
                                    i18n.collected,
                                    i18n.expenses,
                                    i18n.balance,
                                    i18n.paid,
                                    i18n.pending,
                                ].map((h) => (
                                    <th
                                        key={h}
                                        className='px-4 py-2.5 text-left text-xs font-medium text-stone-500'
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className='divide-y divide-stone-100'>
                            {monthlyData.map((row, i) => {
                                if (
                                    !isPastOrCurrentMonth(yearMonths[i]) &&
                                    row.collected === 0 &&
                                    row.expenses === 0
                                )
                                    return null;
                                const pendingCount =
                                    activeMembers.length - row.paidCount;
                                return (
                                    <tr
                                        key={row.month}
                                        className='hover:bg-stone-50'
                                    >
                                        <td className='px-4 py-2.5 font-medium text-stone-800'>
                                            {i18n.monthsShort[i]} {year}
                                        </td>
                                        <td className='px-4 py-2.5 text-green-700 font-medium'>
                                            {formatCurrency(row.collected)}
                                        </td>
                                        <td className='px-4 py-2.5 text-red-600'>
                                            {formatCurrency(row.expenses)}
                                        </td>
                                        <td
                                            className={`px-4 py-2.5 font-semibold ${row.balance >= 0 ? 'text-green-700' : 'text-red-600'}`}
                                        >
                                            {formatCurrency(row.balance)}
                                        </td>
                                        <td className='px-4 py-2.5 text-green-700'>
                                            {row.paidCount}
                                        </td>
                                        <td className='px-4 py-2.5'>
                                            {pendingCount > 0 ? (
                                                <span className='text-amber-700 font-medium'>
                                                    {pendingCount}
                                                </span>
                                            ) : (
                                                <span className='text-green-700'>
                                                    ✓
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Member payment grid */}
            <Card padding={false}>
                <div className='px-5 py-3 border-b border-stone-200'>
                    <h2 className='text-sm font-semibold text-stone-800'>
                        {i18n.memberWiseStatus} {year}
                    </h2>
                    <p className='text-xs text-stone-400 mt-0.5'>
                        {i18n.paidLegend}
                    </p>
                </div>
                <div className='overflow-x-auto'>
                    <table className='w-full text-xs'>
                        <thead>
                            <tr className='bg-stone-50 border-b border-stone-200'>
                                <th className='px-4 py-2.5 text-left font-medium text-stone-500 sticky left-0 bg-stone-50 min-w-36'>
                                    {i18n.members}
                                </th>
                                {pastMonths.map((m, i) => {
                                    const idx = parseInt(m.split('-')[1]) - 1;
                                    return (
                                        <th
                                            key={m}
                                            className='px-1.5 py-2.5 text-center font-medium text-stone-500 min-w-8'
                                        >
                                            {i18n.monthsShort[idx]}
                                        </th>
                                    );
                                })}
                                <th className='px-4 py-2.5 text-right font-medium text-stone-500'>
                                    {i18n.totalPaid}
                                </th>
                            </tr>
                        </thead>
                        <tbody className='divide-y divide-stone-100'>
                            {memberStatus.map((m) => (
                                <tr key={m.id} className='hover:bg-stone-50'>
                                    <td className='px-4 py-2.5 sticky left-0 bg-white'>
                                        <p className='font-medium text-stone-800'>
                                            {lang === 'ml'
                                                ? m.name_ml || m.name
                                                : m.name}
                                        </p>
                                        <p className='text-stone-400'>{m.id}</p>
                                    </td>
                                    {pastMonths.map((month) => {
                                        const paid = m.paid.includes(month);
                                        return (
                                            <td
                                                key={month}
                                                className='px-1.5 py-2.5 text-center'
                                            >
                                                <span
                                                    className={
                                                        paid
                                                            ? 'text-green-600'
                                                            : 'text-red-400'
                                                    }
                                                >
                                                    {paid ? '✓' : '✗'}
                                                </span>
                                            </td>
                                        );
                                    })}
                                    <td className='px-4 py-2.5 text-right font-semibold text-green-700'>
                                        {formatCurrency(m.totalPaid)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
