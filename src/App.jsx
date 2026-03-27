import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import Layout from './components/Layout.jsx'
import LoginPage from './pages/LoginPage.jsx'
import Dashboard from './pages/Dashboard.jsx'
import QueryBotPage from './pages/QueryBotPage.jsx'
import SchemaPage from './pages/SchemaPage.jsx'
import InsightsPage from './pages/InsightsPage.jsx'
import {
  ERDiagramPage,
  DictionaryPage,
  QualityPage,
  AgentsPage,
  ConnectionsPage,
  SettingsPage,
} from './pages/OtherPages.jsx'

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return <Layout>{children}</Layout>
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/connections" element={<ProtectedRoute><ConnectionsPage /></ProtectedRoute>} />
      <Route path="/schema" element={<ProtectedRoute><SchemaPage /></ProtectedRoute>} />
      <Route path="/er-diagram" element={<ProtectedRoute><ERDiagramPage /></ProtectedRoute>} />
      <Route path="/dictionary" element={<ProtectedRoute><DictionaryPage /></ProtectedRoute>} />
      <Route path="/quality" element={<ProtectedRoute><QualityPage /></ProtectedRoute>} />
      <Route path="/agents" element={<ProtectedRoute><AgentsPage /></ProtectedRoute>} />
      <Route path="/querybot" element={<ProtectedRoute><QueryBotPage /></ProtectedRoute>} />
      <Route path="/insights" element={<ProtectedRoute><InsightsPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
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
