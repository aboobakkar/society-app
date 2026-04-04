import { useState, useEffect } from 'react';
import { recordRental, useHoldingPersons } from '@/hooks/useAgent';
import { useAuth } from '@/hooks/useAuth';
import { HoldingPersonPicker } from '@/components/HoldingPersonPicker';
import { formatCurrency } from '@/lib/utils';
import { X, CheckCircle, Wrench } from 'lucide-react';

interface RentalSheetProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

type Method = 'cash' | 'online' | 'bank';

const METHOD_LABELS: Record<Method, string> = {
    cash: '💵 Cash',
    online: '📱 Online / UPI',
    bank: '🏦 Bank Transfer',
};

export function RentalSheet({ open, onClose, onSuccess }: RentalSheetProps) {
    const { user } = useAuth();
    const [payerName, setPayerName] = useState('');
    const [payerMobile, setPayerMobile] = useState('');
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState<Method>('cash');
    const [description, setDescription] = useState('');
    const [notes, setNotes] = useState('');
    const [holdingPerson, setHoldingPerson] = useState('');
    const [saving, setSaving] = useState(false);
    const holdingPersons = useHoldingPersons();

    useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [open]);

    const reset = () => {
        setPayerName('');
        setPayerMobile('');
        setAmount('');
        setMethod('cash');
        setDescription('');
        setNotes('');
        setHoldingPerson('');
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    const handleSave = async () => {
        if (!payerName.trim() || !amount || parseFloat(amount) <= 0) return;
        if (holdingPersons.length > 0 && !holdingPerson) return;
        if (!user) return;
        setSaving(true);
        const ok = await recordRental({
            payerName: payerName.trim(),
            payerMobile: payerMobile.trim() || undefined,
            amount: parseFloat(amount),
            description: description.trim() || undefined,
            notes: notes.trim() || undefined,
            holdingPerson: holdingPerson || undefined,
            recordedBy: user.id,
        });
        setSaving(false);
        if (ok) {
            onSuccess();
            handleClose();
        }
    };

    if (!open) return null;

    return (
        <>
            <div
                className='fixed inset-0 bg-black/50 z-40'
                onClick={handleClose}
            />
            <div className='fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto'>
                {/* Handle */}
                <div className='flex justify-center pt-3 pb-1'>
                    <div className='w-10 h-1 bg-stone-200 rounded-full' />
                </div>

                {/* Header */}
                <div className='flex items-center justify-between px-5 py-3 border-b border-stone-100'>
                    <div className='flex items-center gap-2.5'>
                        <div className='w-8 h-8 bg-teal-100 rounded-xl flex items-center justify-center'>
                            <Wrench size={16} className='text-teal-600' />
                        </div>
                        <div>
                            <h2 className='text-base font-semibold text-stone-900'>
                                Rental Income
                            </h2>
                            <p className='text-xs text-stone-400'>
                                Tools / Equipment rental
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className='w-8 h-8 flex items-center justify-center rounded-full bg-stone-100 text-stone-500'
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className='px-5 py-5 space-y-4'>
                    {/* Payer Name */}
                    <div>
                        <label className='block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2'>
                            Payer Name *
                        </label>
                        <input
                            type='text'
                            value={payerName}
                            onChange={(e) => setPayerName(e.target.value)}
                            placeholder='Full name of payer'
                            className='w-full px-4 py-3 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500'
                        />
                    </div>

                    {/* Mobile */}
                    <div>
                        <label className='block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2'>
                            Mobile (optional)
                        </label>
                        <input
                            type='tel'
                            inputMode='numeric'
                            value={payerMobile}
                            onChange={(e) => setPayerMobile(e.target.value)}
                            placeholder='9876543210'
                            className='w-full px-4 py-3 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500'
                        />
                    </div>

                    {/* Amount */}
                    <div>
                        <label className='block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2'>
                            Amount (₹) *
                        </label>
                        <div className='relative'>
                            <span className='absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-semibold'>
                                ₹
                            </span>
                            <input
                                type='number'
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                inputMode='numeric'
                                placeholder='0'
                                className='w-full pl-8 pr-4 py-3.5 text-2xl font-bold text-stone-900 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500'
                            />
                        </div>
                    </div>

                    {/* Payment Method */}
                    <div>
                        <label className='block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2'>
                            Payment Method
                        </label>
                        <div className='grid grid-cols-3 gap-2'>
                            {(Object.keys(METHOD_LABELS) as Method[]).map(
                                (m) => (
                                    <button
                                        key={m}
                                        onClick={() => setMethod(m)}
                                        className={`py-3 px-2 rounded-xl text-xs font-medium transition-all text-center
                    ${
                        method === m
                            ? 'bg-teal-600 text-white shadow-sm'
                            : 'bg-stone-50 text-stone-600 border border-stone-200 hover:bg-stone-100'
                    }`}
                                    >
                                        {METHOD_LABELS[m]}
                                    </button>
                                ),
                            )}
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className='block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2'>
                            What was rented?
                        </label>
                        <input
                            type='text'
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder='e.g. Sound system, Chairs, Generator...'
                            className='w-full px-4 py-3 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500'
                        />
                    </div>

                    {/* Notes */}
                    <div>
                        <label className='block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2'>
                            Notes (optional)
                        </label>
                        <input
                            type='text'
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder='Any additional remarks'
                            className='w-full px-4 py-3 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500'
                        />
                    </div>

                    {/* Received By — mandatory */}
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
                                    Please select who received this payment
                                </p>
                            )}
                        </div>
                    )}

                    {/* Save */}
                    <button
                        onClick={handleSave}
                        disabled={
                            saving ||
                            !payerName.trim() ||
                            !amount ||
                            parseFloat(amount) <= 0 ||
                            (holdingPersons.length > 0 && !holdingPerson)
                        }
                        className='w-full py-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-2xl transition-colors flex items-center justify-center gap-2 text-base active:scale-[0.98]'
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
                </div>
            </div>
        </>
    );
}
