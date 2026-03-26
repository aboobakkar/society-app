import { useState } from 'react'
import { useMembers, usePayments } from '@/hooks/useData'
import { useLang } from '@/hooks/useLang'
import { useAuth } from '@/hooks/useAuth'
import { Payment } from '@/types'
import {
  Button, Input, Select, Modal, Badge, PageHeader,
  Card, StatCard, Spinner, EmptyState, ConfirmDialog
} from '@/components/ui'
import { formatCurrency, formatMonth, getCurrentMonth, getMonthOptions, formatDate } from '@/lib/utils'
import { Plus, Trash2, CheckCircle2, Clock, ChevronDown } from 'lucide-react'

export default function PaymentsPage() {
  const { t, lang } = useLang()
  const { profile } = useAuth()
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
  const { members } = useMembers()
  const { payments, loading, addPayment, deletePayment } = usePayments(selectedMonth)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Payment | null>(null)
  const [form, setForm] = useState({
    member_id: '', amount: 500, method: 'cash',
    payment_date: new Date().toISOString().slice(0, 10),
    reference_no: '', notes: ''
  })

  const activeMembers = members.filter(m => m.status === 'active')
  const paidMemberIds = new Set(payments.map(p => p.member_id))
  const unpaidMembers = activeMembers.filter(m => !paidMemberIds.has(m.id))
  const totalCollected = payments.reduce((s, p) => s + p.amount, 0)
  const expectedTotal = activeMembers.reduce((s, m) => s + m.monthly_amount, 0)

  const monthOptions = getMonthOptions(2023)

  const openModal = (memberId = '') => {
    const member = members.find(m => m.id === memberId)
    setForm({
      member_id: memberId,
      amount: member?.monthly_amount || 500,
      method: 'cash',
      payment_date: new Date().toISOString().slice(0, 10),
      reference_no: '', notes: ''
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.member_id) return
    setSaving(true)
    await addPayment({ ...form, recorded_by: profile?.id })
    setSaving(false)
    setShowModal(false)
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    await deletePayment(confirmDelete.id)
    setConfirmDelete(null)
  }

  const f = (k: string, v: string | number) => {
    const updated = { ...form, [k]: v }
    if (k === 'member_id') {
      const member = members.find(m => m.id === v)
      updated.amount = member?.monthly_amount || 500
    }
    setForm(updated)
  }

  if (loading) return <Spinner />

  return (
    <div>
      <PageHeader
        title={t('Payments', 'പേയ്മെന്റ്')}
        subtitle={formatMonth(selectedMonth, lang)}
        action={
          <div className="flex gap-2">
            <Select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="w-36">
              {monthOptions.slice().reverse().map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </Select>
            <Button onClick={() => openModal()}>
              <Plus size={15} className="mr-1.5" />{t('Record', 'രേഖപ്പെടുത്തുക')}
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label={t('Collected', 'ശേഖരിച്ചത്')} value={formatCurrency(totalCollected)}
          sub={`of ${formatCurrency(expectedTotal)}`} valueClass="text-green-700" />
        <StatCard label={t('Paid', 'അടച്ചത്')} value={payments.length}
          sub={`of ${activeMembers.length} ${t('members', 'അംഗങ്ങൾ')}`} valueClass="text-green-700" />
        <StatCard label={t('Pending', 'കുടിശ്ശിക')} value={unpaidMembers.length}
          sub={t('members', 'അംഗങ്ങൾ')} valueClass="text-amber-700" />
        <StatCard
          label={t('Cash / Online', 'ക്യാഷ് / ഓൺലൈൻ')}
          value={`${payments.filter(p => p.method === 'cash').length} / ${payments.filter(p => p.method !== 'cash').length}`}
          valueClass="text-stone-700"
        />
      </div>

      {/* Pending members */}
      {unpaidMembers.length > 0 && (
        <Card className="mb-5 border-amber-100">
          <p className="text-xs font-medium text-amber-700 mb-2 flex items-center gap-1.5">
            <Clock size={13} />{t('Pending this month', 'ഈ മാസം കുടിശ്ശിക')}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {unpaidMembers.map(m => (
              <button key={m.id}
                onClick={() => openModal(m.id)}
                className="text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded-md px-2 py-1 hover:bg-amber-100 transition-colors">
                {m.id} · {lang === 'ml' ? m.name_ml || m.name : m.name}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Payments table */}
      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">
                {[
                  t('Member', 'അംഗം'), t('Amount', 'തുക'), t('Method', 'രീതി'),
                  t('Date', 'തീയതി'), t('Reference', 'റഫറൻസ്'), ''
                ].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left text-xs font-medium text-stone-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {payments.map(p => {
                const member = members.find(m => m.id === p.member_id)
                return member ? (
                  <tr key={p.id} className="hover:bg-stone-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-stone-900">{lang === 'ml' ? member.name_ml || member.name : member.name}</p>
                      <p className="text-xs text-stone-400">{member.id}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold text-green-700">{formatCurrency(p.amount)}</td>
                    <td className="px-4 py-3">
                      <Badge
                        text={p.method === 'cash' ? t('Cash', 'ക്യാഷ്') : p.method === 'online' ? t('Online', 'ഓൺലൈൻ') : t('Bank', 'ബാങ്ക്')}
                        variant={p.method as 'cash' | 'online' | 'bank'}
                      />
                    </td>
                    <td className="px-4 py-3 text-stone-500 text-xs">{formatDate(p.payment_date)}</td>
                    <td className="px-4 py-3 text-stone-400 text-xs">{p.reference_no || '—'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setConfirmDelete(p)}
                        className="p-1.5 rounded hover:bg-red-50 text-stone-300 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ) : null
              })}
            </tbody>
          </table>
          {payments.length === 0 && <EmptyState message={t('No payments recorded for this month', 'ഈ മാസം പേയ്മെന്റൊന്നും ഇല്ല')} />}
        </div>
      </Card>

      {/* Add payment modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={t('Record Payment', 'പേയ്മെന്റ് രേഖപ്പെടുത്തുക')}
      >
        <div className="space-y-4">
          <Select label={t('Member *', 'അംഗം *')}
            value={form.member_id} onChange={e => f('member_id', e.target.value)}>
            <option value="">{t('— Select Member —', '— അംഗം തിരഞ്ഞെടുക്കുക —')}</option>
            <optgroup label={t('⏳ Pending', '⏳ കുടിശ്ശിക')}>
              {unpaidMembers.map(m => (
                <option key={m.id} value={m.id}>{m.id} – {lang === 'ml' ? m.name_ml || m.name : m.name}</option>
              ))}
            </optgroup>
            <optgroup label={t('✓ Already Paid', '✓ ഇതിനകം അടച്ചത്')}>
              {activeMembers.filter(m => paidMemberIds.has(m.id)).map(m => (
                <option key={m.id} value={m.id}>{m.id} – {lang === 'ml' ? m.name_ml || m.name : m.name} ✓</option>
              ))}
            </optgroup>
          </Select>

          <div className="grid grid-cols-2 gap-3">
            <Input label={t('Amount (₹) *', 'തുക (₹) *')} type="number"
              value={form.amount} onChange={e => f('amount', Number(e.target.value))} />
            <Select label={t('Payment Method *', 'രീതി *')} value={form.method} onChange={e => f('method', e.target.value)}>
              <option value="cash">{t('Cash', 'ക്യാഷ്')}</option>
              <option value="online">{t('Online / UPI', 'ഓൺലൈൻ / UPI')}</option>
              <option value="bank">{t('Bank Transfer', 'ബാങ്ക് ട്രാൻസ്ഫർ')}</option>
            </Select>
            <Input label={t('Payment Date *', 'തീയതി *')} type="date"
              value={form.payment_date} onChange={e => f('payment_date', e.target.value)} />
            <Input label={t('Reference No.', 'റഫറൻസ് നം.')}
              placeholder="UPI ref, cheque no..."
              value={form.reference_no} onChange={e => f('reference_no', e.target.value)} />
          </div>
          <Input label={t('Notes (optional)', 'കുറിപ്പ്')}
            value={form.notes} onChange={e => f('notes', e.target.value)} />

          <div className="flex gap-2 pt-1">
            <Button onClick={handleSave} loading={saving} className="flex-1">
              {t('Save Payment', 'പേയ്മെന്റ് സേവ് ചെയ്യുക')}
            </Button>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              {t('Cancel', 'റദ്ദ്')}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        message={t('Delete this payment record? This cannot be undone.', 'ഈ പേയ്മെന്റ് ഇല്ലാതാക്കണോ?')}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}
