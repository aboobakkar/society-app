import { useState } from 'react';
import { useExpenses } from '@/hooks/useData';
import { useLang } from '@/hooks/useLang';
import { useAuth } from '@/hooks/useAuth';
import { Expense, ExpenseCategory } from '@/types';
import {
    Button,
    Input,
    Select,
    Modal,
    Badge,
    PageHeader,
    Card,
    StatCard,
    Spinner,
    EmptyState,
    ConfirmDialog,
} from '@/components/ui';
import {
    formatCurrency,
    formatDate,
    getCurrentMonth,
    getMonthOptions,
} from '@/lib/utils';
import { Plus, Trash2 } from 'lucide-react';

type CatKey =
    | 'catSalary'
    | 'catUtility'
    | 'catMaintenance'
    | 'catEvent'
    | 'catOther';

const CATEGORIES: { value: ExpenseCategory; key: CatKey }[] = [
    { value: 'salary', key: 'catSalary' },
    { value: 'utility', key: 'catUtility' },
    { value: 'maintenance', key: 'catMaintenance' },
    { value: 'event', key: 'catEvent' },
    { value: 'other', key: 'catOther' },
];

const CAT_BADGE: Record<
    ExpenseCategory,
    'info' | 'warning' | 'success' | 'danger' | 'neutral'
> = {
    salary: 'info',
    utility: 'warning',
    maintenance: 'success',
    event: 'danger',
    other: 'neutral',
};

export default function ExpensesPage() {
    const { i18n } = useLang();
    const { profile } = useAuth();
    const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
    const { expenses, loading, addExpense, deleteExpense } =
        useExpenses(selectedMonth);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<Expense | null>(null);
    const [form, setForm] = useState({
        category: 'salary' as ExpenseCategory,
        description: '',
        amount: 0,
        expense_date: new Date().toISOString().slice(0, 10),
        paid_to: '',
        reference_no: '',
        notes: '',
    });

    const monthOptions = getMonthOptions(2023);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

    const resetForm = () =>
        setForm({
            category: 'salary',
            description: '',
            amount: 0,
            expense_date: new Date().toISOString().slice(0, 10),
            paid_to: '',
            reference_no: '',
            notes: '',
        });

    const handleSave = async () => {
        if (!form.description.trim() || !form.amount) return;
        setSaving(true);
        try {
            const result = await addExpense({
                ...form,
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
        await deleteExpense(confirmDelete.id);
        setConfirmDelete(null);
    };

    const f = (k: string, v: string | number) =>
        setForm((prev) => ({ ...prev, [k]: v }));

    // no full-page spinner

    return (
        <div>
            <PageHeader
                title={i18n.expenseRecords}
                subtitle={i18n.records(expenses.length)}
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
                        <Button onClick={() => setShowModal(true)}>
                            <Plus size={15} className='mr-1.5' />
                            {i18n.addExpense}
                        </Button>
                    </div>
                }
            />

            <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5'>
                <StatCard
                    label={i18n.total}
                    value={formatCurrency(totalExpenses)}
                    valueClass='text-red-700'
                />
                {CATEGORIES.map((c) => {
                    const amt = expenses
                        .filter((e) => e.category === c.value)
                        .reduce((s, e) => s + e.amount, 0);
                    return amt > 0 ? (
                        <StatCard
                            key={c.value}
                            label={i18n[c.key]}
                            value={formatCurrency(amt)}
                            valueClass='text-stone-700'
                        />
                    ) : null;
                })}
            </div>

            <Card padding={false}>
                <div className='overflow-x-auto'>
                    <table className='w-full text-sm'>
                        <thead>
                            <tr className='bg-stone-50 border-b border-stone-200'>
                                {[
                                    i18n.description,
                                    i18n.category,
                                    i18n.paidTo,
                                    i18n.date,
                                    i18n.amount,
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
                            {expenses.map((e) => {
                                const cat = CATEGORIES.find(
                                    (c) => c.value === e.category,
                                );
                                return (
                                    <tr
                                        key={e.id}
                                        className='hover:bg-stone-50'
                                    >
                                        <td className='px-4 py-3'>
                                            <p className='font-medium text-stone-900'>
                                                {e.description}
                                            </p>
                                            {e.notes && (
                                                <p className='text-xs text-stone-400'>
                                                    {e.notes}
                                                </p>
                                            )}
                                        </td>
                                        <td className='px-4 py-3'>
                                            <Badge
                                                text={
                                                    cat
                                                        ? i18n[cat.key]
                                                        : e.category
                                                }
                                                variant={CAT_BADGE[e.category]}
                                            />
                                        </td>
                                        <td className='px-4 py-3 text-stone-500'>
                                            {e.paid_to || '—'}
                                        </td>
                                        <td className='px-4 py-3 text-stone-500 text-xs'>
                                            {formatDate(e.expense_date)}
                                        </td>
                                        <td className='px-4 py-3 font-semibold text-red-600'>
                                            {formatCurrency(e.amount)}
                                        </td>
                                        <td className='px-4 py-3'>
                                            <button
                                                onClick={() =>
                                                    setConfirmDelete(e)
                                                }
                                                className='p-1.5 rounded hover:bg-red-50 text-stone-300 hover:text-red-500 transition-colors'
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {expenses.length === 0 && (
                        <EmptyState message={i18n.noExpensesMonth} />
                    )}
                </div>
            </Card>

            <Modal
                open={showModal}
                onClose={() => {
                    if (!saving) {
                        setShowModal(false);
                        resetForm();
                    }
                }}
                title={i18n.addExpense}
            >
                <div className='space-y-4'>
                    <Select
                        label={`${i18n.category} *`}
                        value={form.category}
                        onChange={(e) => f('category', e.target.value)}
                    >
                        {CATEGORIES.map((c) => (
                            <option key={c.value} value={c.value}>
                                {i18n[c.key]}
                            </option>
                        ))}
                    </Select>
                    <Input
                        label={`${i18n.description} *`}
                        placeholder='e.g. Imam salary – March 2025'
                        value={form.description}
                        onChange={(e) => f('description', e.target.value)}
                    />
                    <div className='grid grid-cols-2 gap-3'>
                        <Input
                            label={`${i18n.amount} (₹) *`}
                            type='number'
                            value={form.amount || ''}
                            onChange={(e) => f('amount', e.target.value)}
                        />
                        <Input
                            label={`${i18n.date} *`}
                            type='date'
                            value={form.expense_date}
                            onChange={(e) => f('expense_date', e.target.value)}
                        />
                        <Input
                            label={i18n.paidTo}
                            placeholder={i18n.personOrCompany}
                            value={form.paid_to}
                            onChange={(e) => f('paid_to', e.target.value)}
                        />
                        <Input
                            label={i18n.reference}
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
                        >
                            {i18n.saveExpense}
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
                            {i18n.cancel}
                        </Button>
                    </div>
                </div>
            </Modal>

            <ConfirmDialog
                open={!!confirmDelete}
                message={i18n.deleteExpenseConfirm}
                onConfirm={handleDelete}
                onCancel={() => setConfirmDelete(null)}
            />
        </div>
    );
}
