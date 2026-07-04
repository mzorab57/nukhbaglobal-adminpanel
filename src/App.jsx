import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedLayout from './components/layout/ProtectedLayout'
import DashboardPage from './pages/DashboardPage'
import EventsPage from './pages/EventsPage'
import FeaturedContentPage from './pages/FeaturedContentPage'
import LoginPage from './pages/LoginPage'
import LocationsPage from './pages/LocationsPage'
import OrdersPage from './pages/OrdersPage'
import ScansPage from './pages/ScansPage'
import { AuthProvider, useAuth } from './lib/auth'

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

function PublicRoute({ children }) {
  const { isAuthenticated } = useAuth()

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
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
          <ProtectedRoute>
            <ProtectedLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="locations" element={<LocationsPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="scans" element={<ScansPage />} />
        <Route path="featured" element={<FeaturedContentPage />} />
      </Route>
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
