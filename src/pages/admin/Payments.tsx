import { useState } from 'react';
import { useMembers, usePayments } from '@/hooks/useData';
import { useLang } from '@/hooks/useLang';
import { useAuth } from '@/hooks/useAuth';
import { Payment } from '@/types';
import {
    Button,
    Input,
    Select,
    Modal,
    Badge,
    PageHeader,
    Card,
    StatCard,
    EmptyState,
    ConfirmDialog,
} from '@/components/ui';
import {
    formatCurrency,
    formatMonth,
    getCurrentMonth,
    getMonthOptions,
    formatDate,
} from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';

// ── helpers ──────────────────────────────────────────────────────────────────

function nextMonth(ym: string): string {
    const [y, m] = ym.split('-').map(Number);
    if (m === 12) return `${y + 1}-01`;
    return `${y}-${String(m + 1).padStart(2, '0')}`;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function PaymentsPage() {
    const { i18n, lang } = useLang();
    const { profile } = useAuth();
    const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
    const { members, updateMember } = useMembers();
    const { payments, loading, addPayment, deletePayment } =
        usePayments(selectedMonth);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<Payment | null>(null);

    const [form, setForm] = useState({
        member_id: '',
        month: selectedMonth,
        amount: 500,
        method: 'cash',
        payment_type: 'monthly',
        payment_date: new Date().toISOString().slice(0, 10),
        reference_no: '',
        notes: '',
    });

    // per-member due resolution state
    const [memberPaidMonths, setMemberPaidMonths] = useState<string[]>([]);
    const [loadingMemberPayments, setLoadingMemberPayments] = useState(false);
    const [targetMonth, setTargetMonth] = useState<string | null>(null);
    const [allDuesCleared, setAllDuesCleared] = useState(false);

    // ─── derived ────────────────────────────────────────────────────────────
    const activeMembers = members.filter((m) => m.status === 'active');
    // For the selected month tab, only count monthly payments
    const monthlyPayments = payments.filter((p) => (p.payment_type ?? 'monthly') === 'monthly');
    const imamFoodPayments = payments.filter((p) => p.payment_type === 'imam_food');
    const paidMemberIds = new Set(monthlyPayments.map((p) => p.member_id));
    const unpaidMembers = activeMembers.filter((m) => !paidMemberIds.has(m.id));
    const totalCollected = monthlyPayments.reduce((s, p) => s + p.amount, 0);
    const imamFoodTotal = imamFoodPayments.reduce((s, p) => s + p.amount, 0);
    const expectedTotal = activeMembers.reduce((s, m) => s + m.monthly_amount, 0);
    const monthOptions = getMonthOptions(2023);

    // ─── fetch all paid months for a member ─────────────────────────────────
    const fetchMemberPaidMonths = async (memberId: string): Promise<string[]> => {
        const { data, error } = await supabase
            .from('payments')
            .select('month')
            .eq('member_id', memberId)
            .eq('payment_type', 'monthly');
        if (error) return [];
        return (data || []).map((p: { month: string }) => p.month);
    };

    // ─── compute earliest unpaid due month ──────────────────────────────────
    const computeTargetMonth = (
        dueFromMonth: string,
        paidMonths: string[],
    ): { target: string; cleared: boolean } => {
        const current = getCurrentMonth();
        const paidSet = new Set(paidMonths);
        let cursor = dueFromMonth;
        while (cursor <= current) {
            if (!paidSet.has(cursor)) return { target: cursor, cleared: false };
            cursor = nextMonth(cursor);
        }
        return { target: current, cleared: true };
    };

    // ─── open modal ─────────────────────────────────────────────────────────
    const openModal = async (memberId = '') => {
        const member = members.find((m) => m.id === memberId);
        setMemberPaidMonths([]);
        setTargetMonth(null);
        setAllDuesCleared(false);

        let resolvedMonth = selectedMonth;

        if (memberId && member?.due_from_month) {
            setLoadingMemberPayments(true);
            const paid = await fetchMemberPaidMonths(memberId);
            setMemberPaidMonths(paid);
            const { target, cleared } = computeTargetMonth(member.due_from_month, paid);
            setTargetMonth(target);
            setAllDuesCleared(cleared);
            resolvedMonth = target;
            setLoadingMemberPayments(false);
        }

        setForm({
            member_id: memberId,
            month: resolvedMonth,
            amount: member?.monthly_amount || 500,
            method: 'cash',
            payment_type: 'monthly',
            payment_date: new Date().toISOString().slice(0, 10),
            reference_no: '',
            notes: '',
        });
        setShowModal(true);
    };

    // ─── member changed inside modal ────────────────────────────────────────
    const handleMemberChange = async (memberId: string) => {
        const member = members.find((m) => m.id === memberId);
        setMemberPaidMonths([]);
        setTargetMonth(null);
        setAllDuesCleared(false);

        let resolvedMonth = selectedMonth;

        if (memberId && member?.due_from_month) {
            setLoadingMemberPayments(true);
            const paid = await fetchMemberPaidMonths(memberId);
            setMemberPaidMonths(paid);
            const { target, cleared } = computeTargetMonth(member.due_from_month, paid);
            setTargetMonth(target);
            setAllDuesCleared(cleared);
            resolvedMonth = target;
            setLoadingMemberPayments(false);
        }

        setForm((prev) => ({
            ...prev,
            member_id: memberId,
            month: resolvedMonth,
            amount: member?.monthly_amount || prev.amount,
        }));
    };

    // ─── field update ────────────────────────────────────────────────────────
    const f = (k: string, v: string | number) =>
        setForm((prev) => ({ ...prev, [k]: v }));

    // ─── save payment + sync member dues ────────────────────────────────────
    const handleSave = async () => {
        if (!form.member_id) return;
        setSaving(true);
        try {
            const result = await addPayment({
                ...form,
                payment_type: form.payment_type,
                recorded_by: profile?.id,
            });

            if (result) {
                // ── Bug 1 Fix: sync member dues after a monthly payment ──
                if (form.payment_type === 'monthly') {
                    const member = members.find((m) => m.id === form.member_id);
                    if (member?.due_from_month) {
                        // Re-fetch all paid months (including the one just saved)
                        const allPaid = await fetchMemberPaidMonths(form.member_id);
                        const { cleared } = computeTargetMonth(member.due_from_month, allPaid);
                        if (cleared) {
                            // All due months are now paid — zero out the member's dues
                            await updateMember(form.member_id, {
                                opening_balance: 0,
                                due_from_month: null,
                            });
                        }
                    }
                }
                setShowModal(false);
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;
        await deletePayment(confirmDelete.id);
        setConfirmDelete(null);
    };

    // ─── derived: dues state for selected member ─────────────────────────────
    const selectedMember = members.find((m) => m.id === form.member_id);
    const hasDues = !!(selectedMember?.due_from_month);
    const isDueMonth = hasDues && targetMonth !== null && !allDuesCleared && form.payment_type === 'monthly';

    // Available month options for the month picker
    const availableMonthOptions = (() => {
        // Imam food: allow any month up to current
        if (form.payment_type === 'imam_food') {
            return monthOptions.filter((m) => m <= getCurrentMonth());
        }
        if (!selectedMember?.due_from_month || allDuesCleared) {
            return monthOptions.filter((m) => m <= getCurrentMonth());
        }
        // Due member: only unpaid months from due_from_month to current
        const paidSet = new Set(memberPaidMonths);
        const current = getCurrentMonth();
        const opts: string[] = [];
        let cursor = selectedMember.due_from_month;
        while (cursor <= current) {
            if (!paidSet.has(cursor)) opts.push(cursor);
            cursor = nextMonth(cursor);
        }
        return opts;
    })();

    const imamFoodBadge = (p: Payment) =>
        p.payment_type === 'imam_food' ? (
            <span className='ml-1 text-xs bg-purple-50 border border-purple-200 text-purple-700 rounded-full px-1.5 py-0.5'>
                Imam
            </span>
        ) : null;

    // ─── render ──────────────────────────────────────────────────────────────
    return (
        <div>
            <PageHeader
                title={i18n.payments}
                subtitle={
                    formatMonth(selectedMonth, lang) +
                    (loading && payments.length === 0 ? ' — ' + i18n.loading : '')
                }
                action={
                    <div className='flex gap-2'>
                        <Select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className='w-36'
                        >
                            {monthOptions
                                .slice()
                                .reverse()
                                .map((m) => (
                                    <option key={m} value={m}>
                                        {m}
                                    </option>
                                ))}
                        </Select>
                        <Button onClick={() => openModal()}>
                            <Plus size={15} className='mr-1.5' />
                            {i18n.record}
                        </Button>
                    </div>
                }
            />

            {/* Stats */}
            <div className='grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5'>
                <StatCard
                    label={i18n.collected}
                    value={formatCurrency(totalCollected)}
                    sub={`of ${formatCurrency(expectedTotal)}`}
                    valueClass='text-green-700'
                />
                <StatCard
                    label={i18n.paid}
                    value={monthlyPayments.length}
                    sub={`of ${activeMembers.length} ${i18n.members}`}
                    valueClass='text-green-700'
                />
                <StatCard
                    label={i18n.pending}
                    value={unpaidMembers.length}
                    sub={i18n.members}
                    valueClass='text-amber-700'
                />
                <StatCard
                    label={i18n.imamFoodAllowance}
                    value={imamFoodTotal > 0 ? formatCurrency(imamFoodTotal) : '—'}
                    sub={imamFoodPayments.length > 0 ? `${imamFoodPayments.length} payments` : 'None this month'}
                    valueClass='text-purple-700'
                />
            </div>

            {/* Pending members */}
            {unpaidMembers.length > 0 && (
                <Card className='mb-5 border-amber-100'>
                    <p className='text-xs font-medium text-amber-700 mb-2 flex items-center gap-1.5'>
                        <Clock size={13} />
                        {i18n.pendingThisMonth}
                    </p>
                    <div className='flex flex-wrap gap-1.5'>
                        {unpaidMembers.map((m) => (
                            <button
                                key={m.id}
                                onClick={() => openModal(m.id)}
                                className='text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded-md px-2 py-1 hover:bg-amber-100 transition-colors'
                            >
                                {m.id} · {lang === 'ml' ? m.name_ml || m.name : m.name}
                                {m.due_from_month && (
                                    <span className='ml-1 text-red-500'>⚠</span>
                                )}
                            </button>
                        ))}
                    </div>
                </Card>
            )}

            {/* Payments table */}
            <Card padding={false}>
                <div className='overflow-x-auto'>
                    <table className='w-full text-sm'>
                        <thead>
                            <tr className='bg-stone-50 border-b border-stone-200'>
                                {[
                                    i18n.members,
                                    i18n.month,
                                    i18n.amount,
                                    i18n.paymentMethod,
                                    i18n.date,
                                    i18n.reference,
                                    '',
                                ].map((h, i) => (
                                    <th
                                        key={i}
                                        className='px-4 py-3 text-left text-xs font-medium text-stone-500'
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className='divide-y divide-stone-100'>
                            {payments.map((p) => {
                                const member = members.find((m) => m.id === p.member_id);
                                return member ? (
                                    <tr key={p.id} className='hover:bg-stone-50'>
                                        <td className='px-4 py-3'>
                                            <p className='font-medium text-stone-900'>
                                                {lang === 'ml'
                                                    ? member.name_ml || member.name
                                                    : member.name}
                                                {imamFoodBadge(p)}
                                            </p>
                                            <p className='text-xs text-stone-400'>
                                                {member.id}
                                            </p>
                                        </td>
                                        <td className='px-4 py-3 text-stone-600 text-xs font-mono'>
                                            {formatMonth(p.month, lang)}
                                        </td>
                                        <td className='px-4 py-3 font-semibold text-green-700'>
                                            {formatCurrency(p.amount)}
                                        </td>
                                        <td className='px-4 py-3'>
                                            <Badge
                                                text={
                                                    p.method === 'cash'
                                                        ? i18n.cash
                                                        : p.method === 'online'
                                                          ? i18n.online
                                                          : i18n.bank
                                                }
                                                variant={
                                                    p.method as
                                                        | 'cash'
                                                        | 'online'
                                                        | 'bank'
                                                }
                                            />
                                        </td>
                                        <td className='px-4 py-3 text-stone-500 text-xs'>
                                            {formatDate(p.payment_date)}
                                        </td>
                                        <td className='px-4 py-3 text-stone-400 text-xs'>
                                            {p.reference_no || '—'}
                                        </td>
                                        <td className='px-4 py-3'>
                                            <button
                                                onClick={() => setConfirmDelete(p)}
                                                className='p-1.5 rounded hover:bg-red-50 text-stone-300 hover:text-red-500 transition-colors'
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ) : null;
                            })}
                        </tbody>
                    </table>
                    {payments.length === 0 && (
                        <EmptyState message={i18n.noPaymentsMonth} />
                    )}
                </div>
            </Card>

            {/* ── Record Payment Modal ── */}
            <Modal
                open={showModal}
                onClose={() => { if (!saving) setShowModal(false); }}
                title={i18n.recordPayment}
            >
                <div className='space-y-4'>
                    {/* Member selector */}
                    <Select
                        label={`${i18n.members} *`}
                        value={form.member_id}
                        onChange={(e) => handleMemberChange(e.target.value)}
                    >
                        <option value=''>{i18n.selectMember}</option>
                        <optgroup label={i18n.pendingGroup}>
                            {unpaidMembers.map((m) => (
                                <option key={m.id} value={m.id}>
                                    {m.id} – {lang === 'ml' ? m.name_ml || m.name : m.name}
                                    {m.due_from_month ? ' ⚠' : ''}
                                </option>
                            ))}
                        </optgroup>
                        <optgroup label={i18n.alreadyPaidGroup}>
                            {activeMembers
                                .filter((m) => paidMemberIds.has(m.id))
                                .map((m) => (
                                    <option key={m.id} value={m.id}>
                                        {m.id} – {lang === 'ml' ? m.name_ml || m.name : m.name} ✓
                                    </option>
                                ))}
                        </optgroup>
                    </Select>

                    {/* Payment Type selector */}
                    <Select
                        label={i18n.paymentType}
                        value={form.payment_type}
                        onChange={(e) => {
                            f('payment_type', e.target.value);
                            // Reset month lock when switching to imam_food
                            if (e.target.value === 'imam_food') {
                                setTargetMonth(null);
                            } else if (selectedMember?.due_from_month) {
                                // Re-apply due month lock when back to monthly
                                const { target } = computeTargetMonth(
                                    selectedMember.due_from_month,
                                    memberPaidMonths,
                                );
                                setTargetMonth(target);
                                f('month', target);
                            }
                        }}
                    >
                        <option value='monthly'>{i18n.paymentTypeMonthly}</option>
                        <option value='imam_food'>{i18n.paymentTypeImamFood}</option>
                    </Select>

                    {/* Loading indicator */}
                    {loadingMemberPayments && (
                        <div className='flex items-center gap-2 text-xs text-stone-500 py-1'>
                            <div className='w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin shrink-0' />
                            <span>Checking payment history…</span>
                        </div>
                    )}

                    {/* Due month banner (only for monthly payments) */}
                    {!loadingMemberPayments && isDueMonth && targetMonth && (
                        <div className='flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5'>
                            <AlertCircle size={15} className='text-amber-600 mt-0.5 shrink-0' />
                            <div className='text-xs text-amber-800'>
                                <p className='font-semibold mb-0.5'>{i18n.dueAutoSelected}</p>
                                <p>
                                    Paying for{' '}
                                    <span className='font-bold'>{formatMonth(targetMonth, lang)}</span>
                                    {selectedMember?.due_from_month && (
                                        <> — due since <span className='font-bold'>{formatMonth(selectedMember.due_from_month, lang)}</span></>
                                    )}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* All dues cleared banner */}
                    {!loadingMemberPayments && allDuesCleared && hasDues && form.payment_type === 'monthly' && (
                        <div className='flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2.5'>
                            <CheckCircle2 size={15} className='text-green-600 shrink-0' />
                            <p className='text-xs text-green-800 font-medium'>{i18n.allDuesCleared}</p>
                        </div>
                    )}

                    {/* Month picker — locked for due members on monthly type */}
                    <Select
                        label={`${i18n.month} *`}
                        value={form.month}
                        onChange={(e) => f('month', e.target.value)}
                        disabled={isDueMonth}
                    >
                        {availableMonthOptions.length === 0 ? (
                            <option value={form.month}>{formatMonth(form.month, lang)}</option>
                        ) : (
                            availableMonthOptions.map((m) => (
                                <option key={m} value={m}>
                                    {formatMonth(m, lang)}
                                </option>
                            ))
                        )}
                    </Select>
                    {isDueMonth && (
                        <p className='text-xs text-stone-400 -mt-2'>
                            Month locked to earliest unpaid due month. Dues must be cleared in order.
                        </p>
                    )}

                    <div className='grid grid-cols-2 gap-3'>
                        <Input
                            label={`${i18n.amount} (₹) *`}
                            type='number'
                            value={form.amount}
                            onChange={(e) => f('amount', Number(e.target.value))}
                        />
                        <Select
                            label={i18n.paymentMethod}
                            value={form.method}
                            onChange={(e) => f('method', e.target.value)}
                        >
                            <option value='cash'>{i18n.cash}</option>
                            <option value='online'>{i18n.online}</option>
                            <option value='bank'>{i18n.bank}</option>
                        </Select>
                        <Input
                            label={i18n.paymentDate}
                            type='date'
                            value={form.payment_date}
                            onChange={(e) => f('payment_date', e.target.value)}
                        />
                        <Input
                            label={i18n.referenceNo}
                            placeholder={i18n.referenceNoHint}
                            value={form.reference_no}
                            onChange={(e) => f('reference_no', e.target.value)}
                        />
                    </div>
                    <Input
                        label={i18n.notes}
                        value={form.notes}
                        onChange={(e) => f('notes', e.target.value)}
                    />
                    <div className='flex gap-2 pt-1'>
                        <Button
                            onClick={handleSave}
                            loading={saving}
                            className='flex-1'
                            disabled={!form.member_id || loadingMemberPayments}
                        >
                            {i18n.savePayment}
                        </Button>
                        <Button
                            variant='secondary'
                            onClick={() => { if (!saving) setShowModal(false); }}
                        >
                            {i18n.cancel}
                        </Button>
                    </div>
                </div>
            </Modal>

            <ConfirmDialog
                open={!!confirmDelete}
                message={i18n.deletePaymentConfirm}
                onConfirm={handleDelete}
                onCancel={() => setConfirmDelete(null)}
            />
        </div>
    );
}
