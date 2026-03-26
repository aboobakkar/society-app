import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import { LangProvider } from '@/hooks/useLang'
import { AdminLayout } from '@/components/layout/AdminLayout'
import LoginPage from '@/pages/LoginPage'
import AdminDashboard from '@/pages/admin/Dashboard'
import MembersPage from '@/pages/admin/Members'
import PaymentsPage from '@/pages/admin/Payments'
import ExpensesPage from '@/pages/admin/Expenses'
import ReportsPage from '@/pages/admin/Reports'
import SettingsPage from '@/pages/admin/Settings'
import MemberPortal from '@/pages/member/MemberPortal'
import { Spinner } from '@/components/ui'

function ProtectedAdmin({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>
  if (!profile) return <Navigate to="/login" replace />
  if (profile.role === 'member') return <Navigate to="/member" replace />
  return <>{children}</>
}

function ProtectedMember({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>
  if (!profile) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppRoutes() {
  const { profile, loading } = useAuth()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-stone-100">
      <Spinner />
    </div>
  )

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Admin routes */}
      <Route path="/admin" element={
        <ProtectedAdmin>
          <AdminLayout><AdminDashboard /></AdminLayout>
        </ProtectedAdmin>
      } />
      <Route path="/admin/members" element={
        <ProtectedAdmin><AdminLayout><MembersPage /></AdminLayout></ProtectedAdmin>
      } />
      <Route path="/admin/payments" element={
        <ProtectedAdmin><AdminLayout><PaymentsPage /></AdminLayout></ProtectedAdmin>
      } />
      <Route path="/admin/expenses" element={
        <ProtectedAdmin><AdminLayout><ExpensesPage /></AdminLayout></ProtectedAdmin>
      } />
      <Route path="/admin/reports" element={
        <ProtectedAdmin><AdminLayout><ReportsPage /></AdminLayout></ProtectedAdmin>
      } />
      <Route path="/admin/settings" element={
        <ProtectedAdmin><AdminLayout><SettingsPage /></AdminLayout></ProtectedAdmin>
      } />

      {/* Member portal */}
      <Route path="/member" element={
        <ProtectedMember><MemberPortal /></ProtectedMember>
      } />

      {/* Default redirect */}
      <Route path="/" element={
        profile
          ? profile.role === 'member'
            ? <Navigate to="/member" replace />
            : <Navigate to="/admin" replace />
          : <Navigate to="/login" replace />
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <LangProvider>
        <AuthProvider>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: { fontSize: '13px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }
            }}
          />
        </AuthProvider>
      </LangProvider>
    </BrowserRouter>
  )
}
