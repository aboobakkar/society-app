import { useState } from 'react'
import { useMembers } from '@/hooks/useData'
import { useLang } from '@/hooks/useLang'
import { Member } from '@/types'
import {
  Button, Input, Select, Modal, Badge, PageHeader,
  Card, Spinner, EmptyState, ConfirmDialog
} from '@/components/ui'
import { formatCurrency, getCurrentMonth } from '@/lib/utils'
import { Search, Plus, Edit2, PowerOff, Power } from 'lucide-react'

const EMPTY_FORM = {
  name: '', name_ml: '', mobile: '', monthly_amount: 500,
  status: 'active' as const, address: '', joined_month: getCurrentMonth(), notes: ''
}

export default function MembersPage() {
  const { members, loading, addMember, updateMember, toggleMemberStatus } = useMembers()
  const { t, lang } = useLang()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [confirmToggle, setConfirmToggle] = useState<Member | null>(null)

  if (loading) return <Spinner />

  const filtered = members.filter(m => {
    const matchSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      (m.name_ml || '').includes(search) ||
      m.mobile.includes(search) ||
      m.id.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || m.status === statusFilter
    return matchSearch && matchStatus
  })

  const openAdd = () => {
    setForm({ ...EMPTY_FORM })
    setEditId(null)
    setShowModal(true)
  }

  const openEdit = (m: Member) => {
    setForm({
      name: m.name, name_ml: m.name_ml || '', mobile: m.mobile,
      monthly_amount: m.monthly_amount, status: m.status,
      address: m.address || '', joined_month: m.joined_month, notes: m.notes || ''
    })
    setEditId(m.id)
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.mobile.trim()) return
    setSaving(true)
    if (editId) {
      await updateMember(editId, form)
    } else {
      await addMember(form)
    }
    setSaving(false)
    setShowModal(false)
  }

  const handleToggle = async () => {
    if (!confirmToggle) return
    await toggleMemberStatus(confirmToggle.id, confirmToggle.status)
    setConfirmToggle(null)
  }

  const f = (k: string, v: string | number) => setForm(prev => ({ ...prev, [k]: v }))

  return (
    <div>
      <PageHeader
        title={t('Members', 'അംഗങ്ങൾ')}
        subtitle={`${members.filter(m => m.status === 'active').length} ${t('active', 'സജീവം')} · ${members.length} ${t('total', 'ആകെ')}`}
        action={
          <Button onClick={openAdd}>
            <Plus size={15} className="mr-1.5" />{t('Add Member', 'അംഗം ചേർക്കുക')}
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            className="w-full pl-9 pr-3 py-2 text-sm border border-stone-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            placeholder={t('Search by name, mobile or ID...', 'പേര്, മൊബൈൽ അല്ലെങ്കിൽ ID...')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)} className="sm:w-36">
          <option value="all">{t('All Members', 'എല്ലാ അംഗങ്ങളും')}</option>
          <option value="active">{t('Active', 'സജീവം')}</option>
          <option value="inactive">{t('Inactive', 'നിഷ്ക്രിയം')}</option>
        </Select>
      </div>

      {/* Table */}
      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">
                {[
                  t('ID', 'ID'), t('Name', 'പേര്'), t('Mobile', 'മൊബൈൽ'),
                  t('Monthly', 'മാസ തുക'), t('Joined', 'ചേർന്നത്'),
                  t('Status', 'സ്ഥിതി'), t('Actions', 'ഓപ്ഷൻ')
                ].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-stone-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.map(m => (
                <tr key={m.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-stone-500">{m.id}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-stone-900">{lang === 'ml' ? m.name_ml || m.name : m.name}</p>
                    {lang === 'ml' && <p className="text-xs text-stone-400">{m.name}</p>}
                    {lang === 'en' && m.name_ml && <p className="text-xs text-stone-400 font-malayalam">{m.name_ml}</p>}
                  </td>
                  <td className="px-4 py-3 text-stone-600">{m.mobile}</td>
                  <td className="px-4 py-3 font-medium">{formatCurrency(m.monthly_amount)}</td>
                  <td className="px-4 py-3 text-stone-500">{m.joined_month}</td>
                  <td className="px-4 py-3">
                    <Badge
                      text={m.status === 'active' ? t('Active', 'സജീവം') : t('Inactive', 'നിഷ്ക്രിയം')}
                      variant={m.status === 'active' ? 'success' : 'neutral'}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(m)}
                        className="p-1.5 rounded-md hover:bg-stone-100 text-stone-500 hover:text-stone-700 transition-colors">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => setConfirmToggle(m)}
                        className={`p-1.5 rounded-md transition-colors ${
                          m.status === 'active'
                            ? 'hover:bg-red-50 text-stone-400 hover:text-red-600'
                            : 'hover:bg-green-50 text-stone-400 hover:text-green-600'
                        }`}>
                        {m.status === 'active' ? <PowerOff size={14} /> : <Power size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <EmptyState message={t('No members found', 'അംഗങ്ങളൊന്നും കണ്ടെത്തിയില്ല')} />}
        </div>
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editId ? t('Edit Member', 'അംഗം എഡിറ്റ് ചെയ്യുക') : t('Add New Member', 'പുതിയ അംഗം ചേർക്കുക')}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Input label={t('Full Name (English) *', 'പൂർണ നാമം (English) *')}
                value={form.name} onChange={e => f('name', e.target.value)} placeholder="e.g. Muhammed Rashid" />
            </div>
            <div className="col-span-2">
              <Input label={t('Full Name (Malayalam)', 'പൂർണ നാമം (Malayalam)')}
                value={form.name_ml} onChange={e => f('name_ml', e.target.value)}
                placeholder="ഉദാ: മുഹമ്മദ് റഷീദ്" className="font-malayalam" />
            </div>
            <Input label={t('Mobile Number *', 'മൊബൈൽ നമ്പർ *')} type="tel"
              value={form.mobile} onChange={e => f('mobile', e.target.value)} placeholder="9876543210" />
            <Input label={t('Monthly Amount (₹) *', 'മാസ തുക (₹) *')} type="number"
              value={form.monthly_amount} onChange={e => f('monthly_amount', Number(e.target.value))} />
            <Input label={t('Joined Month', 'ചേർന്ന മാസം')} type="month"
              value={form.joined_month} onChange={e => f('joined_month', e.target.value)} />
            <Select label={t('Status', 'സ്ഥിതി')} value={form.status} onChange={e => f('status', e.target.value)}>
              <option value="active">{t('Active', 'സജീവം')}</option>
              <option value="inactive">{t('Inactive', 'നിഷ്ക്രിയം')}</option>
            </Select>
            <div className="col-span-2">
              <Input label={t('Address (optional)', 'വിലാസം')}
                value={form.address} onChange={e => f('address', e.target.value)} />
            </div>
            <div className="col-span-2">
              <Input label={t('Notes (optional)', 'കുറിപ്പ്')}
                value={form.notes} onChange={e => f('notes', e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} loading={saving} className="flex-1">
              {t('Save Member', 'സേവ് ചെയ്യുക')}
            </Button>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              {t('Cancel', 'റദ്ദാക്കുക')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirm toggle */}
      <ConfirmDialog
        open={!!confirmToggle}
        message={confirmToggle?.status === 'active'
          ? t(`Deactivate ${confirmToggle?.name}? They will be excluded from monthly collections.`,
              `${confirmToggle?.name_ml || confirmToggle?.name} നിഷ്ക്രിയമാക്കണോ?`)
          : t(`Activate ${confirmToggle?.name}?`, `${confirmToggle?.name_ml || confirmToggle?.name} സജീവമാക്കണോ?`)
        }
        onConfirm={handleToggle}
        onCancel={() => setConfirmToggle(null)}
      />
    </div>
  )
}
