import { useState, useEffect, FormEvent } from 'react'
import { useSettings } from '@/hooks/useData'
import { useLang } from '@/hooks/useLang'
import { supabase } from '@/lib/supabase'
import { Button, Input, Card, PageHeader, Spinner } from '@/components/ui'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const { t, lang, setLang } = useLang()
  const { settings, loading, updateSettings } = useSettings()
  const [form, setForm] = useState({
    society_name: '', society_name_ml: '',
    default_monthly_amount: 500,
    current_fiscal_year: '2025',
    address: '', phone: ''
  })
  const [saving, setSaving] = useState(false)

  // Admin password change
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' })
  const [pwSaving, setPwSaving] = useState(false)

  useEffect(() => {
    if (settings) {
      setForm({
        society_name: settings.society_name || '',
        society_name_ml: settings.society_name_ml || '',
        default_monthly_amount: settings.default_monthly_amount || 500,
        current_fiscal_year: settings.current_fiscal_year || '2025',
        address: settings.address || '',
        phone: settings.phone || '',
      })
    }
  }, [settings])

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await updateSettings(form)
    setSaving(false)
  }

  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault()
    if (pwForm.newPw !== pwForm.confirm) { toast.error('Passwords do not match'); return }
    if (pwForm.newPw.length < 8) { toast.error('Password must be at least 8 characters'); return }
    setPwSaving(true)
    const { error } = await supabase.auth.updateUser({ password: pwForm.newPw })
    setPwSaving(false)
    if (error) toast.error(error.message)
    else { toast.success('Password updated'); setPwForm({ current: '', newPw: '', confirm: '' }) }
  }

  if (loading) return <Spinner />

  return (
    <div className="max-w-2xl">
      <PageHeader title={t('Settings', 'ക്രമീകരണം')} />

      {/* Society Info */}
      <Card className="mb-5">
        <h2 className="text-sm font-semibold text-stone-800 mb-4">{t('Society Information', 'സൊസൈറ്റി വിവരം')}</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <Input label={t('Society Name (English)', 'സൊസൈറ്റി പേര് (English)')}
            value={form.society_name}
            onChange={e => setForm(p => ({ ...p, society_name: e.target.value }))} />
          <Input label={t('Society Name (Malayalam)', 'സൊസൈറ്റി പേര് (Malayalam)')}
            value={form.society_name_ml}
            onChange={e => setForm(p => ({ ...p, society_name_ml: e.target.value }))}
            className="font-malayalam" />
          <div className="grid grid-cols-2 gap-3">
            <Input label={t('Default Monthly Amount (₹)', 'ഡിഫോൾട്ട് മാസ തുക (₹)')} type="number"
              value={form.default_monthly_amount}
              onChange={e => setForm(p => ({ ...p, default_monthly_amount: Number(e.target.value) }))} />
            <Input label={t('Current Fiscal Year', 'നിലവിലെ സാമ്പത്തിക വർഷം')}
              value={form.current_fiscal_year}
              onChange={e => setForm(p => ({ ...p, current_fiscal_year: e.target.value }))} />
          </div>
          <Input label={t('Address', 'വിലാസം')}
            value={form.address}
            onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
          <Input label={t('Phone', 'ഫോൺ')} type="tel"
            value={form.phone}
            onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
          <Button type="submit" loading={saving}>{t('Save Settings', 'ക്രമീകരണം സേവ് ചെയ്യുക')}</Button>
        </form>
      </Card>

      {/* Language */}
      <Card className="mb-5">
        <h2 className="text-sm font-semibold text-stone-800 mb-4">{t('Language', 'ഭാഷ')}</h2>
        <div className="flex gap-3">
          {([['en', 'English'], ['ml', 'മലയാളം']] as const).map(([code, label]) => (
            <button key={code} onClick={() => setLang(code)}
              className={`px-5 py-2.5 rounded-lg text-sm border transition-all ${
                lang === code
                  ? 'bg-amber-700 text-white border-amber-700'
                  : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </Card>

      {/* Password */}
      <Card>
        <h2 className="text-sm font-semibold text-stone-800 mb-4">{t('Change Password', 'പാസ്‌വേഡ് മാറ്റുക')}</h2>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <Input label={t('New Password', 'പുതിയ പാസ്‌വേഡ്')} type="password"
            value={pwForm.newPw} onChange={e => setPwForm(p => ({ ...p, newPw: e.target.value }))}
            hint={t('At least 8 characters', 'കുറഞ്ഞത് 8 അക്ഷരങ്ങൾ')} />
          <Input label={t('Confirm New Password', 'പാസ്‌വേഡ് സ്ഥിരീകരിക്കുക')} type="password"
            value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} />
          <Button type="submit" loading={pwSaving} variant="secondary">
            {t('Update Password', 'പാസ്‌വേഡ് അപ്ഡേറ്റ് ചെയ്യുക')}
          </Button>
        </form>
      </Card>
    </div>
  )
}
