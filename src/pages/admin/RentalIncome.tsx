import { useState } from 'react';
import { useRentalIncome } from '@/hooks/useFeatures';
import { useAuth } from '@/hooks/useAuth';
import { RentalIncome } from '@/types';
import {
    Button,
    Input,
    Modal,
    PageHeader,
    Card,
    StatCard,
    EmptyState,
    ConfirmDialog,
} from '@/components/ui';
import {
    formatCurrency,
    formatDate,
    getCurrentMonth,
    getMonthOptions,
} from '@/lib/utils';
import { useHoldingPersons } from '@/hooks/useData';
import { HoldingPersonPicker } from '@/components/HoldingPersonPicker';
import { Plus, Trash2, Wrench } from 'lucide-react';

const EMPTY_FORM = {
    payer_name: '',
    payer_mobile: '',
    amount: 0,
    income_date: new Date().toISOString().slice(0, 10),
    description: '',
    notes: '',
    holding_person: '',
};

export default function RentalIncomePage() {
    const { profile } = useAuth();
    const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
    const { items, loading, totalRental, addRental, deleteRental } =
        useRentalIncome(selectedMonth);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<RentalIncome | null>(
        null,
    );
    const [form, setForm] = useState({ ...EMPTY_FORM });

    const currentMonth = getCurrentMonth();
    const holdingPersons = useHoldingPersons();
    const monthOptions = getMonthOptions(2023).filter((m) => m <= currentMonth);
    const f = (k: string, v: string | number) =>
        setForm((p) => ({ ...p, [k]: v }));

    const resetForm = () => setForm({ ...EMPTY_FORM });

    const handleSave = async () => {
        if (!form.payer_name.trim() || !form.amount) return;
        if (holdingPersons.length > 0 && !form.holding_person) return;
        setSaving(true);
        try {
            const noteText = [
                form.notes,
                form.holding_person
                    ? `Cash held by: ${form.holding_person}`
                    : null,
            ]
                .filter(Boolean)
                .join(' | ');
            const result = await addRental({
                ...form,
                notes: noteText || undefined,
                amount: Number(form.amount),
                recorded_by: profile?.id,
            });
            if (result) {
                setShowModal(false);
                resetForm();
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;
        await deleteRental(confirmDelete.id);
        setConfirmDelete(null);
    };

    return (
        <div>
            <PageHeader
                title='Tools Rental Income'
                subtitle={`${items.length} records`}
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
                        <Button onClick={() => setShowModal(true)}>
                            <Plus size={15} className='mr-1.5' /> Add Record
                        </Button>
                    </div>
                }
            />

            {/* Stats */}
            <div className='grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5'>
                <StatCard
                    label='Total Rental Income'
                    value={formatCurrency(totalRental)}
                    sub={`${items.length} records this month`}
                    valueClass='text-teal-700'
                />
                <StatCard
                    label='Largest Single Payment'
                    value={
                        items.length > 0
                            ? formatCurrency(
                                  Math.max(...items.map((i) => i.amount)),
                              )
                            : '—'
                    }
                    valueClass='text-stone-700'
                />
                <StatCard
                    label='Unique Payers'
                    value={new Set(items.map((i) => i.payer_name)).size}
                    sub='this month'
                    valueClass='text-stone-700'
                />
            </div>

            {/* Table */}
            <Card padding={false}>
                <div className='overflow-x-auto'>
                    <table className='w-full text-sm'>
                        <thead>
                            <tr className='bg-stone-50 border-b border-stone-200'>
                                {[
                                    'Payer',
                                    'Mobile',
                                    'Description',
                                    'Date',
                                    'Amount',
                                    'Notes',
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
                            {items.map((r) => (
                                <tr key={r.id} className='hover:bg-stone-50'>
                                    <td className='px-4 py-3'>
                                        <p className='font-medium text-stone-900'>
                                            {r.payer_name}
                                        </p>
                                    </td>
                                    <td className='px-4 py-3 text-stone-500 text-xs'>
                                        {r.payer_mobile || '—'}
                                    </td>
                                    <td className='px-4 py-3 text-stone-600'>
                                        {r.description || '—'}
                                    </td>
                                    <td className='px-4 py-3 text-stone-500 text-xs'>
                                        {formatDate(r.income_date)}
                                    </td>
                                    <td className='px-4 py-3 font-semibold text-teal-700'>
                                        {formatCurrency(r.amount)}
                                    </td>
                                    <td className='px-4 py-3 text-stone-400 text-xs'>
                                        {r.notes || '—'}
                                    </td>
                                    <td className='px-4 py-3'>
                                        <button
                                            onClick={() => setConfirmDelete(r)}
                                            className='p-1.5 rounded hover:bg-red-50 text-stone-300 hover:text-red-500 transition-colors'
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {items.length === 0 && !loading && (
                        <EmptyState message='No rental income recorded this month' />
                    )}
                </div>
            </Card>

            {/* Add Modal */}
            <Modal
                open={showModal}
                onClose={() => {
                    if (!saving) {
                        setShowModal(false);
                        resetForm();
                    }
                }}
                title='Add Rental Income'
            >
                <div className='space-y-4'>
                    <div className='flex items-center gap-3 p-3 bg-teal-50 border border-teal-100 rounded-xl'>
                        <Wrench
                            size={18}
                            className='text-teal-600 flex-shrink-0'
                        />
                        <p className='text-xs text-teal-800'>
                            Record tools/equipment rental income. Payer can be a
                            member or anyone else.
                        </p>
                    </div>

                    <div className='grid grid-cols-2 gap-3'>
                        <div className='col-span-2'>
                            <Input
                                label='Payer Name *'
                                placeholder='Full name of payer'
                                value={form.payer_name}
                                onChange={(e) =>
                                    f('payer_name', e.target.value)
                                }
                            />
                        </div>
                        <Input
                            label='Mobile (optional)'
                            type='tel'
                            placeholder='9876543210'
                            value={form.payer_mobile}
                            onChange={(e) => f('payer_mobile', e.target.value)}
                        />
                        <Input
                            label='Amount (₹) *'
                            type='number'
                            value={form.amount || ''}
                            onChange={(e) => f('amount', e.target.value)}
                        />
                        <Input
                            label='Date *'
                            type='date'
                            value={form.income_date}
                            onChange={(e) => f('income_date', e.target.value)}
                        />
                        <div className='col-span-2'>
                            <Input
                                label='Description (what was rented)'
                                placeholder='e.g. Sound system, Chairs, Generator...'
                                value={form.description}
                                onChange={(e) =>
                                    f('description', e.target.value)
                                }
                            />
                        </div>
                        <div className='col-span-2'>
                            <Input
                                label='Notes (optional)'
                                placeholder='Any additional remarks'
                                value={form.notes}
                                onChange={(e) => f('notes', e.target.value)}
                            />
                        </div>
                    </div>

                    {holdingPersons.length > 0 && (
                        <div>
                            <label className='block text-xs font-medium text-stone-600 mb-2'>
                                Received By{' '}
                                <span className='text-red-500'>*</span>
                            </label>
                            <HoldingPersonPicker
                                persons={holdingPersons}
                                value={form.holding_person || ''}
                                onChange={(v) => f('holding_person', v)}
                                label=''
                            />
                            {!form.holding_person && (
                                <p className='text-xs text-red-400 mt-1'>
                                    Please select who received this payment
                                </p>
                            )}
                        </div>
                    )}

                    <div className='flex gap-2 pt-1'>
                        <Button
                            onClick={handleSave}
                            loading={saving}
                            className='flex-1'
                        >
                            Save Record
                        </Button>
                        <Button
                            variant='secondary'
                            onClick={() => {
                                if (!saving) {
                                    setShowModal(false);
                                    resetForm();
                                }
                            }}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            </Modal>

            <ConfirmDialog
                open={!!confirmDelete}
                message='Delete this rental income record? This cannot be undone.'
                onConfirm={handleDelete}
                onCancel={() => setConfirmDelete(null)}
            />
        </div>
    );
}
