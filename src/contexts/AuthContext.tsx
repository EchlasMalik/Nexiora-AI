import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export interface AuthUser {
  id: string
  name: string
  email: string
  company_name: string
  created_date: string
}

interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<AuthUser>
  register: (input: {
    name: string
    email: string
    password: string
    company_name?: string
  }) => Promise<{ user: AuthUser; needsEmailConfirmation: boolean }>
  logout: () => Promise<void>
  forgotPassword: (email: string) => Promise<void>
  /** Completes a password reset. Must be called while the recovery session from the emailed link is active. */
  resetPassword: (newPassword: string) => Promise<void>
  updateProfile: (patch: Partial<Pick<AuthUser, 'name' | 'company_name'>>) => Promise<AuthUser>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    name: (user.user_metadata?.full_name as string | undefined) ?? '',
    email: user.email ?? '',
    company_name: (user.user_metadata?.company_name as string | undefined) ?? '',
    created_date: user.created_at,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ? toAuthUser(session.user) : null)
      setIsLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
      setUser(session?.user ? toAuthUser(session.user) : null)
      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function login(email: string, password: string): Promise<AuthUser> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
    const authUser = toAuthUser(data.user)
    setUser(authUser)
    return authUser
  }

  async function register(input: {
    name: string
    email: string
    password: string
    company_name?: string
  }): Promise<{ user: AuthUser; needsEmailConfirmation: boolean }> {
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: { full_name: input.name, company_name: input.company_name ?? '' },
      },
    })
    if (error) throw new Error(error.message)
    if (!data.user) throw new Error('Registration failed — please try again.')

    const authUser = toAuthUser(data.user)
    // If email confirmations are enabled on the Supabase project, signUp succeeds
    // but returns no session until the user clicks the confirmation link.
    if (data.session) {
      setUser(authUser)
    }
    return { user: authUser, needsEmailConfirmation: !data.session }
  }

  async function logout(): Promise<void> {
    await supabase.auth.signOut()
    setUser(null)
  }

  async function forgotPassword(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) throw new Error(error.message)
  }

  async function resetPassword(newPassword: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw new Error(error.message)
  }

  async function updateProfile(patch: Partial<Pick<AuthUser, 'name' | 'company_name'>>): Promise<AuthUser> {
    const metadataPatch: Record<string, string> = {}
    if (patch.name !== undefined) metadataPatch.full_name = patch.name
    if (patch.company_name !== undefined) metadataPatch.company_name = patch.company_name

    const { data, error } = await supabase.auth.updateUser({ data: metadataPatch })
    if (error) throw new Error(error.message)
    const authUser = toAuthUser(data.user)
    setUser(authUser)
    return authUser
  }

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, register, logout, forgotPassword, resetPassword, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
