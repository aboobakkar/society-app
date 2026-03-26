import { useState, useEffect, FormEvent } from 'react'
import { useSettings } from '@/hooks/useData'
import { useLang } from '@/hooks/useLang'
import { supabase } from '@/lib/supabase'
import { Button, Input, Card, PageHeader, Spinner } from '@/components/ui'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const { i18n, lang, setLang } = useLang()
  const { settings, loading, updateSettings } = useSettings()
  const [form, setForm] = useState({ society_name: '', society_name_ml: '', default_monthly_amount: 500, current_fiscal_year: '2025', address: '', phone: '' })
  const [saving, setSaving] = useState(false)
  const [pwForm, setPwForm] = useState({ newPw: '', confirm: '' })
  const [pwSaving, setPwSaving] = useState(false)

  useEffect(() => {
    if (settings) setForm({ society_name: settings.society_name || '', society_name_ml: settings.society_name_ml || '', default_monthly_amount: settings.default_monthly_amount || 500, current_fiscal_year: settings.current_fiscal_year || '2025', address: settings.address || '', phone: settings.phone || '' })
  }, [settings])

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await updateSettings(form)
    setSaving(false)
  }

  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault()
    if (pwForm.newPw !== pwForm.confirm) { toast.error(i18n.passwordMismatch); return }
    if (pwForm.newPw.length < 8) { toast.error(i18n.passwordTooShort); return }
    setPwSaving(true)
    const { error } = await supabase.auth.updateUser({ password: pwForm.newPw })
    setPwSaving(false)
    if (error) toast.error(error.message)
    else { toast.success(i18n.passwordUpdated); setPwForm({ newPw: '', confirm: '' }) }
  }

  if (loading) return <Spinner />

  return (
    <div className="max-w-2xl">
      <PageHeader title={i18n.settings} />

      <Card className="mb-5">
        <h2 className="text-sm font-semibold text-stone-800 mb-4">{i18n.societyInformation}</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <Input label={i18n.societyNameEn} value={form.society_name} onChange={e => setForm(p => ({ ...p, society_name: e.target.value }))} />
          <Input label={i18n.societyNameMl} value={form.society_name_ml} onChange={e => setForm(p => ({ ...p, society_name_ml: e.target.value }))} className="font-malayalam" />
          <div className="grid grid-cols-2 gap-3">
            <Input label={i18n.defaultMonthlyAmount} type="number" value={form.default_monthly_amount} onChange={e => setForm(p => ({ ...p, default_monthly_amount: Number(e.target.value) }))} />
            <Input label={i18n.currentFiscalYear} value={form.current_fiscal_year} onChange={e => setForm(p => ({ ...p, current_fiscal_year: e.target.value }))} />
          </div>
          <Input label={i18n.address} value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
          <Input label={i18n.phone} type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
          <Button type="submit" loading={saving}>{i18n.saveSettings}</Button>
        </form>
      </Card>

      <Card className="mb-5">
        <h2 className="text-sm font-semibold text-stone-800 mb-4">{i18n.language}</h2>
        <div className="flex gap-3">
          {(['en', 'ml'] as const).map(code => (
            <button key={code} onClick={() => setLang(code)}
              className={`px-5 py-2.5 rounded-lg text-sm border transition-all ${lang === code ? 'bg-amber-700 text-white border-amber-700' : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'}`}>
              {code === 'en' ? 'English' : 'മലയാളം'}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-stone-800 mb-4">{i18n.changePassword}</h2>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <Input label={i18n.newPassword} type="password" value={pwForm.newPw} onChange={e => setPwForm(p => ({ ...p, newPw: e.target.value }))} hint={i18n.passwordHint} />
          <Input label={i18n.confirmNewPassword} type="password" value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} />
          <Button type="submit" loading={pwSaving} variant="secondary">{i18n.updatePassword}</Button>
        </form>
      </Card>
    </div>
  )
}
