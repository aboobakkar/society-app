import { useState, useEffect } from 'react';
import { Member } from '@/types';
import {
    formatCurrency,
    getCurrentMonth,
    getMonthOptions,
    formatMonth,
} from '@/lib/utils';
import { recordPayment, useHoldingPersons } from '@/hooks/useAgent';
import { useAuth } from '@/hooks/useAuth';
import { CheckCircle, X, ChevronDown, Edit2, ChevronRight } from 'lucide-react';

interface PaymentSheetProps {
    member: Member | null;
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    defaultMonth?: string;
    // If provided, show in read-only view mode (already recorded payment)
    existingPayment?: {
        amount: number;
        method: string;
        month: string;
        notes?: string | null;
    } | null;
}

type Method = 'cash' | 'online' | 'bank';

const METHOD_LABELS: Record<Method, string> = {
    cash: '💵 Cash',
    online: '📱 Online / UPI',
    bank: '🏦 Bank Transfer',
};

export function PaymentSheet({
    member,
    open,
    onClose,
    onSuccess,
    defaultMonth,
    existingPayment,
}: PaymentSheetProps) {
    const { user } = useAuth();
    const holdingPersons = useHoldingPersons();

    const [editing, setEditing] = useState(false); // start in read-only if existingPayment
    const [month, setMonth] = useState(defaultMonth || getCurrentMonth());
    const hasDues = !!(
        member?.due_from_month && (member?.opening_balance || 0) > 0
    );
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState<Method>('cash');
    const [notes, setNotes] = useState('');
    const [holdingPerson, setHoldingPerson] = useState('');
    const [saving, setSaving] = useState(false);
    const [showMonths, setShowMonths] = useState(false);

    const isReadOnly = !!existingPayment && !editing;

    useEffect(() => {
        if (member) setAmount(String(member.monthly_amount));
    }, [member]);

    useEffect(() => {
        if (defaultMonth) setMonth(defaultMonth);
    }, [defaultMonth]);

    useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden';
            setEditing(false); // always start read-only when reopened
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [open]);

    const handleSave = async () => {
        if (!member || !user) return;
        const amt = parseFloat(amount);
        if (!amt || amt <= 0) return;
        setSaving(true);
        const ok = await recordPayment({
            memberId: member.id,
            month,
            amount: amt,
            method,
            recordedBy: user.id,
            notes,
            holdingPerson: holdingPerson || undefined,
            // Pass member for smart due allocation — if has dues, oldest months filled first
            member: hasDues
                ? {
                      opening_balance: member.opening_balance,
                      advance_balance: member.advance_balance,
                      monthly_amount: member.monthly_amount,
                      due_from_month: member.due_from_month,
                  }
                : undefined,
        });
        setSaving(false);
        if (ok) {
            onSuccess();
            handleClose();
        }
    };

    const handleClose = () => {
        setNotes('');
        setHoldingPerson('');
        setShowMonths(false);
        setEditing(false);
        onClose();
    };

    const monthOptions = getMonthOptions(2023)
        .filter((m) => m <= getCurrentMonth())
        .reverse();

    if (!open || !member) return null;

    return (
        <>
            <div
                className='fixed inset-0 bg-black/50 z-40'
                onClick={handleClose}
            />
            <div className='fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto'>
                <div className='flex justify-center pt-3 pb-1'>
                    <div className='w-10 h-1 bg-stone-200 rounded-full' />
                </div>

                {/* Header */}
                <div className='flex items-center justify-between px-5 py-3 border-b border-stone-100'>
                    <div>
                        <h2 className='text-base font-semibold text-stone-900'>
                            {isReadOnly ? 'Payment Details' : 'Record Payment'}
                        </h2>
                        <p className='text-xs text-stone-400 mt-0.5'>
                            {member.id}
                        </p>
                    </div>
                    <div className='flex items-center gap-2'>
                        {isReadOnly && (
                            <button
                                onClick={() => setEditing(true)}
                                className='flex items-center gap-1.5 text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-lg font-medium'
                            >
                                <Edit2 size={12} /> Edit
                            </button>
                        )}
                        <button
                            onClick={handleClose}
                            className='w-8 h-8 flex items-center justify-center rounded-full bg-stone-100 text-stone-500'
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                <div className='px-5 py-5 space-y-5'>
                    {/* Member Info */}
                    <div className='flex items-center gap-3 p-3 bg-indigo-50 rounded-2xl'>
                        <div className='w-11 h-11 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0'>
                            {member.name[0].toUpperCase()}
                        </div>
                        <div>
                            <p className='font-semibold text-stone-900'>
                                {member.name}
                            </p>
                            <p className='text-xs text-stone-500'>
                                {member.id} · {member.mobile}
                            </p>
                            <p className='text-xs text-indigo-600 font-medium mt-0.5'>
                                Monthly: {formatCurrency(member.monthly_amount)}
                            </p>
                        </div>
                    </div>

                    {/* READ-ONLY view */}
                    {isReadOnly && existingPayment ? (
                        <div className='space-y-3'>
                            <div className='bg-stone-50 rounded-2xl divide-y divide-stone-100'>
                                {[
                                    {
                                        label: 'Month',
                                        value: formatMonth(
                                            existingPayment.month,
                                            'en',
                                        ),
                                    },
                                    {
                                        label: 'Amount',
                                        value: formatCurrency(
                                            existingPayment.amount,
                                        ),
                                    },
                                    {
                                        label: 'Method',
                                        value: existingPayment.method,
                                    },
                                    {
                                        label: 'Notes',
                                        value: existingPayment.notes || '—',
                                    },
                                ].map((row) => (
                                    <div
                                        key={row.label}
                                        className='flex justify-between items-center px-4 py-3'
                                    >
                                        <span className='text-xs text-stone-400 font-medium'>
                                            {row.label}
                                        </span>
                                        <span className='text-sm font-semibold text-stone-800 capitalize'>
                                            {row.value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <p className='text-xs text-stone-400 text-center'>
                                Tap Edit to modify this payment
                            </p>
                        </div>
                    ) : (
                        /* EDIT / NEW ENTRY form */
                        <>
                            {/* Month Picker */}
                            <div>
                                <label className='block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2'>
                                    Month
                                </label>
                                <button
                                    onClick={() => setShowMonths(!showMonths)}
                                    className='w-full flex items-center justify-between px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-medium text-stone-800'
                                >
                                    <span>{formatMonth(month, 'en')}</span>
                                    <ChevronDown
                                        size={16}
                                        className={`text-stone-400 transition-transform ${showMonths ? 'rotate-180' : ''}`}
                                    />
                                </button>
                                {showMonths && (
                                    <div className='mt-2 max-h-48 overflow-y-auto border border-stone-200 rounded-xl bg-white shadow-lg divide-y divide-stone-100'>
                                        {monthOptions.map((m) => (
                                            <button
                                                key={m}
                                                onClick={() => {
                                                    setMonth(m);
                                                    setShowMonths(false);
                                                }}
                                                className={`w-full text-left px-4 py-3 text-sm transition-colors
                          ${m === month ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-stone-700 hover:bg-stone-50'}`}
                                            >
                                                {formatMonth(m, 'en')}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Amount */}
                            {/* Due allocation info */}
                            {hasDues && (
                                <div className='bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs'>
                                    <p className='font-semibold text-amber-800 mb-1'>
                                        Outstanding:{' '}
                                        {member &&
                                            formatCurrency(
                                                member.opening_balance,
                                            )}
                                        {member?.due_from_month && (
                                            <span className='font-normal text-amber-600'>
                                                {' '}
                                                since{' '}
                                                {formatMonth(
                                                    member.due_from_month,
                                                    'en',
                                                )}
                                            </span>
                                        )}
                                    </p>
                                    <p className='text-amber-700'>
                                        Payment will be auto-allocated to oldest
                                        unpaid months first.
                                    </p>
                                </div>
                            )}

                            <div>
                                <label className='block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2'>
                                    Amount (₹)
                                </label>
                                <div className='relative'>
                                    <span className='absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-semibold'>
                                        ₹
                                    </span>
                                    <input
                                        type='number'
                                        value={amount}
                                        onChange={(e) =>
                                            setAmount(e.target.value)
                                        }
                                        inputMode='numeric'
                                        placeholder='0'
                                        className='w-full pl-8 pr-4 py-3.5 text-2xl font-bold text-stone-900 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500'
                                    />
                                </div>
                            </div>

                            {/* Method */}
                            <div>
                                <label className='block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2'>
                                    Payment Method
                                </label>
                                <div className='grid grid-cols-3 gap-2'>
                                    {(
                                        Object.keys(METHOD_LABELS) as Method[]
                                    ).map((m) => (
                                        <button
                                            key={m}
                                            onClick={() => {
                                                setMethod(m);
                                                setHoldingPerson('');
                                            }}
                                            className={`py-3 px-2 rounded-xl text-xs font-medium transition-all text-center
                        ${method === m ? 'bg-indigo-600 text-white shadow-sm' : 'bg-stone-50 text-stone-600 border border-stone-200'}`}
                                        >
                                            {METHOD_LABELS[m]}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Cash Holding Person — only show for cash payments */}
                            {method === 'cash' && holdingPersons.length > 0 && (
                                <div>
                                    <label className='block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2'>
                                        Cash Handed To (optional)
                                    </label>
                                    <div className='space-y-1.5'>
                                        {holdingPersons.map((person) => (
                                            <button
                                                key={person}
                                                onClick={() =>
                                                    setHoldingPerson(
                                                        holdingPerson === person
                                                            ? ''
                                                            : person,
                                                    )
                                                }
                                                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium border transition-all
                          ${
                              holdingPerson === person
                                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                                  : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                          }`}
                                            >
                                                <span>{person}</span>
                                                {holdingPerson === person && (
                                                    <CheckCircle
                                                        size={16}
                                                        className='text-amber-600'
                                                    />
                                                )}
                                            </button>
                                        ))}
                                        {holdingPerson && (
                                            <button
                                                onClick={() =>
                                                    setHoldingPerson('')
                                                }
                                                className='text-xs text-stone-400 hover:text-stone-600 px-2'
                                            >
                                                Clear selection
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Notes */}
                            <div>
                                <label className='block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2'>
                                    Notes (optional)
                                </label>
                                <input
                                    type='text'
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder='Reference no, remarks...'
                                    className='w-full px-4 py-3 text-sm text-stone-800 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500'
                                />
                            </div>

                            {/* Save */}
                            <button
                                onClick={handleSave}
                                disabled={
                                    saving || !amount || parseFloat(amount) <= 0
                                }
                                className='w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 text-base active:scale-[0.98]'
                            >
                                {saving ? (
                                    <span className='w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin' />
                                ) : (
                                    <CheckCircle size={20} />
                                )}
                                {saving
                                    ? 'Saving...'
                                    : `Save ${amount ? formatCurrency(parseFloat(amount)) : ''}`}
                            </button>

                            <div className='h-2' />
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
