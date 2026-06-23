import { useState, useEffect } from 'react';
import { Member } from '@/types';
import {
    formatCurrency,
    getCurrentMonth,
    getCollectionMonth,
    getMonthOptions,
    formatMonth,
} from '@/lib/utils';
import { recordPayment, useHoldingPersons } from '@/hooks/useAgent';
import { useAuth } from '@/hooks/useAuth';
import { CheckCircle, X, ChevronDown, Edit2 } from 'lucide-react';
import { HoldingPersonPicker } from '@/components/HoldingPersonPicker';

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

    const [editing, setEditing] = useState(false);
    const [month, setMonth] = useState(defaultMonth || getCollectionMonth());

    // FIX: All useState calls must come BEFORE any derived variables that use them.
    // Previously hasDues was computed before paymentType useState — always read undefined.
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState<Method>('cash');
    const [paymentType, setPaymentType] = useState<'monthly' | 'imam_food'>('monthly');
    const [notes, setNotes] = useState('');
    const [holdingPerson, setHoldingPerson] = useState('');
    const [saving, setSaving] = useState(false);
    const [showMonths, setShowMonths] = useState(false);

    // FIX: hasDues now correctly reads the paymentType state (declared above)
    const hasDues = !!(
        member?.due_from_month &&
        (member?.opening_balance || 0) > 0 &&
        paymentType === 'monthly'
    );

    const isReadOnly = !!existingPayment && !editing;

    // FIX: Reset ALL form fields when member changes — not just amount.
    // Previously notes/holdingPerson/paymentType/method leaked between members.
    useEffect(() => {
        if (member) {
            setAmount(String(member.monthly_amount));
            setNotes('');
            setHoldingPerson('');
            setPaymentType('monthly');
            setMethod('cash');
            setShowMonths(false);
        }
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
            paymentType,
            recordedBy: user.id,
            notes,
            holdingPerson: holdingPerson || undefined,
            // Pass member for due allocation and advance balance tracking.
            // recordPayment() will fetch fresh data from DB before writing.
            member: {
                opening_balance: member.opening_balance,
                advance_balance: member.advance_balance,
                monthly_amount: member.monthly_amount,
                due_from_month: member.due_from_month,
            },
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
        setPaymentType('monthly');
        setMethod('cash');
        setShowMonths(false);
        setEditing(false);
        onClose();
    };

    const monthOptions = getMonthOptions(2023)
        .filter((m) => m <= getCollectionMonth())
        .reverse();

    if (!open || !member) return null;

    // Approximate number of months the arrear covers (for display hint)
    const approxArrearMonths = hasDues
        ? Math.ceil(member.opening_balance / member.monthly_amount)
        : 0;

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
                            {/* Payment Type */}
                            <div>
                                <label className='block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2'>
                                    Payment Type
                                </label>
                                <div className='grid grid-cols-2 gap-2'>
                                    {(
                                        [
                                            {
                                                value: 'monthly',
                                                label: '🗓 Monthly Subscription',
                                            },
                                            {
                                                value: 'imam_food',
                                                label: '🍽 Imam Food Allowance',
                                            },
                                        ] as const
                                    ).map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => {
                                                setPaymentType(opt.value);
                                                setHoldingPerson('');
                                            }}
                                            className={`py-2.5 px-3 rounded-xl text-xs font-medium transition-all text-center border
                                                ${
                                                    paymentType === opt.value
                                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                                        : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                                                }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Month Picker — hidden when member has dues (auto-allocated) */}
                            {!hasDues && (
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
                            )}

                            {/* Due allocation info banner — now correctly shown when hasDues=true */}
                            {hasDues && (
                                <div className='bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs'>
                                    <p className='font-semibold text-amber-800 mb-1'>
                                        Arrears:{' '}
                                        {formatCurrency(member.opening_balance)}
                                        {member?.due_from_month && (
                                            <span className='font-normal text-amber-600'>
                                                {' '}
                                                (since{' '}
                                                {formatMonth(
                                                    member.due_from_month,
                                                    'en',
                                                )}
                                                {approxArrearMonths > 0 &&
                                                    ` · ~${approxArrearMonths} month${approxArrearMonths > 1 ? 's' : ''}`}
                                                )
                                            </span>
                                        )}
                                    </p>
                                    <p className='text-amber-700'>
                                        Payment will be auto-allocated to oldest
                                        unpaid months first. Only full months
                                        (₹{member.monthly_amount}) are marked as paid.
                                    </p>
                                </div>
                            )}

                            {/* Amount */}
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

                            {/* Allocation preview for dues members */}
                            {hasDues && parseFloat(amount) > 0 && (
                                <div className='bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs'>
                                    {(() => {
                                        const amt = parseFloat(amount);
                                        const rate = member.monthly_amount;
                                        const fullMonths = Math.floor(amt / rate);
                                        const leftover = amt - fullMonths * rate;
                                        const totalDues = member.opening_balance;
                                        const excess = amt > totalDues ? amt - totalDues : 0;
                                        return (
                                            <>
                                                <p className='font-semibold text-blue-800 mb-1'>
                                                    How ₹{amt.toFixed(0)} will be applied:
                                                </p>
                                                {fullMonths > 0 && (
                                                    <p className='text-blue-700'>
                                                        ✓ {fullMonths} month{fullMonths > 1 ? 's' : ''} × ₹{rate} = ₹{(fullMonths * rate).toFixed(0)}
                                                    </p>
                                                )}
                                                {leftover > 0 && excess === 0 && (
                                                    <p className='text-blue-600'>
                                                        + ₹{leftover.toFixed(0)} reduces remaining arrears
                                                    </p>
                                                )}
                                                {excess > 0 && (
                                                    <p className='text-green-700 font-medium'>
                                                        + ₹{excess.toFixed(0)} saved as advance credit
                                                    </p>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            )}

                            {/* Advance preview — shown when no dues and paying more than monthly */}
                            {!hasDues &&
                                member &&
                                parseFloat(amount) > member.monthly_amount && (
                                    <div className='bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-xs'>
                                        <p className='font-semibold text-green-800'>
                                            ₹
                                            {(
                                                parseFloat(amount) -
                                                member.monthly_amount
                                            ).toFixed(0)}{' '}
                                            will be saved as advance credit
                                        </p>
                                        <p className='text-green-600 mt-0.5'>
                                            Applied automatically to next
                                            month's payment
                                        </p>
                                    </div>
                                )}

                            {/* Shortfall preview — shown when no dues and paying less than monthly */}
                            {!hasDues &&
                                member &&
                                parseFloat(amount) > 0 &&
                                parseFloat(amount) < member.monthly_amount && (
                                    <div className='bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs'>
                                        <p className='font-semibold text-amber-800'>
                                            Partial payment — ₹
                                            {(
                                                member.monthly_amount -
                                                parseFloat(amount)
                                            ).toFixed(0)}{' '}
                                            balance will be due
                                        </p>
                                        <p className='text-amber-700 mt-0.5'>
                                            {month} will NOT be marked as
                                            paid. The remaining ₹
                                            {(
                                                member.monthly_amount -
                                                parseFloat(amount)
                                            ).toFixed(0)}{' '}
                                            carries forward as a due.
                                        </p>
                                    </div>
                                )}

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

                            {/* Holding Person — mandatory */}
                            {holdingPersons.length > 0 && (
                                <div>
                                    <label className='block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2'>
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
                                        <p className='text-xs text-red-500 mt-1'>
                                            Please select who received this
                                            payment
                                        </p>
                                    )}
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
                                    saving ||
                                    !amount ||
                                    parseFloat(amount) <= 0 ||
                                    (holdingPersons.length > 0 &&
                                        !holdingPerson)
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