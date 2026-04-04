import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { LangProvider } from '@/hooks/useLang';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PWAInstallBanner } from '@/components/PWAInstallBanner';
import LoginPage from '@/pages/LoginPage';
import AdminDashboard from '@/pages/admin/Dashboard';
import MembersPage from '@/pages/admin/Members';
import PaymentsPage from '@/pages/admin/Payments';
import ExpensesPage from '@/pages/admin/Expenses';
import ReportsPage from '@/pages/admin/Reports';
import SettingsPage from '@/pages/admin/Settings';
import RentalIncomePage from '@/pages/admin/RentalIncome';
import AgentCollectionsPage from '@/pages/admin/AgentCollections';
import CashHoldingPage from '@/pages/admin/CashHolding';
import MemberPortal from '@/pages/member/MemberPortal';
import AgentApp from '@/pages/agent/AgentApp';
import { Spinner } from '@/components/ui';
import { ReactNode } from 'react';

function ProtectedAdmin({ children }: { children: ReactNode }) {
    const { profile, loading } = useAuth();
    if (loading)
        return (
            <div className='min-h-screen flex items-center justify-center bg-stone-100'>
                <Spinner />
            </div>
        );
    if (!profile) return <Navigate to='/login' replace />;
    if (profile.role === 'member') return <Navigate to='/member' replace />;
    if (profile.role === 'agent') return <Navigate to='/agent' replace />;
    return <>{children}</>;
}

function ProtectedAgent({ children }: { children: ReactNode }) {
    const { profile, loading } = useAuth();
    if (loading)
        return (
            <div className='min-h-screen flex items-center justify-center bg-stone-100'>
                <Spinner />
            </div>
        );
    if (!profile) return <Navigate to='/login' replace />;
    if (profile.role !== 'agent') return <Navigate to='/' replace />;
    return <>{children}</>;
}

function ProtectedMember({ children }: { children: ReactNode }) {
    const { profile, loading } = useAuth();
    if (loading)
        return (
            <div className='min-h-screen flex items-center justify-center bg-stone-100'>
                <Spinner />
            </div>
        );
    if (!profile) return <Navigate to='/login' replace />;
    return <>{children}</>;
}

function W({ children }: { children: ReactNode }) {
    return (
        <ProtectedAdmin>
            <AdminLayout>{children}</AdminLayout>
        </ProtectedAdmin>
    );
}

function AppRoutes() {
    const { profile, loading } = useAuth();
    if (loading)
        return (
            <div className='min-h-screen flex items-center justify-center bg-stone-100'>
                <Spinner />
            </div>
        );

    return (
        <Routes>
            <Route path='/login' element={<LoginPage />} />

            {/* Admin */}
            <Route
                path='/admin'
                element={
                    <W>
                        <AdminDashboard />
                    </W>
                }
            />
            <Route
                path='/admin/members'
                element={
                    <W>
                        <MembersPage />
                    </W>
                }
            />
            <Route
                path='/admin/payments'
                element={
                    <W>
                        <PaymentsPage />
                    </W>
                }
            />
            <Route
                path='/admin/expenses'
                element={
                    <W>
                        <ExpensesPage />
                    </W>
                }
            />
            <Route
                path='/admin/rental-income'
                element={
                    <W>
                        <RentalIncomePage />
                    </W>
                }
            />
            <Route
                path='/admin/agent-collections'
                element={
                    <W>
                        <AgentCollectionsPage />
                    </W>
                }
            />
            <Route
                path='/admin/cash-holding'
                element={
                    <W>
                        <CashHoldingPage />
                    </W>
                }
            />
            <Route
                path='/admin/reports'
                element={
                    <W>
                        <ReportsPage />
                    </W>
                }
            />
            <Route
                path='/admin/settings'
                element={
                    <W>
                        <SettingsPage />
                    </W>
                }
            />

            {/* Member portal */}
            <Route
                path='/member'
                element={
                    <ProtectedMember>
                        <MemberPortal />
                    </ProtectedMember>
                }
            />

            {/* Agent app */}
            <Route
                path='/agent'
                element={
                    <ProtectedAgent>
                        <AgentApp />
                    </ProtectedAgent>
                }
            />

            {/* Root redirect */}
            <Route
                path='/'
                element={
                    profile ? (
                        profile.role === 'member' ? (
                            <Navigate to='/member' replace />
                        ) : profile.role === 'agent' ? (
                            <Navigate to='/agent' replace />
                        ) : (
                            <Navigate to='/admin' replace />
                        )
                    ) : (
                        <Navigate to='/login' replace />
                    )
                }
            />
            <Route path='*' element={<Navigate to='/' replace />} />
        </Routes>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <LangProvider>
                <AuthProvider>
                    <AppRoutes />
                    <PWAInstallBanner />
                    <Toaster
                        position='top-right'
                        toastOptions={{
                            duration: 3000,
                            style: { fontSize: '13px', borderRadius: '10px' },
                        }}
                    />
                </AuthProvider>
            </LangProvider>
        </BrowserRouter>
    );
}
