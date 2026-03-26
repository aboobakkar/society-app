import { useState } from 'react'
import { useMembers, usePayments } from '@/hooks/useData'
import { useLang } from '@/hooks/useLang'
import { useAuth } from '@/hooks/useAuth'
import { Payment } from '@/types'
import { Button, Input, Select, Modal, Badge, PageHeader, Card, StatCard, Spinner, EmptyState, ConfirmDialog } from '@/components/ui'
import { formatCurrency, formatMonth, getCurrentMonth, getMonthOptions, formatDate } from '@/lib/utils'
import { Plus, Trash2, Clock } from 'lucide-react'

export default function PaymentsPage() {
  const { i18n, lang } = useLang()
  const { profile } = useAuth()
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
  const { members } = useMembers()
  const { payments, loading, addPayment, deletePayment } = usePayments(selectedMonth)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Payment | null>(null)
  const [form, setForm] = useState({ member_id: '', amount: 500, method: 'cash', payment_date: new Date().toISOString().slice(0, 10), reference_no: '', notes: '' })

  const activeMembers = members.filter(m => m.status === 'active')
  const paidMemberIds = new Set(payments.map(p => p.member_id))
  const unpaidMembers = activeMembers.filter(m => !paidMemberIds.has(m.id))
  const totalCollected = payments.reduce((s, p) => s + p.amount, 0)
  const expectedTotal = activeMembers.reduce((s, m) => s + m.monthly_amount, 0)
  const monthOptions = getMonthOptions(2023)

  const openModal = (memberId = '') => {
    const member = members.find(m => m.id === memberId)
    setForm({ member_id: memberId, amount: member?.monthly_amount || 500, method: 'cash', payment_date: new Date().toISOString().slice(0, 10), reference_no: '', notes: '' })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.member_id) return
    setSaving(true)
    try {
      const result = await addPayment({ ...form, recorded_by: profile?.id })
      if (result) setShowModal(false)
    } finally {
      setSaving(false)
    }
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
        title={i18n.payments}
        subtitle={formatMonth(selectedMonth, lang)}
        action={
          <div className="flex gap-2">
            <Select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="w-36">
              {monthOptions.slice().reverse().map(m => <option key={m} value={m}>{m}</option>)}
            </Select>
            <Button onClick={() => openModal()}><Plus size={15} className="mr-1.5" />{i18n.record}</Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label={i18n.collected} value={formatCurrency(totalCollected)} sub={`of ${formatCurrency(expectedTotal)}`} valueClass="text-green-700" />
        <StatCard label={i18n.paid} value={payments.length} sub={`of ${activeMembers.length} ${i18n.members}`} valueClass="text-green-700" />
        <StatCard label={i18n.pending} value={unpaidMembers.length} sub={i18n.members} valueClass="text-amber-700" />
        <StatCard label={i18n.cashOnline}
          value={`${payments.filter(p => p.method === 'cash').length} / ${payments.filter(p => p.method !== 'cash').length}`}
          valueClass="text-stone-700" />
      </div>

      {unpaidMembers.length > 0 && (
        <Card className="mb-5 border-amber-100">
          <p className="text-xs font-medium text-amber-700 mb-2 flex items-center gap-1.5">
            <Clock size={13} />{i18n.pendingThisMonth}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {unpaidMembers.map(m => (
              <button key={m.id} onClick={() => openModal(m.id)}
                className="text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded-md px-2 py-1 hover:bg-amber-100 transition-colors">
                {m.id} · {lang === 'ml' ? m.name_ml || m.name : m.name}
              </button>
            ))}
          </div>
        </Card>
      )}

      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">
                {[i18n.members, i18n.amount, i18n.paymentMethod, i18n.date, i18n.reference, ''].map((h, i) => (
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
                      <Badge text={p.method === 'cash' ? i18n.cash : p.method === 'online' ? i18n.online : i18n.bank}
                        variant={p.method as 'cash' | 'online' | 'bank'} />
                    </td>
                    <td className="px-4 py-3 text-stone-500 text-xs">{formatDate(p.payment_date)}</td>
                    <td className="px-4 py-3 text-stone-400 text-xs">{p.reference_no || '—'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setConfirmDelete(p)} className="p-1.5 rounded hover:bg-red-50 text-stone-300 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ) : null
              })}
            </tbody>
          </table>
          {payments.length === 0 && <EmptyState message={i18n.noPaymentsMonth} />}
        </div>
      </Card>

      <Modal open={showModal} onClose={() => { if (!saving) setShowModal(false) }} title={i18n.recordPayment}>
        <div className="space-y-4">
          <Select label={`${i18n.members} *`} value={form.member_id} onChange={e => f('member_id', e.target.value)}>
            <option value="">{i18n.selectMember}</option>
            <optgroup label={i18n.pendingGroup}>
              {unpaidMembers.map(m => <option key={m.id} value={m.id}>{m.id} – {lang === 'ml' ? m.name_ml || m.name : m.name}</option>)}
            </optgroup>
            <optgroup label={i18n.alreadyPaidGroup}>
              {activeMembers.filter(m => paidMemberIds.has(m.id)).map(m => <option key={m.id} value={m.id}>{m.id} – {lang === 'ml' ? m.name_ml || m.name : m.name} ✓</option>)}
            </optgroup>
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input label={`${i18n.amount} (₹) *`} type="number" value={form.amount} onChange={e => f('amount', Number(e.target.value))} />
            <Select label={i18n.paymentMethod} value={form.method} onChange={e => f('method', e.target.value)}>
              <option value="cash">{i18n.cash}</option>
              <option value="online">{i18n.online}</option>
              <option value="bank">{i18n.bank}</option>
            </Select>
            <Input label={i18n.paymentDate} type="date" value={form.payment_date} onChange={e => f('payment_date', e.target.value)} />
            <Input label={i18n.referenceNo} placeholder={i18n.referenceNoHint} value={form.reference_no} onChange={e => f('reference_no', e.target.value)} />
          </div>
          <Input label={i18n.notes} value={form.notes} onChange={e => f('notes', e.target.value)} />
          <div className="flex gap-2 pt-1">
            <Button onClick={handleSave} loading={saving} className="flex-1">{i18n.savePayment}</Button>
            <Button variant="secondary" onClick={() => { if (!saving) setShowModal(false) }}>{i18n.cancel}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirmDelete} message={i18n.deletePaymentConfirm}
        onConfirm={handleDelete} onCancel={() => setConfirmDelete(null)} />
    </div>
  )
}
