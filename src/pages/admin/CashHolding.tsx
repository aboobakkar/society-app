import { useState } from 'react';
import {
    useHoldingSummary,
    recordTransfer,
    HoldingBalance,
} from '@/hooks/useHolding';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useData';
import {
    PageHeader,
    Card,
    StatCard,
    Modal,
    Input,
    Button,
    EmptyState,
} from '@/components/ui';
import {
    formatCurrency,
    getCurrentMonth,
    getMonthOptions,
    formatDate,
} from '@/lib/utils';
import { ArrowRight, Banknote, RefreshCw, History } from 'lucide-react';

export default function CashHoldingPage() {
    const { profile } = useAuth();
    const { settings } = useSettings();
    const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
    const { balances, transfers, totalHeld, loading, refetch } =
        useHoldingSummary(selectedMonth);
    const monthOptions = getMonthOptions(2023);

    // Transfer modal state
    const [showTransfer, setShowTransfer] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        from: '',
        to: '',
        amount: '',
        notes: '',
    });

    // Pre-fill from when clicking a person card
    const openTransfer = (fromPerson?: string) => {
        setForm({ from: fromPerson || '', to: '', amount: '', notes: '' });
        setShowTransfer(true);
    };

    const handleTransfer = async () => {
        if (!form.from || !form.to || !form.amount) return;
        if (form.from === form.to) {
            return;
        }
        setSaving(true);
        const ok = await recordTransfer({
            fromPerson: form.from,
            toPerson: form.to,
            amount: parseFloat(form.amount),
            notes: form.notes || undefined,
            recordedBy: profile!.id,
        });
        setSaving(false);
        if (ok) {
            setShowTransfer(false);
            refetch();
        }
    };

    const holdingPersons: string[] =
        (settings?.holding_persons as string[]) || [];

    // All persons = holding persons from settings + any that appear in data
    const allPersons = Array.from(
        new Set([...holdingPersons, ...balances.map((b) => b.person)]),
    );

    const getBalance = (person: string): HoldingBalance =>
        balances.find((b) => b.person === person) || {
            person,
            amount: 0,
            collected: 0,
            transferredOut: 0,
            transferredIn: 0,
        };

    return (
        <div>
            <PageHeader
                title='Cash Holdings'
                subtitle='Track who holds how much cash and transfer between persons'
                action={
                    <div className='flex gap-2'>
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className='px-3 py-2 text-sm border border-stone-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500'
                        >
                            {monthOptions
                                .slice()
                                .reverse()
                                .map((m) => (
                                    <option key={m} value={m}>
                                        {m}
                                    </option>
                                ))}
                        </select>
                        <Button onClick={() => openTransfer()}>
                            <ArrowRight size={15} className='mr-1.5' /> Transfer
                        </Button>
                        <button
                            onClick={refetch}
                            className='p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors'
                        >
                            <RefreshCw size={15} />
                        </button>
                    </div>
                }
            />

            {/* Total held */}
            <div className='grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6'>
                <StatCard
                    label='Total Cash Held'
                    value={loading ? '...' : formatCurrency(totalHeld)}
                    sub='across all persons'
                    valueClass='text-amber-700'
                />
                <StatCard
                    label='Persons Holding'
                    value={
                        loading
                            ? '...'
                            : balances.filter((b) => b.amount > 0).length
                    }
                    sub='with positive balance'
                    valueClass='text-stone-700'
                />
                <StatCard
                    label='Transfers This Month'
                    value={loading ? '...' : transfers.length}
                    valueClass='text-stone-700'
                />
            </div>

            {/* Person cards */}
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6'>
                {allPersons.length === 0 && !loading ? (
                    <div className='col-span-3'>
                        <Card>
                            <EmptyState message='No holding persons configured. Add them in Settings → Agents.' />
                        </Card>
                    </div>
                ) : (
                    allPersons.map((person) => {
                        const b = getBalance(person);
                        return (
                            <div
                                key={person}
                                className='bg-white border border-stone-200 rounded-2xl p-4'
                            >
                                {/* Person header */}
                                <div className='flex items-center gap-3 mb-3'>
                                    <div className='w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-base flex-shrink-0'>
                                        {person[0].toUpperCase()}
                                    </div>
                                    <div className='flex-1 min-w-0'>
                                        <p className='font-semibold text-stone-900 truncate'>
                                            {person}
                                        </p>
                                        <p
                                            className={`text-xs font-medium ${b.amount > 0 ? 'text-amber-700' : 'text-stone-400'}`}
                                        >
                                            {b.amount > 0
                                                ? `Holding ${formatCurrency(b.amount)}`
                                                : 'Nothing held'}
                                        </p>
                                    </div>
                                </div>

                                {/* Breakdown */}
                                <div className='space-y-1.5 mb-3'>
                                    <div className='flex justify-between text-xs'>
                                        <span className='text-stone-400'>
                                            Collected
                                        </span>
                                        <span className='font-medium text-green-700'>
                                            {formatCurrency(b.collected)}
                                        </span>
                                    </div>
                                    {b.transferredOut > 0 && (
                                        <div className='flex justify-between text-xs'>
                                            <span className='text-stone-400'>
                                                Transferred out
                                            </span>
                                            <span className='font-medium text-red-600'>
                                                −{' '}
                                                {formatCurrency(
                                                    b.transferredOut,
                                                )}
                                            </span>
                                        </div>
                                    )}
                                    {b.transferredIn > 0 && (
                                        <div className='flex justify-between text-xs'>
                                            <span className='text-stone-400'>
                                                Received
                                            </span>
                                            <span className='font-medium text-blue-600'>
                                                +{' '}
                                                {formatCurrency(
                                                    b.transferredIn,
                                                )}
                                            </span>
                                        </div>
                                    )}
                                    <div className='border-t border-stone-100 pt-1.5 flex justify-between text-xs'>
                                        <span className='font-semibold text-stone-600'>
                                            Net holding
                                        </span>
                                        <span
                                            className={`font-bold ${b.amount > 0 ? 'text-amber-700' : 'text-stone-400'}`}
                                        >
                                            {formatCurrency(b.amount)}
                                        </span>
                                    </div>
                                </div>

                                {/* Transfer button */}
                                {b.amount > 0 && (
                                    <button
                                        onClick={() => openTransfer(person)}
                                        className='w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors'
                                    >
                                        <ArrowRight size={13} /> Transfer cash
                                    </button>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Transfer history */}
            {transfers.length > 0 && (
                <Card padding={false}>
                    <div className='px-5 py-3 border-b border-stone-200 flex items-center gap-2'>
                        <History size={15} className='text-stone-400' />
                        <h2 className='text-sm font-semibold text-stone-800'>
                            Transfer History
                        </h2>
                    </div>
                    <div className='divide-y divide-stone-100'>
                        {transfers.map((t) => (
                            <div
                                key={t.id}
                                className='flex items-center gap-3 px-5 py-3'
                            >
                                <div className='flex-1'>
                                    <div className='flex items-center gap-2 text-sm'>
                                        <span className='font-medium text-stone-800'>
                                            {t.from_person}
                                        </span>
                                        <ArrowRight
                                            size={13}
                                            className='text-stone-400'
                                        />
                                        <span className='font-medium text-stone-800'>
                                            {t.to_person}
                                        </span>
                                    </div>
                                    <p className='text-xs text-stone-400 mt-0.5'>
                                        {formatDate(t.transfer_date)}
                                        {t.notes && ` · ${t.notes}`}
                                    </p>
                                </div>
                                <span className='font-semibold text-amber-700'>
                                    {formatCurrency(t.amount)}
                                </span>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Transfer Modal */}
            <Modal
                open={showTransfer}
                onClose={() => {
                    if (!saving) setShowTransfer(false);
                }}
                title='Record Cash Transfer'
            >
                <div className='space-y-4'>
                    <div className='flex items-center gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl'>
                        <Banknote
                            size={16}
                            className='text-amber-600 flex-shrink-0'
                        />
                        <p className='text-xs text-amber-800'>
                            Record when cash moves from one person to another.
                            This updates net holdings.
                        </p>
                    </div>

                    {/* From */}
                    <div>
                        <label className='block text-xs font-medium text-stone-500 mb-2'>
                            From *
                        </label>
                        <div className='grid grid-cols-2 gap-2'>
                            {allPersons.map((p) => {
                                const b = getBalance(p);
                                return (
                                    <button
                                        key={p}
                                        onClick={() =>
                                            setForm((f) => ({ ...f, from: p }))
                                        }
                                        className={`text-left px-3 py-2.5 rounded-xl border text-sm transition-all
                      ${
                          form.from === p
                              ? 'bg-amber-50 border-amber-400 text-amber-800 font-semibold'
                              : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                      }`}
                                    >
                                        <p className='font-medium truncate'>
                                            {p}
                                        </p>
                                        <p
                                            className={`text-xs mt-0.5 ${b.amount > 0 ? 'text-amber-600' : 'text-stone-400'}`}
                                        >
                                            {formatCurrency(b.amount)} held
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Arrow */}
                    <div className='flex items-center justify-center'>
                        <div className='flex items-center gap-2 text-xs text-stone-400'>
                            <div className='h-px w-16 bg-stone-200' />
                            <ArrowRight size={16} className='text-amber-500' />
                            <div className='h-px w-16 bg-stone-200' />
                        </div>
                    </div>

                    {/* To */}
                    <div>
                        <label className='block text-xs font-medium text-stone-500 mb-2'>
                            To *
                        </label>
                        <div className='grid grid-cols-2 gap-2'>
                            {allPersons
                                .filter((p) => p !== form.from)
                                .map((p) => (
                                    <button
                                        key={p}
                                        onClick={() =>
                                            setForm((f) => ({ ...f, to: p }))
                                        }
                                        className={`text-left px-3 py-2.5 rounded-xl border text-sm transition-all
                    ${
                        form.to === p
                            ? 'bg-blue-50 border-blue-400 text-blue-800 font-semibold'
                            : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                    }`}
                                    >
                                        <p className='font-medium truncate'>
                                            {p}
                                        </p>
                                    </button>
                                ))}
                            {/* Custom person not in list */}
                            <input
                                type='text'
                                placeholder='Other person...'
                                value={
                                    allPersons.includes(form.to) ? '' : form.to
                                }
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        to: e.target.value,
                                    }))
                                }
                                className='px-3 py-2.5 rounded-xl border border-dashed border-stone-300 text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-blue-400 text-stone-600 placeholder:text-stone-300'
                            />
                        </div>
                    </div>

                    {/* Amount */}
                    <Input
                        label='Amount (₹) *'
                        type='number'
                        value={form.amount}
                        onChange={(e) =>
                            setForm((f) => ({ ...f, amount: e.target.value }))
                        }
                        placeholder='0'
                        hint={
                            form.from
                                ? `Available: ${formatCurrency(getBalance(form.from).amount)}`
                                : undefined
                        }
                    />

                    {/* Notes */}
                    <Input
                        label='Notes (optional)'
                        value={form.notes}
                        onChange={(e) =>
                            setForm((f) => ({ ...f, notes: e.target.value }))
                        }
                        placeholder='Reason for transfer...'
                    />

                    {/* Summary */}
                    {form.from && form.to && form.amount && (
                        <div className='bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-xs space-y-1'>
                            <div className='flex justify-between'>
                                <span className='text-stone-500'>
                                    {form.from} after transfer
                                </span>
                                <span className='font-semibold text-red-600'>
                                    {formatCurrency(
                                        Math.max(
                                            0,
                                            getBalance(form.from).amount -
                                                parseFloat(form.amount || '0'),
                                        ),
                                    )}
                                </span>
                            </div>
                            <div className='flex justify-between'>
                                <span className='text-stone-500'>
                                    {form.to} after transfer
                                </span>
                                <span className='font-semibold text-green-600'>
                                    {formatCurrency(
                                        getBalance(form.to).amount +
                                            parseFloat(form.amount || '0'),
                                    )}
                                </span>
                            </div>
                        </div>
                    )}

                    <div className='flex gap-2 pt-1'>
                        <Button
                            onClick={handleTransfer}
                            loading={saving}
                            disabled={
                                !form.from ||
                                !form.to ||
                                !form.amount ||
                                form.from === form.to
                            }
                            className='flex-1'
                        >
                            Record Transfer
                        </Button>
                        <Button
                            variant='secondary'
                            onClick={() => {
                                if (!saving) setShowTransfer(false);
                            }}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
