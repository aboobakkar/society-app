import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useLang } from '@/hooks/useLang'
import { supabase } from '@/lib/supabase'
import { Member, Payment } from '@/types'
import { Card, StatCard, Badge, Spinner } from '@/components/ui'
import { formatCurrency, formatDate, getMonthsInYear, formatMonth, isPastOrCurrentMonth, getCurrentMonth } from '@/lib/utils'
import { LogOut, Globe } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

const MONTHS_SHORT_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const MONTHS_SHORT_ML = ['ജന','ഫെബ','മാർ','ഏപ്','മേ','ജൂൺ','ജൂ','ഓഗ','സെ','ഒക്','നവ','ഡി']

export default function MemberPortal() {
  const { profile, signOut } = useAuth()
  const { t, lang, setLang } = useLang()
  const navigate = useNavigate()

  const [member, setMember] = useState<Member | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [payingMonth, setPayingMonth] = useState<string | null>(null)

  const currentYear = new Date().getFullYear().toString()
  const yearMonths = getMonthsInYear(currentYear)
  const pastMonths = yearMonths.filter(isPastOrCurrentMonth)

  useEffect(() => {
    if (!profile?.member_id) { setLoading(false); return }
    Promise.all([
      supabase.from('members').select('*').eq('id', profile.member_id).single(),
      supabase.from('payments').select('*').eq('member_id', profile.member_id).order('month', { ascending: false })
    ]).then(([{ data: m }, { data: p }]) => {
      if (m) setMember(m as Member)
      if (p) setPayments(p as Payment[])
      setLoading(false)
    })
  }, [profile?.member_id])

  const paidMonths = new Set(payments.map(p => p.month))
  const pendingMonths = pastMonths.filter(m => !paidMonths.has(m))
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0)

  const handleOnlinePayment = async (month: string) => {
    if (!member) return
    setPayingMonth(month)
    // In real implementation, integrate with Razorpay/PayU
    // For now, simulate a UPI deep link
    const upiId = 'masjidhidaya@upi' // Replace with actual UPI ID from settings
    const amount = member.monthly_amount
    const note = `Masjidul Hidaya - ${formatMonth(month, 'en')} - ${member.id}`
    const upiUrl = `upi://pay?pa=${upiId}&pn=Masjidul+Hidaya&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`

    // Open UPI app
    window.location.href = upiUrl

    // After 3 seconds, show confirmation toast (in real app, use payment webhook)
    setTimeout(() => {
      toast.success(t('Payment initiated. Contact admin to confirm.', 'പേയ്മെന്റ് ആരംഭിച്ചു. അഡ്മിനെ അറിയിക്കുക.'))
      setPayingMonth(null)
    }, 3000)
  }

  const handleSignOut = async () => { await signOut(); navigate('/login') }

  if (loading) return <Spinner />

  if (!member) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
        <Card className="text-center max-w-sm w-full">
          <p className="text-stone-600 mb-4">{t('Your account is not linked to a member. Contact admin.', 'നിങ്ങളുടെ അക്കൗണ്ട് ഒരു അംഗവുമായി ബന്ധിപ്പിച്ചിട്ടില്ല. അഡ്മിനെ ബന്ധപ്പെടുക.')}</p>
          <button onClick={handleSignOut} className="text-sm text-amber-700 underline">{t('Sign out', 'ലോഗ് ഔട്ട്')}</button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-100">
      {/* Header */}
      <div className="bg-stone-900 text-white px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">م</div>
          <div className="flex-1">
            <p className="text-sm font-semibold">Masjidul Hidaya</p>
            <p className="text-xs text-stone-400 font-malayalam">മസ്ജിദുൽ ഹിദായ</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setLang(lang === 'en' ? 'ml' : 'en')}
              className="text-stone-400 hover:text-white p-1 transition-colors">
              <Globe size={16} />
            </button>
            <button onClick={handleSignOut} className="text-stone-400 hover:text-white p-1 transition-colors">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Member card */}
        <Card>
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 text-lg font-bold flex-shrink-0">
              {member.name[0]}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-stone-900">{lang === 'ml' ? member.name_ml || member.name : member.name}</p>
              <p className="text-sm text-stone-500">{member.id} · {member.mobile}</p>
              <div className="mt-1.5 flex gap-2 flex-wrap">
                <Badge text={member.status === 'active' ? t('Active', 'സജീവം') : t('Inactive', 'നിഷ്ക്രിയം')} variant={member.status === 'active' ? 'success' : 'neutral'} />
                <Badge text={`${formatCurrency(member.monthly_amount)}/${t('month', 'മാസം')}`} variant="info" />
              </div>
            </div>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard label={t('Total Paid', 'ആകെ അടച്ചത്')} value={formatCurrency(totalPaid)} valueClass="text-green-700" />
          <StatCard label={t('Paid Months', 'അടച്ച മാസം')} value={paidMonths.size} valueClass="text-green-700" />
          <StatCard label={t('Pending', 'കുടിശ്ശിക')} value={pendingMonths.length} valueClass={pendingMonths.length > 0 ? 'text-amber-700' : 'text-green-700'} />
        </div>

        {/* Pending payments */}
        {pendingMonths.length > 0 && (
          <Card className="border-amber-100">
            <h2 className="text-sm font-semibold text-stone-800 mb-3">
              {t('Pending Payments', 'കുടിശ്ശിക പേയ്മെന്റ്')}
            </h2>
            <div className="space-y-2">
              {pendingMonths.map(month => (
                <div key={month} className="flex items-center justify-between p-3 bg-amber-50 border border-amber-100 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-stone-800">{formatMonth(month, lang)}</p>
                    <p className="text-xs text-amber-700">{formatCurrency(member.monthly_amount)}</p>
                  </div>
                  <button
                    onClick={() => handleOnlinePayment(month)}
                    disabled={payingMonth === month}
                    className="text-xs bg-amber-700 hover:bg-amber-800 text-white px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-60"
                  >
                    {payingMonth === month ? t('Opening...', 'തുറക്കുന്നു...') : t('Pay via UPI', 'UPI വഴി അടക്കുക')}
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-stone-400 mt-3">
              {t('Cash payments are recorded by the admin.', 'ക്യാഷ് പേയ്മെന്റ് അഡ്മിൻ രേഖപ്പെടുത്തും.')}
            </p>
          </Card>
        )}

        {/* Year grid */}
        <Card>
          <h2 className="text-sm font-semibold text-stone-800 mb-3">{currentYear} {t('Payment Status', 'പേയ്മെന്റ് സ്ഥിതി')}</h2>
          <div className="grid grid-cols-6 gap-1.5">
            {yearMonths.map((month, i) => {
              const paid = paidMonths.has(month)
              const past = isPastOrCurrentMonth(month)
              return (
                <div key={month} className={`
                  aspect-square rounded-lg flex flex-col items-center justify-center text-xs font-medium
                  ${!past ? 'bg-stone-50 text-stone-300'
                    : paid ? 'bg-green-100 text-green-700'
                    : 'bg-red-50 text-red-500'}
                `}>
                  <span>{lang === 'ml' ? MONTHS_SHORT_ML[i] : MONTHS_SHORT_EN[i]}</span>
                  <span className="text-base mt-0.5">{!past ? '·' : paid ? '✓' : '✗'}</span>
                </div>
              )
            })}
          </div>
        </Card>

        {/* Payment history */}
        <Card padding={false}>
          <div className="px-4 py-3 border-b border-stone-200">
            <h2 className="text-sm font-semibold text-stone-800">{t('Payment History', 'പേയ്മെന്റ് ചരിത്രം')}</h2>
          </div>
          <div className="divide-y divide-stone-100">
            {payments.slice(0, 12).map(p => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-stone-800">{formatMonth(p.month, lang)}</p>
                  <p className="text-xs text-stone-400">{formatDate(p.payment_date)} · {p.method}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-green-700">{formatCurrency(p.amount)}</p>
                  <Badge text={p.method === 'cash' ? t('Cash','ക്യാഷ്') : p.method === 'online' ? t('Online','ഓൺലൈൻ') : t('Bank','ബാങ്ക്')}
                    variant={p.method as 'cash' | 'online' | 'bank'} />
                </div>
              </div>
            ))}
            {payments.length === 0 && (
              <p className="text-sm text-stone-400 py-8 text-center">{t('No payment records found', 'പേയ്മെന്റ് ഒന്നും കണ്ടില്ല')}</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
