import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { HomeTab } from './tabs/HomeTab'
import { DueTab } from './tabs/DueTab'
import { SearchTab } from './tabs/SearchTab'
import { Home, AlertCircle, Search, LogOut } from 'lucide-react'

type Tab = 'home' | 'due' | 'search'

const TABS: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'due', label: 'Due', icon: AlertCircle },
  { id: 'search', label: 'Search', icon: Search },
]

export default function AgentApp() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>('due')

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col max-w-lg mx-auto">
      {/* Top Header */}
      <header className="bg-indigo-700 text-white px-4 pt-safe-top">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-2.5">
            {/* Logo */}
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-sm font-bold">
              SC
            </div>
            <div>
              <p className="text-sm font-bold leading-tight">Collection Agent</p>
              <p className="text-xs text-indigo-200 leading-tight">{profile?.full_name || profile?.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-indigo-200 hover:text-white text-xs px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>

        {/* Tab Bar (top, themed) */}
        <div className="flex gap-1 pb-3">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all
                ${activeTab === id
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-indigo-200 hover:text-white hover:bg-white/10'
                }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* Page Content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'home' && <HomeTab />}
        {activeTab === 'due' && <DueTab />}
        {activeTab === 'search' && <SearchTab />}
      </main>
    </div>
  )
}
