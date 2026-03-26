import { useState, ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useLang } from '@/hooks/useLang';
import { useSettings } from '@/hooks/useData';
import {
    LayoutDashboard,
    Users,
    CreditCard,
    TrendingDown,
    BarChart3,
    Settings,
    LogOut,
    Menu,
    Globe,
} from 'lucide-react';

const NAV_ITEMS = [
    {
        to: '/admin',
        key: 'dashboard' as const,
        icon: LayoutDashboard,
        end: true,
    },
    { to: '/admin/members', key: 'members' as const, icon: Users },
    { to: '/admin/payments', key: 'payments' as const, icon: CreditCard },
    { to: '/admin/expenses', key: 'expenses' as const, icon: TrendingDown },
    { to: '/admin/reports', key: 'reports' as const, icon: BarChart3 },
    { to: '/admin/settings', key: 'settings' as const, icon: Settings },
];

export function AdminLayout({ children }: { children: ReactNode }) {
    const [open, setOpen] = useState(false);
    const { profile, signOut } = useAuth();
    const { lang, setLang, i18n } = useLang();
    const { settings } = useSettings();
    const navigate = useNavigate();

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    const societyName =
        lang === 'ml'
            ? settings?.society_name_ml
            : settings?.society_name || 'Society';

    return (
        <div className='flex min-h-screen bg-stone-100'>
            {open && (
                <div
                    className='fixed inset-0 bg-black/50 z-40 lg:hidden'
                    onClick={() => setOpen(false)}
                />
            )}

            <aside
                className={`fixed top-0 left-0 h-full z-50 bg-stone-900 flex flex-col transition-transform duration-200 w-64 ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:w-60`}
            >
                <div className='p-4 border-b border-stone-800'>
                    <div className='flex items-center gap-3'>
                        <div className='w-9 h-9 rounded-lg bg-amber-600 flex items-center justify-center text-white font-bold text-base flex-shrink-0'>
                            {(settings?.society_name || 'S')[0]}
                        </div>
                        <div className='overflow-hidden'>
                            <p className='text-white text-sm font-semibold truncate leading-tight'>
                                {societyName}
                            </p>
                            <p className='text-stone-400 text-xs'>
                                {i18n.adminPanel}
                            </p>
                        </div>
                    </div>
                </div>

                <nav className='flex-1 p-3 space-y-0.5 overflow-y-auto'>
                    {NAV_ITEMS.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            onClick={() => setOpen(false)}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive ? 'bg-amber-600 text-white' : 'text-stone-400 hover:text-white hover:bg-stone-800'}`
                            }
                        >
                            <item.icon size={16} className='flex-shrink-0' />
                            {i18n[item.key]}
                        </NavLink>
                    ))}
                </nav>

                <div className='p-3 border-t border-stone-800 space-y-2'>
                    <div className='flex gap-1.5 px-2 items-center'>
                        <Globe size={14} className='text-stone-500' />
                        {(['en', 'ml'] as const).map((l) => (
                            <button
                                key={l}
                                onClick={() => setLang(l)}
                                className={`text-xs px-2 py-0.5 rounded transition-colors ${lang === l ? 'bg-amber-600 text-white' : 'text-stone-400 hover:text-white'}`}
                            >
                                {l === 'en' ? 'EN' : 'മ'}
                            </button>
                        ))}
                    </div>
                    <div className='flex items-center gap-2 px-2'>
                        <div className='w-8 h-8 rounded-full bg-stone-700 flex items-center justify-center text-stone-300 text-xs font-medium flex-shrink-0'>
                            {(profile?.full_name ||
                                profile?.email ||
                                'A')[0].toUpperCase()}
                        </div>
                        <div className='flex-1 overflow-hidden'>
                            <p className='text-white text-xs font-medium truncate'>
                                {profile?.full_name || profile?.email}
                            </p>
                            <p className='text-stone-500 text-xs capitalize'>
                                {profile?.role}
                            </p>
                        </div>
                        <button
                            onClick={handleSignOut}
                            title={i18n.signOut}
                            className='text-stone-500 hover:text-red-400 transition-colors p-1'
                        >
                            <LogOut size={14} />
                        </button>
                    </div>
                </div>
            </aside>

            <div className='flex-1 flex flex-col min-w-0'>
                <header className='lg:hidden bg-white border-b border-stone-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-30'>
                    <button
                        onClick={() => setOpen(true)}
                        className='text-stone-600'
                    >
                        <Menu size={22} />
                    </button>
                    <p className='text-sm font-semibold text-stone-900 flex-1 truncate'>
                        {societyName}
                    </p>
                </header>
                <main className='flex-1 p-4 md:p-6 max-w-screen-xl'>
                    {children}
                </main>
            </div>
        </div>
    );
}
