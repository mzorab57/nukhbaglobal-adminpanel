import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedLayout from './components/layout/ProtectedLayout'
import { canAccessDashboard, canAccessScanner, getDefaultRoute } from './lib/access'
import DashboardPage from './pages/DashboardPage'
import EventsPage from './pages/EventsPage'
import FeaturedContentPage from './pages/FeaturedContentPage'
import LoginPage from './pages/LoginPage'
import LocationsPage from './pages/LocationsPage'
import OfficeSalesPage from './pages/OfficeSalesPage'
import OrdersPage from './pages/OrdersPage'
import ScannerPage from './pages/ScannerPage'
import ScansPage from './pages/ScansPage'
import UsersManagementPage from './pages/UsersManagementPage'
import { AuthProvider, useAuth } from './lib/auth'

function PublicRoute({ children }) {
  const { isAuthenticated, user } = useAuth()

  if (isAuthenticated) {
    return <Navigate to={getDefaultRoute(user)} replace />
  }

  return children
}

function DashboardRoute({ children }) {
  const { isAuthenticated, user } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!canAccessDashboard(user)) {
    return <Navigate to={getDefaultRoute(user)} replace />
  }

  return children
}

function ScannerRoute({ children }) {
  const { isAuthenticated, user } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!canAccessScanner(user)) {
    return <Navigate to={getDefaultRoute(user)} replace />
  }

  return children
}

function AppRoutes() {
  const { isBootstrapping } = useAuth()

  if (isBootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#09090b] text-zinc-300">
        <div className="panel-surface panel-border rounded-[2rem] px-6 py-5 text-sm tracking-[0.2em]">
          Loading secure session...
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <DashboardRoute>
            <ProtectedLayout />
          </DashboardRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="locations" element={<LocationsPage />} />
        <Route path="office-sales" element={<OfficeSalesPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="scans" element={<ScansPage />} />
        <Route path="featured" element={<FeaturedContentPage />} />
        <Route path="users" element={<UsersManagementPage />} />
      </Route>
      <Route
        path="/scanner"
        element={
          <ScannerRoute>
            <ScannerPage />
          </ScannerRoute>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
