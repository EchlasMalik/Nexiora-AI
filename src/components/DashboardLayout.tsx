import { useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Plus,
  LayoutDashboard,
  MessageSquare,
  Users,
  Calendar,
  BookOpen,
  Settings as SettingsIcon,
  CreditCard,
  ChevronRight,
  Menu,
  X,
  LogOut,
  ExternalLink,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const navItems = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/dashboard/conversations', label: 'Conversations', icon: MessageSquare },
  { to: '/dashboard/contacts', label: 'Contacts', icon: Users },
  { to: '/dashboard/appointments', label: 'Appointments', icon: Calendar },
  { to: '/dashboard/knowledge', label: 'Knowledge Base', icon: BookOpen },
  { to: '/dashboard/settings', label: 'Settings', icon: SettingsIcon },
  { to: '/dashboard/billing', label: 'Billing', icon: CreditCard },
]

function isActivePath(pathname: string, to: string, end?: boolean) {
  return end ? pathname === to : pathname.startsWith(to)
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  const initials = (user?.name || user?.email || '?').slice(0, 1).toUpperCase()

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="px-5 py-5">
        <Logo subtitle="Workspace" />
      </div>

      <div className="px-3">
        <Link to="/dashboard/chatbots" onClick={onNavigate}>
          <Button className="w-full gap-1.5">
            <Plus className="size-4" />
            New Chatbot
          </Button>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const active = isActivePath(location.pathname, item.to, item.end)
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-violet-50 text-violet-700'
                  : 'text-brand-text-secondary hover:bg-slate-50 hover:text-brand-navy'
              )}
            >
              <item.icon className="size-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {active && <ChevronRight className="size-4 shrink-0" />}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <Avatar className="size-8">
            <AvatarFallback className="bg-violet-600 text-xs text-white">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-brand-navy">{user?.name}</p>
            <p className="truncate text-xs text-brand-text-secondary">{user?.email}</p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={handleLogout}
          className="mt-2 w-full justify-center gap-2 text-brand-text-secondary hover:text-brand-navy"
        >
          <LogOut className="size-4" />
          Log out
        </Button>
      </div>
    </div>
  )
}

export function DashboardLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-brand-light-bg">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            />
            <motion.aside
              key="drawer"
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', stiffness: 300, damping: 32 }}
              className="fixed inset-y-0 left-0 z-50 w-64 shadow-xl lg:hidden"
            >
              <div className="flex justify-end px-3 pt-3">
                <button
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close menu"
                  className="flex size-9 items-center justify-center rounded-full bg-slate-100 text-brand-navy active:bg-slate-200"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="h-[calc(100%-3rem)]">
                <SidebarContent onNavigate={() => setMobileOpen(false)} />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-white/80 px-4 backdrop-blur lg:px-8">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="flex size-9 items-center justify-center rounded-lg text-brand-navy hover:bg-slate-100 lg:hidden"
          >
            <Menu className="size-5" />
          </button>
          <div className="hidden lg:block" />
          <Link
            to="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm font-medium text-brand-text-secondary hover:text-violet-600"
          >
            View Site
            <ExternalLink className="size-3.5" />
          </Link>
        </header>

        <main className="px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  )
}
