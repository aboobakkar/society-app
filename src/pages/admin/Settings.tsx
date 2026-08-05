import { useState, useEffect, FormEvent } from 'react'
import { useSettings } from '@/hooks/useData'
import { useLang } from '@/hooks/useLang'
import { useAuth } from '@/hooks/useAuth'
import { supabase, createEphemeralClient } from '@/lib/supabase'
import { Button, Input, Card, PageHeader, Spinner } from '@/components/ui'
import { Users, Settings2, Lock, UserPlus, Trash2, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { HoldingPersonsEditor } from './HoldingPersonsEditor'

type SettingsTab = 'society' | 'agents' | 'security'

interface AgentProfile {
  id: string
  email: string
  full_name: string | null
  role: string
  created_at: string
}

// ——————————————————————————————————————————
// Agents sub-panel
// ——————————————————————————————————————————
function AgentsPanel() {
  const [agents, setAgents] = useState<AgentProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ full_name: '', email: '', password: '' })
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const fetchAgents = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, created_at')
      .eq('role', 'agent')
      .order('created_at', { ascending: false })
    if (error) toast.error(error.message)
    else setAgents(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchAgents() }, [])

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.email || !form.password) { toast.error('Email and password are required'); return }
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return }
    setCreating(true)
    try {
      // Create auth user via Supabase admin API is not available client-side,
      // so we use signUp which auto-creates a profile (role defaults to 'member'), then promote.
      // signUp() replaces the *current* session on whatever client runs it, so we use a
      // throwaway client here to avoid logging the admin out and into the new agent account.
      const signupClient = createEphemeralClient()
      const { data: authData, error: signUpErr } = await signupClient.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { full_name: form.full_name || form.email } }
      })
      if (signUpErr || !authData.user) {
        toast.error(signUpErr?.message || 'Failed to create user')
        return
      }
      // Promote to agent — runs on the admin's still-active session (the `supabase` client),
      // which is what's authorized to change another profile's role.
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ role: 'agent', full_name: form.full_name || null })
        .eq('id', authData.user.id)
      if (updateErr) {
        toast.error('User created but role update failed: ' + updateErr.message)
      } else {
        toast.success('Agent account created successfully!')
        setForm({ full_name: '', email: '', password: '' })
        setShowForm(false)
        await fetchAgents()
      }
    } catch (e: any) {
      toast.error(e?.message || 'Unexpected error')
    } finally {
      setCreating(false)
    }
  }

  const handleRemove = async (id: string, email: string) => {
    if (!confirm(`Remove agent access for ${email}? They will be demoted to 'member' role.`)) return
    const { error } = await supabase.from('profiles').update({ role: 'member' }).eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Agent access removed'); fetchAgents() }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-stone-500">Manage agent accounts — agents can record payments on mobile.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchAgents} className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors">
            <RefreshCw size={15} />
          </button>
          <Button size="sm" onClick={() => setShowForm(s => !s)}>
            <UserPlus size={14} className="mr-1.5" />
            New Agent
          </Button>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card className="border-indigo-100 bg-indigo-50/30">
          <h3 className="text-sm font-semibold text-stone-800 mb-4">Create Agent Account</h3>
          <form onSubmit={handleCreate} className="space-y-3">
            <Input
              label="Full Name"
              value={form.full_name}
              onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
              placeholder="Agent name"
            />
            <Input
              label="Email *"
              type="email"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              placeholder="agent@example.com"
              required
            />
            <Input
              label="Password *"
              type="password"
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              placeholder="Min. 8 characters"
              hint="Share this with the agent so they can log in at /agent"
              required
            />
            <div className="flex gap-2 pt-1">
              <Button type="submit" loading={creating}>Create Agent</Button>
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Agent List */}
      {loading ? (
        <Spinner />
      ) : agents.length === 0 ? (
        <div className="text-center py-10 text-stone-400 text-sm border border-dashed border-stone-200 rounded-xl">
          No agents yet. Click "New Agent" to create one.
        </div>
      ) : (
        <div className="space-y-2">
          {agents.map(agent => (
            <div key={agent.id} className="flex items-center gap-3 p-3.5 bg-white border border-stone-200 rounded-xl">
              <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm flex-shrink-0">
                {(agent.full_name || agent.email)[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-900">{agent.full_name || '–'}</p>
                <p className="text-xs text-stone-400 truncate">{agent.email}</p>
              </div>
              <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full font-medium">agent</span>
              <button
                onClick={() => handleRemove(agent.id, agent.email)}
                className="p-1.5 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Remove agent access"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* PWA Share Tip */}
      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
        <p className="text-xs font-semibold text-amber-800 mb-1">How agents access the app</p>
        <p className="text-xs text-amber-700">
          Share the app URL with agents via WhatsApp. On mobile, they can tap
          <strong> "Add to Home Screen"</strong> to install it as a PWA (no app store needed).
          They log in with the credentials you create above and are automatically directed to the agent dashboard.
        </p>
      </div>
    </div>
  )
}

// ——————————————————————————————————————————
// Main Settings Page
// ——————————————————————————————————————————
export default function SettingsPage() {
  const { i18n, lang, setLang } = useLang()
  const { isSuperAdmin } = useAuth()
  const { settings, loading, updateSettings } = useSettings()
  const [activeTab, setActiveTab] = useState<SettingsTab>('society')
  const [form, setForm] = useState({
    society_name: '', society_name_ml: '', default_monthly_amount: 500,
    current_fiscal_year: '2025', address: '', phone: ''
  })
  const [saving, setSaving] = useState(false)
  const [pwForm, setPwForm] = useState({ newPw: '', confirm: '' })
  const [pwSaving, setPwSaving] = useState(false)

  useEffect(() => {
    if (settings) setForm({
      society_name: settings.society_name || '',
      society_name_ml: settings.society_name_ml || '',
      default_monthly_amount: settings.default_monthly_amount || 500,
      current_fiscal_year: settings.current_fiscal_year || '2025',
      address: settings.address || '',
      phone: settings.phone || ''
    })
  }, [settings])

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try { await updateSettings(form) }
    catch (e: any) { toast.error(e?.message || 'Unexpected error') }
    finally { setSaving(false) }
  }

  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault()
    if (pwForm.newPw !== pwForm.confirm) { toast.error(i18n.passwordMismatch); return }
    if (pwForm.newPw.length < 8) { toast.error(i18n.passwordTooShort); return }
    setPwSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: pwForm.newPw })
      if (error) toast.error(error.message)
      else { toast.success(i18n.passwordUpdated); setPwForm({ newPw: '', confirm: '' }) }
    } catch (e: any) { toast.error(e?.message || 'Unexpected error') }
    finally { setPwSaving(false) }
  }

  if (loading) return <Spinner />

  const TABS: { id: SettingsTab; label: string; icon: typeof Settings2 }[] = [
    { id: 'society', label: 'Society', icon: Settings2 },
    { id: 'agents', label: 'Agents', icon: Users },
    { id: 'security', label: 'Security', icon: Lock },
  ]

  return (
    <div className="max-w-2xl">
      <PageHeader title={i18n.settings} />

      {/* Tab Bar */}
      <div className="flex gap-1 mb-5 bg-stone-100 p-1 rounded-xl">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all
              ${activeTab === id ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Society Tab */}
      {activeTab === 'society' && (
        <>
          <Card className="mb-5">
            <h2 className="text-sm font-semibold text-stone-800 mb-4">{i18n.societyInformation}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <Input label={i18n.societyNameEn} value={form.society_name} onChange={e => setForm(p => ({ ...p, society_name: e.target.value }))} />
              <Input label={i18n.societyNameMl} value={form.society_name_ml} onChange={e => setForm(p => ({ ...p, society_name_ml: e.target.value }))} className="font-malayalam" />
              <div className="grid grid-cols-2 gap-3">
                <Input label={i18n.defaultMonthlyAmount} type="number" value={form.default_monthly_amount || ''} onChange={e => setForm(p => ({ ...p, default_monthly_amount: Number(e.target.value) }))} />
                <Input label={i18n.currentFiscalYear} value={form.current_fiscal_year} onChange={e => setForm(p => ({ ...p, current_fiscal_year: e.target.value }))} />
              </div>
              <Input label={i18n.address} value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
              <Input label={i18n.phone} type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
              <Button type="submit" loading={saving}>{i18n.saveSettings}</Button>
            </form>
          </Card>

          <Card>
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
        </>
      )}

      {/* Agents Tab */}
      {activeTab === 'agents' && (
        <>
          <Card className="mb-4">
            <AgentsPanel />
          </Card>
          <Card>
            <h2 className="text-sm font-semibold text-stone-800 mb-1">Cash Holding Persons</h2>
            <p className="text-xs text-stone-400 mb-4">
              Agents select who they hand cash to when recording cash payments on mobile.
            </p>
            <HoldingPersonsEditor />
          </Card>
        </>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <Card>
          <h2 className="text-sm font-semibold text-stone-800 mb-4">{i18n.changePassword}</h2>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <Input label={i18n.newPassword} type="password" value={pwForm.newPw} onChange={e => setPwForm(p => ({ ...p, newPw: e.target.value }))} hint={i18n.passwordHint} />
            <Input label={i18n.confirmNewPassword} type="password" value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} />
            <Button type="submit" loading={pwSaving} variant="secondary">{i18n.updatePassword}</Button>
          </form>
        </Card>
      )}
    </div>
  )
}