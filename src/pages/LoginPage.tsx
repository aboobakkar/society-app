import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useLang } from '@/hooks/useLang'
import { Button, Input } from '@/components/ui'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { signIn, profile } = useAuth()
  const { i18n } = useLang()
  const navigate = useNavigate()

  if (profile) {
    if (profile.role === 'superadmin' || profile.role === 'admin') navigate('/admin')
    else navigate('/member')
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) setError(error)
  }

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-amber-700 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">م</div>
          <h1 className="text-xl font-semibold text-stone-900">Masjidul Hidaya</h1>
          <p className="text-sm text-stone-500 mt-1 font-malayalam">മസ്ജിദുൽ ഹിദായ</p>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
          <h2 className="text-base font-semibold text-stone-800 mb-5">{i18n.signInToAccount}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label={i18n.email} type="email" placeholder="admin@masjidhidaya.com"
              value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
            <Input label={i18n.password} type="password" placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
            )}
            <Button type="submit" className="w-full" loading={loading} size="lg">{i18n.signIn}</Button>
          </form>
        </div>
        <p className="text-center text-xs text-stone-400 mt-4">{i18n.systemVersion}</p>
      </div>
    </div>
  )
}
