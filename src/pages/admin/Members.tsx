import { useState } from 'react';
import { useMembers } from '@/hooks/useData';
import { useLang } from '@/hooks/useLang';
import { Member } from '@/types';
import {
    Button,
    Input,
    Select,
    Modal,
    Badge,
    PageHeader,
    Card,
    Spinner,
    EmptyState,
    ConfirmDialog,
} from '@/components/ui';
import { formatCurrency, getCurrentMonth } from '@/lib/utils';
import { Search, Plus, Edit2, PowerOff, Power } from 'lucide-react';

const EMPTY_FORM = {
    name: '',
    name_ml: '',
    mobile: '',
    monthly_amount: 500,
    status: 'active' as const,
    address: '',
    joined_month: getCurrentMonth(),
    notes: '',
};

export default function MembersPage() {
    const { members, loading, addMember, updateMember, toggleMemberStatus } =
        useMembers();
    const { i18n, lang } = useLang();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<
        'all' | 'active' | 'inactive'
    >('all');
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [saving, setSaving] = useState(false);
    const [confirmToggle, setConfirmToggle] = useState<Member | null>(null);

    const filtered = members.filter((m) => {
        const matchSearch =
            m.name.toLowerCase().includes(search.toLowerCase()) ||
            (m.name_ml || '').includes(search) ||
            m.mobile.includes(search) ||
            m.id.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === 'all' || m.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const openAdd = () => {
        setForm({ ...EMPTY_FORM });
        setEditId(null);
        setShowModal(true);
    };
    const openEdit = (m: Member) => {
        setForm({
            name: m.name,
            name_ml: m.name_ml || '',
            mobile: m.mobile,
            monthly_amount: m.monthly_amount,
            status: m.status,
            address: m.address || '',
            joined_month: m.joined_month,
            notes: m.notes || '',
        });
        setEditId(m.id);
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.name.trim() || !form.mobile.trim()) return;
        setSaving(true);
        try {
            let success = false;
            if (editId) {
                success = await updateMember(editId, form);
            } else {
                const result = await addMember(form);
                success = result !== null;
            }
            if (success) {
                setShowModal(false);
                setForm({ ...EMPTY_FORM });
                setEditId(null);
            }
        } finally {
            setSaving(false);
        }
    };

    const handleToggle = async () => {
        if (!confirmToggle) return;
        await toggleMemberStatus(confirmToggle.id, confirmToggle.status);
        setConfirmToggle(null);
    };

    const f = (k: string, v: string | number) =>
        setForm((prev) => ({ ...prev, [k]: v }));
    const closeModal = () => {
        if (!saving) {
            setShowModal(false);
            setEditId(null);
        }
    };

    // no full-page spinner

    return (
        <div>
            <PageHeader
                title={i18n.members}
                subtitle={
                    loading && members.length === 0
                        ? i18n.loading
                        : i18n.activeCount(
                              members.filter((m) => m.status === 'active')
                                  .length,
                              members.length,
                          )
                }
                action={
                    <Button onClick={openAdd}>
                        <Plus size={15} className='mr-1.5' />
                        {i18n.addMember}
                    </Button>
                }
            />

            <div className='flex flex-col sm:flex-row gap-2 mb-4'>
                <div className='relative flex-1'>
                    <Search
                        size={15}
                        className='absolute left-3 top-1/2 -translate-y-1/2 text-stone-400'
                    />
                    <input
                        className='w-full pl-9 pr-3 py-2 text-sm border border-stone-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500'
                        placeholder={i18n.searchMembers}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <Select
                    value={statusFilter}
                    onChange={(e) =>
                        setStatusFilter(e.target.value as typeof statusFilter)
                    }
                    className='sm:w-36'
                >
                    <option value='all'>{i18n.allMembers}</option>
                    <option value='active'>{i18n.active}</option>
                    <option value='inactive'>{i18n.inactive}</option>
                </Select>
            </div>

            <Card padding={false}>
                <div className='overflow-x-auto'>
                    <table className='w-full text-sm'>
                        <thead>
                            <tr className='bg-stone-50 border-b border-stone-200'>
                                {[
                                    'ID',
                                    i18n.name,
                                    i18n.mobile,
                                    i18n.monthlyAmountLabel,
                                    i18n.joined,
                                    i18n.status,
                                    i18n.actions,
                                ].map((h) => (
                                    <th
                                        key={h}
                                        className='px-4 py-3 text-left text-xs font-medium text-stone-500'
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className='divide-y divide-stone-100'>
                            {filtered.map((m) => (
                                <tr
                                    key={m.id}
                                    className='hover:bg-stone-50 transition-colors'
                                >
                                    <td className='px-4 py-3 font-mono text-xs text-stone-500'>
                                        {m.id}
                                    </td>
                                    <td className='px-4 py-3'>
                                        <p className='font-medium text-stone-900'>
                                            {lang === 'ml'
                                                ? m.name_ml || m.name
                                                : m.name}
                                        </p>
                                        {m.name_ml && lang === 'en' && (
                                            <p className='text-xs text-stone-400 font-malayalam'>
                                                {m.name_ml}
                                            </p>
                                        )}
                                        {lang === 'ml' && (
                                            <p className='text-xs text-stone-400'>
                                                {m.name}
                                            </p>
                                        )}
                                    </td>
                                    <td className='px-4 py-3 text-stone-600'>
                                        {m.mobile}
                                    </td>
                                    <td className='px-4 py-3 font-medium'>
                                        {formatCurrency(m.monthly_amount)}
                                    </td>
                                    <td className='px-4 py-3 text-stone-500'>
                                        {m.joined_month}
                                    </td>
                                    <td className='px-4 py-3'>
                                        <Badge
                                            text={
                                                m.status === 'active'
                                                    ? i18n.active
                                                    : i18n.inactive
                                            }
                                            variant={
                                                m.status === 'active'
                                                    ? 'success'
                                                    : 'neutral'
                                            }
                                        />
                                    </td>
                                    <td className='px-4 py-3'>
                                        <div className='flex gap-2'>
                                            <button
                                                onClick={() => openEdit(m)}
                                                className='p-1.5 rounded-md hover:bg-stone-100 text-stone-500 hover:text-stone-700 transition-colors'
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                onClick={() =>
                                                    setConfirmToggle(m)
                                                }
                                                className={`p-1.5 rounded-md transition-colors ${m.status === 'active' ? 'hover:bg-red-50 text-stone-400 hover:text-red-600' : 'hover:bg-green-50 text-stone-400 hover:text-green-600'}`}
                                            >
                                                {m.status === 'active' ? (
                                                    <PowerOff size={14} />
                                                ) : (
                                                    <Power size={14} />
                                                )}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filtered.length === 0 && !loading && (
                        <EmptyState message={i18n.noMembersFound} />
                    )}
                </div>
            </Card>

            <Modal
                open={showModal}
                onClose={closeModal}
                title={editId ? i18n.editMember : i18n.addNewMember}
            >
                <div className='space-y-4'>
                    <div className='grid grid-cols-2 gap-3'>
                        <div className='col-span-2'>
                            <Input
                                label={i18n.fullNameEn}
                                value={form.name}
                                onChange={(e) => f('name', e.target.value)}
                                placeholder='e.g. Muhammed Rashid'
                            />
                        </div>
                        <div className='col-span-2'>
                            <Input
                                label={i18n.fullNameMl}
                                value={form.name_ml}
                                onChange={(e) => f('name_ml', e.target.value)}
                                placeholder='ഉദാ: മുഹമ്മദ് റഷീദ്'
                                className='font-malayalam'
                            />
                        </div>
                        <Input
                            label={i18n.mobileNumber}
                            type='tel'
                            value={form.mobile}
                            onChange={(e) => f('mobile', e.target.value)}
                            placeholder='9876543210'
                        />
                        <Input
                            label={i18n.monthlyAmount}
                            type='number'
                            value={form.monthly_amount}
                            onChange={(e) =>
                                f('monthly_amount', Number(e.target.value))
                            }
                        />
                        <Input
                            label={i18n.joinedMonth}
                            type='month'
                            value={form.joined_month}
                            onChange={(e) => f('joined_month', e.target.value)}
                        />
                        <Select
                            label={i18n.status}
                            value={form.status}
                            onChange={(e) => f('status', e.target.value)}
                        >
                            <option value='active'>{i18n.active}</option>
                            <option value='inactive'>{i18n.inactive}</option>
                        </Select>
                        <div className='col-span-2'>
                            <Input
                                label={i18n.address}
                                value={form.address}
                                onChange={(e) => f('address', e.target.value)}
                            />
                        </div>
                        <div className='col-span-2'>
                            <Input
                                label={i18n.notes}
                                value={form.notes}
                                onChange={(e) => f('notes', e.target.value)}
                            />
                        </div>
                    </div>
                    <div className='flex gap-2 pt-2'>
                        <Button
                            onClick={handleSave}
                            loading={saving}
                            className='flex-1'
                        >
                            {i18n.saveMember}
                        </Button>
                        <Button variant='secondary' onClick={closeModal}>
                            {i18n.cancel}
                        </Button>
                    </div>
                </div>
            </Modal>

            <ConfirmDialog
                open={!!confirmToggle}
                message={
                    confirmToggle?.status === 'active'
                        ? i18n.deactivateConfirm(
                              confirmToggle?.name_ml ||
                                  confirmToggle?.name ||
                                  '',
                          )
                        : i18n.activateConfirm(
                              confirmToggle?.name_ml ||
                                  confirmToggle?.name ||
                                  '',
                          )
                }
                onConfirm={handleToggle}
                onCancel={() => setConfirmToggle(null)}
            />
        </div>
    );
}
