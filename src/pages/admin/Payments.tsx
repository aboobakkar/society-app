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
    getCollectionMonth,
    getMonthOptions,
    formatDate,
} from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useHoldingPersons } from '@/hooks/useData';
import { HoldingPersonPicker } from '@/components/HoldingPersonPicker';
import {
    Plus,
    Trash2,
    Clock,
    AlertCircle,
    CheckCircle2,
    TrendingUp,
    History,
} from 'lucide-react';
import { PaymentLogModal } from './PaymentLogModal';

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
    const [selectedMonth, setSelectedMonth] = useState(getCollectionMonth());
    const { members, updateMember } = useMembers();
    const { payments, loading, addPayment, deletePayment, addPaymentsBulk } =
        usePayments(selectedMonth);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<Payment | null>(null);
    const [holdingPerson, setHoldingPerson] = useState('');
    const holdingPersons = useHoldingPersons();
    const [logPaymentId, setLogPaymentId] = useState<string | null>(null);

    // ── Form state ────────────────────────────────────────────────────────────
    const [form, setForm] = useState({
        member_id: '',
        month: selectedMonth, // used only for non-due / imam_food
        amount: 0,
        method: 'cash',
        payment_type: 'monthly',
        payment_date: new Date().toISOString().slice(0, 10),
        reference_no: '',
        notes: '',
    });

    // Multi-month selection state (for due members)
    const [selectedDueMonths, setSelectedDueMonths] = useState<string[]>([]);
    const [amountManual, setAmountManual] = useState(false); // user manually changed amount

    // Member-payment-history state
    const [memberPaidMonths, setMemberPaidMonths] = useState<string[]>([]);
    const [loadingMemberPayments, setLoadingMemberPayments] = useState(false);
    const [allDuesCleared, setAllDuesCleared] = useState(false);

    // ── Derived ───────────────────────────────────────────────────────────────
    const activeMembers = members.filter((m) => m.status === 'active');
    const monthlyPayments = payments.filter(
        (p) => (p.payment_type ?? 'monthly') === 'monthly',
    );
    const imamFoodPayments = payments.filter(
        (p) => p.payment_type === 'imam_food',
    );
    const paidMemberIds = new Set(monthlyPayments.map((p) => p.member_id));
    const unpaidMembers = activeMembers.filter((m) => !paidMemberIds.has(m.id));
    const totalCollected = monthlyPayments.reduce((s, p) => s + p.amount, 0);
    const imamFoodTotal = imamFoodPayments.reduce((s, p) => s + p.amount, 0);
    const expectedTotal = activeMembers.reduce(
        (s, m) => s + m.monthly_amount,
        0,
    );
    const monthOptions = getMonthOptions(2023);

    const selectedMember = members.find((m) => m.id === form.member_id);
    const hasDues =
        !!selectedMember?.due_from_month &&
        (selectedMember?.opening_balance || 0) > 0;
    const hasAdvance = (selectedMember?.advance_balance || 0) > 0;

    // ── Available unpaid due months ───────────────────────────────────────────
    const unpaidDueMonths = (() => {
        if (!selectedMember?.due_from_month || allDuesCleared) return [];
        const paidSet = new Set(memberPaidMonths);
        const current = getCollectionMonth();
        const opts: string[] = [];
        let cursor = selectedMember.due_from_month;
        while (cursor <= current) {
            if (!paidSet.has(cursor)) opts.push(cursor);
            cursor = nextMonth(cursor);
        }
        return opts;
    })();

    const showDueMonthSelector =
        hasDues &&
        !allDuesCleared &&
        form.payment_type === 'monthly' &&
        !loadingMemberPayments;

    // ── Auto-amount from selected due months ─────────────────────────────────
    const autoAmount =
        selectedDueMonths.length * (selectedMember?.monthly_amount || 0);

    // Payment impact preview (for due member)
    const currentBalance = selectedMember?.opening_balance || 0;
    const currentAdvance = selectedMember?.advance_balance || 0;
    const paidAmount = form.amount || 0;
    const balanceAfter = currentBalance - paidAmount;
    const advanceGained = balanceAfter < 0 ? Math.abs(balanceAfter) : 0;
    const newAdvance = currentAdvance + advanceGained;
    const newBalance = Math.max(0, balanceAfter);
    const willFullyClear = balanceAfter <= 0;

    // ── fetch paid months for a member ───────────────────────────────────────
    const fetchMemberPaidMonths = async (
        memberId: string,
    ): Promise<string[]> => {
        const { data } = await supabase
            .from('payments')
            .select('month')
            .eq('member_id', memberId)
            .eq('payment_type', 'monthly');
        return (data || []).map((p: { month: string }) => p.month);
    };

    // ── compute if all due months are cleared ────────────────────────────────
    const computeCleared = (dueFrom: string, paidMonths: string[]): boolean => {
        const current = getCollectionMonth();
        const paidSet = new Set(paidMonths);
        let cursor = dueFrom;
        while (cursor <= current) {
            if (!paidSet.has(cursor)) return false;
            cursor = nextMonth(cursor);
        }
        return true;
    };

    // ── Reset modal states ────────────────────────────────────────────────────
    const resetDueState = () => {
        setSelectedDueMonths([]);
        setAmountManual(false);
        setMemberPaidMonths([]);
        setAllDuesCleared(false);
    };

    // ── Open modal ────────────────────────────────────────────────────────────
    const openModal = async (memberId = '') => {
        const member = members.find((m) => m.id === memberId);
        resetDueState();

        let defaultAmount = member?.monthly_amount || 500;
        let defaultMonth = selectedMonth;

        if (memberId && member?.due_from_month) {
            setLoadingMemberPayments(true);
            const paid = await fetchMemberPaidMonths(memberId);
            setMemberPaidMonths(paid);
            const cleared = computeCleared(member.due_from_month, paid);
            setAllDuesCleared(cleared);
            if (!cleared) {
                // Pre-select the earliest unpaid due month
                const paidSet = new Set(paid);
                const current = getCollectionMonth();
                let cursor = member.due_from_month;
                while (cursor <= current && paidSet.has(cursor))
                    cursor = nextMonth(cursor);
                setSelectedDueMonths([cursor]);
                defaultAmount = member.monthly_amount;
                defaultMonth = cursor;
            }
            setLoadingMemberPayments(false);
        }

        setForm({
            member_id: memberId,
            month: defaultMonth,
            amount:
                member?.due_from_month && !allDuesCleared
                    ? defaultAmount
                    : member?.monthly_amount || 500,
            method: 'cash',
            payment_type: 'monthly',
            payment_date: new Date().toISOString().slice(0, 10),
            reference_no: '',
            notes: '',
        });
        setShowModal(true);
    };

    // ── Member changed inside modal ───────────────────────────────────────────
    const handleMemberChange = async (memberId: string) => {
        const member = members.find((m) => m.id === memberId);
        resetDueState();

        let defaultAmount = member?.monthly_amount || 500;
        let defaultMonth = selectedMonth;

        if (memberId && member?.due_from_month) {
            setLoadingMemberPayments(true);
            const paid = await fetchMemberPaidMonths(memberId);
            setMemberPaidMonths(paid);
            const cleared = computeCleared(member.due_from_month, paid);
            setAllDuesCleared(cleared);
            if (!cleared) {
                const paidSet = new Set(paid);
                const current = getCollectionMonth();
                let cursor = member.due_from_month;
                while (cursor <= current && paidSet.has(cursor))
                    cursor = nextMonth(cursor);
                setSelectedDueMonths([cursor]);
                defaultAmount = member.monthly_amount;
                defaultMonth = cursor;
            }
            setLoadingMemberPayments(false);
        }

        setForm((prev) => ({
            ...prev,
            member_id: memberId,
            month: defaultMonth,
            amount: defaultAmount,
            payment_type: 'monthly',
        }));
    };

    // ── Toggle a due month checkbox ───────────────────────────────────────────
    const toggleDueMonth = (month: string, checked: boolean) => {
        const newSelected = checked
            ? [...selectedDueMonths, month].sort()
            : selectedDueMonths.filter((m) => m !== month);
        setSelectedDueMonths(newSelected);
        // Auto-update amount if user hasn't manually overridden
        if (!amountManual) {
            setForm((prev) => ({
                ...prev,
                amount:
                    newSelected.length * (selectedMember?.monthly_amount || 0),
            }));
        }
    };

    const selectAllDueMonths = () => {
        setSelectedDueMonths([...unpaidDueMonths]);
        if (!amountManual) {
            setForm((prev) => ({
                ...prev,
                amount:
                    unpaidDueMonths.length *
                    (selectedMember?.monthly_amount || 0),
            }));
        }
    };

    const clearAllDueMonths = () => {
        setSelectedDueMonths([]);
        if (!amountManual) {
            setForm((prev) => ({ ...prev, amount: 0 }));
        }
    };

    // ── Field update ──────────────────────────────────────────────────────────
    const f = (k: string, v: string | number) =>
        setForm((prev) => ({ ...prev, [k]: v }));

    // ── Save ──────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        if (!form.member_id) return;
        setSaving(true);
        try {
            let success = false;

            if (showDueMonthSelector && selectedDueMonths.length > 0) {
                // ── Multi-month due payment ──────────────────────────────────
                const records = selectedDueMonths.map((month) => ({
                    member_id: form.member_id,
                    month,
                    amount: selectedMember!.monthly_amount, // record full rate per month
                    method: form.method,
                    payment_type: 'monthly',
                    payment_date: form.payment_date,
                    reference_no: form.reference_no || undefined,
                    notes: form.notes || undefined,
                    recorded_by: profile?.id,
                }));
                success = await addPaymentsBulk(records);

                if (success && selectedMember) {
                    // Reduce opening_balance by actual cash paid (form.amount)
                    const remaining =
                        (selectedMember.opening_balance || 0) - paidAmount;
                    if (remaining <= 0) {
                        // Dues cleared; any excess → advance
                        const extra = Math.abs(remaining);
                        await updateMember(form.member_id, {
                            opening_balance: 0,
                            due_from_month: null,
                            advance_balance:
                                (selectedMember.advance_balance || 0) + extra,
                        });
                    } else {
                        await updateMember(form.member_id, {
                            opening_balance: remaining,
                        });
                    }
                }
            } else if (
                form.payment_type === 'imam_food' ||
                !showDueMonthSelector
            ) {
                // ── Single month payment (non-due or imam_food) ──────────────

                // Partial payment for a member with NO existing dues:
                // do NOT insert a payment row (it would wrongly mark the
                // month as paid). Convert the shortfall into a due instead,
                // same mechanism as historical arrears.
                if (
                    form.payment_type === 'monthly' &&
                    selectedMember &&
                    !hasDues &&
                    paidAmount > 0 &&
                    paidAmount < (selectedMember.monthly_amount || 0)
                ) {
                    const shortfall =
                        (selectedMember.monthly_amount || 0) - paidAmount;

                    const updated = await updateMember(form.member_id, {
                        due_from_month: form.month,
                        due_from_month_paid_amount: paidAmount,
                        opening_balance: shortfall,
                    });

                    if (updated) {
                        toast.success(
                            `₹${paidAmount} recorded · ₹${shortfall} balance due for ${form.month}`,
                        );
                        success = true;
                    }
                } else {
                    const singleNote = [
                        form.notes,
                        holdingPerson
                            ? `Cash held by: ${holdingPerson}`
                            : null,
                    ]
                        .filter(Boolean)
                        .join(' | ');
                    const result = await addPayment({
                        ...form,
                        notes: singleNote || undefined,
                        recorded_by: profile?.id,
                    });
                    success = !!result;

                    if (
                        success &&
                        result &&
                        form.payment_type === 'monthly' &&
                        selectedMember
                    ) {
                        // Handle advance for non-due members paying more
                        const excess =
                            paidAmount - (selectedMember.monthly_amount || 0);
                        if (excess > 0) {
                            await updateMember(form.member_id, {
                                advance_balance:
                                    (selectedMember.advance_balance || 0) +
                                    excess,
                            });
                        }
                        // Handle partially-cleared dues
                        if (
                            selectedMember.due_from_month &&
                            (selectedMember.opening_balance || 0) > 0
                        ) {
                            const remaining =
                                (selectedMember.opening_balance || 0) -
                                paidAmount;
                            if (remaining <= 0) {
                                await updateMember(form.member_id, {
                                    opening_balance: 0,
                                    due_from_month: null,
                                    advance_balance:
                                        (selectedMember.advance_balance ||
                                            0) + Math.abs(remaining),
                                });
                            } else {
                                await updateMember(form.member_id, {
                                    opening_balance: remaining,
                                });
                            }
                        }
                    }
                }
            }

            if (success) {
                setShowModal(false);
                setHoldingPerson('');
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

    // ── Save button disabled condition ────────────────────────────────────────
    const canSave = (() => {
        if (!form.member_id || loadingMemberPayments || saving) return false;
        if (holdingPersons.length > 0 && !holdingPerson) return false;
        if (showDueMonthSelector)
            return selectedDueMonths.length > 0 && paidAmount > 0;
        return paidAmount > 0;
    })();

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div>
            <PageHeader
                title={i18n.payments}
                subtitle={
                    formatMonth(selectedMonth, lang) +
                    (loading && payments.length === 0
                        ? ' — ' + i18n.loading
                        : '')
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
                    value={
                        imamFoodTotal > 0 ? formatCurrency(imamFoodTotal) : '—'
                    }
                    sub={
                        imamFoodPayments.length > 0
                            ? `${imamFoodPayments.length} payments`
                            : 'None this month'
                    }
                    valueClass='text-purple-700'
                />
            </div>

            {/* Pending members chip list */}
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
                                {m.id} ·{' '}
                                {lang === 'ml' ? m.name_ml || m.name : m.name}
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
                                    'Recorded By',
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
                                const member = members.find(
                                    (m) => m.id === p.member_id,
                                );
                                return member ? (
                                    <tr
                                        key={p.id}
                                        className='hover:bg-stone-50'
                                    >
                                        <td className='px-4 py-3'>
                                            <p className='font-medium text-stone-900'>
                                                {lang === 'ml'
                                                    ? member.name_ml ||
                                                      member.name
                                                    : member.name}
                                                {p.payment_type ===
                                                    'imam_food' && (
                                                    <span className='ml-1 text-xs bg-purple-50 border border-purple-200 text-purple-700 rounded-full px-1.5 py-0.5'>
                                                        Imam
                                                    </span>
                                                )}
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
                                        <td className='px-4 py-3 text-xs text-stone-400'>
                                            {(p as any).recorded_by_profile
                                                ?.full_name ||
                                                (p as any).recorded_by_profile
                                                    ?.email ||
                                                '—'}
                                        </td>
                                        <td className='px-4 py-3'>
                                            <div className='flex gap-1.5'>
                                                <button
                                                    onClick={() =>
                                                        setLogPaymentId(p.id)
                                                    }
                                                    className='p-1.5 rounded hover:bg-amber-50 text-stone-300 hover:text-amber-500 transition-colors'
                                                    title='View history'
                                                >
                                                    <History size={14} />
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        setConfirmDelete(p)
                                                    }
                                                    className='p-1.5 rounded hover:bg-red-50 text-stone-300 hover:text-red-500 transition-colors'
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
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
                onClose={() => {
                    if (!saving) setShowModal(false);
                }}
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
                                    {m.id} –{' '}
                                    {lang === 'ml'
                                        ? m.name_ml || m.name
                                        : m.name}
                                    {m.due_from_month ? ' ⚠' : ''}
                                </option>
                            ))}
                        </optgroup>
                        <optgroup label={i18n.alreadyPaidGroup}>
                            {activeMembers
                                .filter((m) => paidMemberIds.has(m.id))
                                .map((m) => (
                                    <option key={m.id} value={m.id}>
                                        {m.id} –{' '}
                                        {lang === 'ml'
                                            ? m.name_ml || m.name
                                            : m.name}{' '}
                                        ✓
                                    </option>
                                ))}
                        </optgroup>
                    </Select>

                    {/* Payment Type */}
                    <Select
                        label={i18n.paymentType}
                        value={form.payment_type}
                        onChange={(e) => f('payment_type', e.target.value)}
                    >
                        <option value='monthly'>
                            {i18n.paymentTypeMonthly}
                        </option>
                        <option value='imam_food'>
                            {i18n.paymentTypeImamFood}
                        </option>
                    </Select>

                    {/* Advance balance info */}
                    {hasAdvance && form.payment_type === 'monthly' && (
                        <div className='flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2'>
                            <TrendingUp
                                size={14}
                                className='text-green-600 shrink-0'
                            />
                            <p className='text-xs text-green-800'>
                                <span className='font-semibold'>
                                    Advance credit:{' '}
                                    {formatCurrency(currentAdvance)}
                                </span>{' '}
                                — will be applied to next payment
                            </p>
                        </div>
                    )}

                    {/* Loading indicator */}
                    {loadingMemberPayments && (
                        <div className='flex items-center gap-2 text-xs text-stone-500'>
                            <div className='w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin shrink-0' />
                            <span>Checking payment history…</span>
                        </div>
                    )}

                    {/* All dues cleared banner */}
                    {!loadingMemberPayments &&
                        allDuesCleared &&
                        selectedMember?.due_from_month &&
                        form.payment_type === 'monthly' && (
                            <div className='flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2.5'>
                                <CheckCircle2
                                    size={15}
                                    className='text-green-600 shrink-0'
                                />
                                <p className='text-xs text-green-800 font-medium'>
                                    {i18n.allDuesCleared}
                                </p>
                            </div>
                        )}

                    {/* ── Multi-month checkbox selector (due members only) ── */}
                    {showDueMonthSelector && (
                        <div className='space-y-2'>
                            {/* Outstanding dues summary */}
                            <div className='flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5'>
                                <AlertCircle
                                    size={15}
                                    className='text-amber-600 mt-0.5 shrink-0'
                                />
                                <div className='text-xs text-amber-800 flex-1'>
                                    <p className='font-semibold'>
                                        Outstanding dues:{' '}
                                        {formatCurrency(currentBalance)}
                                        {selectedMember?.due_from_month && (
                                            <span className='font-normal'>
                                                {' '}
                                                — since{' '}
                                                {formatMonth(
                                                    selectedMember.due_from_month,
                                                    lang,
                                                )}
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>

                            {/* Month checkboxes */}
                            <div>
                                <div className='flex items-center justify-between mb-1.5'>
                                    <span className='text-xs font-medium text-stone-500'>
                                        Select months to pay (
                                        {unpaidDueMonths.length} unpaid)
                                    </span>
                                    <div className='flex gap-2'>
                                        <button
                                            onClick={selectAllDueMonths}
                                            className='text-xs text-amber-700 hover:underline font-medium'
                                        >
                                            All
                                        </button>
                                        <span className='text-stone-300'>
                                            |
                                        </span>
                                        <button
                                            onClick={clearAllDueMonths}
                                            className='text-xs text-stone-400 hover:underline'
                                        >
                                            Clear
                                        </button>
                                    </div>
                                </div>
                                <div className='max-h-44 overflow-y-auto border border-stone-200 rounded-lg divide-y divide-stone-100'>
                                    {unpaidDueMonths.map((m) => {
                                        const checked =
                                            selectedDueMonths.includes(m);
                                        return (
                                            <label
                                                key={m}
                                                className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${checked ? 'bg-amber-50' : 'hover:bg-stone-50'}`}
                                            >
                                                <input
                                                    type='checkbox'
                                                    checked={checked}
                                                    onChange={(e) =>
                                                        toggleDueMonth(
                                                            m,
                                                            e.target.checked,
                                                        )
                                                    }
                                                    className='accent-amber-700 w-4 h-4 shrink-0'
                                                />
                                                <span className='text-sm text-stone-700 flex-1'>
                                                    {formatMonth(m, lang)}
                                                </span>
                                                <span className='text-xs text-stone-400'>
                                                    {formatCurrency(
                                                        selectedMember?.monthly_amount ||
                                                            0,
                                                    )}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                                {selectedDueMonths.length > 0 && (
                                    <p className='text-xs text-stone-500 mt-1'>
                                        {selectedDueMonths.length} month
                                        {selectedDueMonths.length > 1
                                            ? 's'
                                            : ''}{' '}
                                        ×{' '}
                                        {formatCurrency(
                                            selectedMember?.monthly_amount || 0,
                                        )}{' '}
                                        = {formatCurrency(autoAmount)} (auto)
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Single month selector (non-due member or imam_food) */}
                    {!showDueMonthSelector && (
                        <Select
                            label={`${i18n.month} *`}
                            value={form.month}
                            onChange={(e) => f('month', e.target.value)}
                        >
                            {monthOptions
                                .filter((m) => m <= getCollectionMonth())
                                .slice()
                                .reverse()
                                .map((m) => (
                                    <option key={m} value={m}>
                                        {formatMonth(m, lang)}
                                    </option>
                                ))}
                        </Select>
                    )}

                    {/* Amount + method row */}
                    <div className='grid grid-cols-2 gap-3'>
                        <Input
                            label={`${i18n.amount} (₹) *`}
                            type='number'
                            value={form.amount || ''}
                            onChange={(e) => {
                                setAmountManual(true);
                                f('amount', Number(e.target.value));
                            }}
                            hint={
                                showDueMonthSelector &&
                                selectedDueMonths.length > 0
                                    ? `Auto: ${formatCurrency(autoAmount)}`
                                    : undefined
                            }
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

                    {holdingPersons.length > 0 && (
                        <div>
                            <label className='block text-xs font-medium text-stone-600 mb-2'>
                                Received By{' '}
                                <span className='text-red-500'>*</span>
                            </label>
                            <HoldingPersonPicker
                                persons={holdingPersons}
                                value={holdingPerson}
                                onChange={setHoldingPerson}
                                label=''
                            />
                            {!holdingPerson && (
                                <p className='text-xs text-red-400 mt-1'>
                                    Please select who received this payment
                                </p>
                            )}
                        </div>
                    )}

                    {/* ── Payment impact preview ── */}
                    {form.member_id &&
                        paidAmount > 0 &&
                        form.payment_type === 'monthly' && (
                            <div className='bg-stone-50 border border-stone-200 rounded-lg px-3 py-2.5 space-y-1'>
                                <p className='text-xs font-semibold text-stone-600 mb-1.5'>
                                    After this payment:
                                </p>
                                {hasDues && (
                                    <div className='flex justify-between text-xs'>
                                        <span className='text-stone-500'>
                                            Outstanding dues
                                        </span>
                                        <span
                                            className={`font-semibold ${willFullyClear ? 'text-green-600' : 'text-amber-700'}`}
                                        >
                                            {formatCurrency(currentBalance)} →{' '}
                                            {willFullyClear
                                                ? '✓ Cleared'
                                                : formatCurrency(newBalance)}
                                        </span>
                                    </div>
                                )}
                                {willFullyClear && advanceGained > 0 && (
                                    <div className='flex justify-between text-xs'>
                                        <span className='text-stone-500'>
                                            Advance credit gained
                                        </span>
                                        <span className='font-semibold text-green-600'>
                                            +{formatCurrency(advanceGained)}
                                        </span>
                                    </div>
                                )}
                                {newAdvance > 0 && (
                                    <div className='flex justify-between text-xs'>
                                        <span className='text-stone-500'>
                                            Total advance credit
                                        </span>
                                        <span className='font-semibold text-green-700'>
                                            {formatCurrency(newAdvance)}
                                        </span>
                                    </div>
                                )}
                                {!hasDues &&
                                    paidAmount >
                                        (selectedMember?.monthly_amount ||
                                            0) && (
                                        <div className='flex justify-between text-xs'>
                                            <span className='text-stone-500'>
                                                Advance credit
                                            </span>
                                            <span className='font-semibold text-green-600'>
                                                +
                                                {formatCurrency(
                                                    paidAmount -
                                                        (selectedMember?.monthly_amount ||
                                                            0),
                                                )}
                                            </span>
                                        </div>
                                    )}
                                {paidAmount > 0 &&
                                    paidAmount <
                                        (selectedMember?.monthly_amount || 0) &&
                                    !hasDues && (
                                        <div className='flex justify-between text-xs'>
                                            <span className='text-stone-500'>
                                                Balance to pay for this month
                                            </span>
                                            <span className='font-semibold text-red-600'>
                                                {formatCurrency(
                                                    (selectedMember?.monthly_amount ||
                                                        0) - paidAmount,
                                                )}
                                            </span>
                                        </div>
                                    )}
                            </div>
                        )}

                    <div className='flex gap-2 pt-1'>
                        <Button
                            onClick={handleSave}
                            loading={saving}
                            className='flex-1'
                            disabled={!canSave}
                        >
                            {showDueMonthSelector &&
                            selectedDueMonths.length > 1
                                ? `Save ${selectedDueMonths.length} Payments`
                                : i18n.savePayment}
                        </Button>
                        <Button
                            variant='secondary'
                            onClick={() => {
                                if (!saving) setShowModal(false);
                            }}
                        >
                            {i18n.cancel}
                        </Button>
                    </div>
                </div>
            </Modal>

            <PaymentLogModal
                paymentId={logPaymentId}
                open={!!logPaymentId}
                onClose={() => setLogPaymentId(null)}
            />

            <ConfirmDialog
                open={!!confirmDelete}
                message={i18n.deletePaymentConfirm}
                onConfirm={handleDelete}
                onCancel={() => setConfirmDelete(null)}
            />
        </div>
    );
}