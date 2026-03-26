import { useState } from 'react'
import { useExpenses } from '@/hooks/useData'
import { useLang } from '@/hooks/useLang'
import { useAuth } from '@/hooks/useAuth'
import { Expense, ExpenseCategory } from '@/types'
import {
  Button, Input, Select, Modal, Badge, PageHeader,
  Card, StatCard, Spinner, EmptyState, ConfirmDialog
} from '@/components/ui'
import { formatCurrency, formatDate, getCurrentMonth, getMonthOptions } from '@/lib/utils'
import { Plus, Trash2 } from 'lucide-react'

const CATEGORIES: { value: ExpenseCategory; label: string; labelMl: string }[] = [
  { value: 'salary', label: 'Salary', labelMl: 'ശമ്പളം' },
  { value: 'utility', label: 'Utility Bill', labelMl: 'യൂട്ടിലിറ്റി ബിൽ' },
  { value: 'maintenance', label: 'Maintenance', labelMl: 'അറ്റകുറ്റം' },
  { value: 'event', label: 'Event / Program', labelMl: 'പരിപാടി' },
  { value: 'other', label: 'Other', labelMl: 'മറ്റ്' },
]

const CAT_BADGE: Record<ExpenseCategory, 'info' | 'warning' | 'success' | 'danger' | 'neutral'> = {
  salary: 'info', utility: 'warning', maintenance: 'success', event: 'danger', other: 'neutral'
}

export default function ExpensesPage() {
  const { t, lang } = useLang()
  const { profile } = useAuth()
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
  const { expenses, loading, addExpense, deleteExpense } = useExpenses(selectedMonth)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Expense | null>(null)
  const [form, setForm] = useState({
    category: 'salary' as ExpenseCategory,
    description: '', amount: 0,
    expense_date: new Date().toISOString().slice(0, 10),
    paid_to: '', reference_no: '', notes: ''
  })

  const monthOptions = getMonthOptions(2023)

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const byCat = CATEGORIES.map(c => ({
    ...c,
    total: expenses.filter(e => e.category === c.value).reduce((s, e) => s + e.amount, 0)
  }))

  const handleSave = async () => {
    if (!form.description.trim() || !form.amount) return
    setSaving(true)
    await addExpense({ ...form, amount: Number(form.amount), recorded_by: profile?.id })
    setSaving(false)
    setShowModal(false)
    setForm({ category: 'salary', description: '', amount: 0, expense_date: new Date().toISOString().slice(0, 10), paid_to: '', reference_no: '', notes: '' })
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    await deleteExpense(confirmDelete.id)
    setConfirmDelete(null)
  }

  const f = (k: string, v: string | number) => setForm(prev => ({ ...prev, [k]: v }))

  if (loading) return <Spinner />

  return (
    <div>
      <PageHeader
        title={t('Expenses', 'ചെലവ് രേഖകൾ')}
        subtitle={t(`${expenses.length} records`, `${expenses.length} രേഖകൾ`)}
        action={
          <div className="flex gap-2">
            <Select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="w-36">
              {monthOptions.slice().reverse().map(m => <option key={m} value={m}>{m}</option>)}
            </Select>
            <Button onClick={() => setShowModal(true)}>
              <Plus size={15} className="mr-1.5" />{t('Add Expense', 'ചെലവ് ചേർക്കുക')}
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
        <StatCard label={t('Total', 'ആകെ')} value={formatCurrency(totalExpenses)} valueClass="text-red-700" />
        {byCat.filter(c => c.total > 0).map(c => (
          <StatCard key={c.value}
            label={lang === 'ml' ? c.labelMl : c.label}
            value={formatCurrency(c.total)}
            valueClass="text-stone-700"
          />
        ))}
      </div>

      {/* Table */}
      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">
                {[
                  t('Description', 'വിവരണം'), t('Category', 'വിഭാഗം'),
                  t('Paid To', 'നൽകിയത്'), t('Date', 'തീയതി'),
                  t('Amount', 'തുക'), ''
                ].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left text-xs font-medium text-stone-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {expenses.map(e => {
                const cat = CATEGORIES.find(c => c.value === e.category)
                return (
                  <tr key={e.id} className="hover:bg-stone-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-stone-900">{e.description}</p>
                      {e.notes && <p className="text-xs text-stone-400">{e.notes}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        text={lang === 'ml' ? cat?.labelMl || e.category : cat?.label || e.category}
                        variant={CAT_BADGE[e.category]}
                      />
                    </td>
                    <td className="px-4 py-3 text-stone-500">{e.paid_to || '—'}</td>
                    <td className="px-4 py-3 text-stone-500 text-xs">{formatDate(e.expense_date)}</td>
                    <td className="px-4 py-3 font-semibold text-red-600">{formatCurrency(e.amount)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setConfirmDelete(e)}
                        className="p-1.5 rounded hover:bg-red-50 text-stone-300 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {expenses.length === 0 && <EmptyState message={t('No expenses recorded for this month', 'ഈ മാസം ചെലവൊന്നും ഇല്ല')} />}
        </div>
      </Card>

      {/* Add Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={t('Add Expense', 'ചെലവ് ചേർക്കുക')}>
        <div className="space-y-4">
          <Select label={t('Category *', 'വിഭാഗം *')} value={form.category} onChange={e => f('category', e.target.value)}>
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{lang === 'ml' ? c.labelMl : c.label}</option>
            ))}
          </Select>
          <Input label={t('Description *', 'വിവരണം *')}
            placeholder={t('e.g. Imam salary – March 2025', 'ഉദാ: ഇമാം ശമ്പളം – മാർച്ച് 2025')}
            value={form.description} onChange={e => f('description', e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input label={t('Amount (₹) *', 'തുക (₹) *')} type="number"
              value={form.amount || ''} onChange={e => f('amount', e.target.value)} />
            <Input label={t('Date *', 'തീയതി *')} type="date"
              value={form.expense_date} onChange={e => f('expense_date', e.target.value)} />
            <Input label={t('Paid To', 'നൽകിയത്')}
              placeholder={t('Person / Company', 'ആൾ / കമ്പനി')}
              value={form.paid_to} onChange={e => f('paid_to', e.target.value)} />
            <Input label={t('Reference No.', 'റഫറൻസ്')}
              value={form.reference_no} onChange={e => f('reference_no', e.target.value)} />
          </div>
          <Input label={t('Notes (optional)', 'കുറിപ്പ്')}
            value={form.notes} onChange={e => f('notes', e.target.value)} />
          <div className="flex gap-2 pt-1">
            <Button onClick={handleSave} loading={saving} className="flex-1">
              {t('Save Expense', 'ചെലവ് സേവ് ചെയ്യുക')}
            </Button>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              {t('Cancel', 'റദ്ദ്')}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        message={t('Delete this expense? This cannot be undone.', 'ഈ ചെലവ് ഇല്ലാതാക്കണോ?')}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}
