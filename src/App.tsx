import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { OrgProvider } from '@/contexts/OrgContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { LoadingSpinner } from '@/components/LoadingSpinner'

import Landing from '@/pages/Landing'
import LiveChat from '@/pages/LiveChat'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import ForgotPassword from '@/pages/ForgotPassword'
import ResetPassword from '@/pages/ResetPassword'
import NotFound from '@/pages/NotFound'

import Dashboard from '@/pages/dashboard/Dashboard'
import Chatbots from '@/pages/dashboard/Chatbots'
import ChatbotDetail from '@/pages/dashboard/ChatbotDetail'
import Conversations from '@/pages/dashboard/Conversations'
import Contacts from '@/pages/dashboard/Contacts'
import Appointments from '@/pages/dashboard/Appointments'
import KnowledgeBase from '@/pages/dashboard/KnowledgeBase'
import Settings from '@/pages/dashboard/Settings'
import Billing from '@/pages/dashboard/Billing'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

function AuthenticatedApp() {
  const { isLoading } = useAuth()

  if (isLoading) {
    return <LoadingSpinner full />
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/chat/:embedId" element={<LiveChat />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/chatbots"
        element={
          <ProtectedRoute>
            <Chatbots />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/chatbots/:id"
        element={
          <ProtectedRoute>
            <ChatbotDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/conversations"
        element={
          <ProtectedRoute>
            <Conversations />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/contacts"
        element={
          <ProtectedRoute>
            <Contacts />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/appointments"
        element={
          <ProtectedRoute>
            <Appointments />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/knowledge"
        element={
          <ProtectedRoute>
            <KnowledgeBase />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/billing"
        element={
          <ProtectedRoute>
            <Billing />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <OrgProvider>
            <AuthenticatedApp />
            <Toaster position="top-right" richColors />
          </OrgProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
