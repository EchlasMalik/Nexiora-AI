import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthContext'

interface OrgContextValue {
  /** The current user's org id — the tenant boundary every entity query is scoped by. */
  orgId: string | null
  orgName: string | null
  isLoading: boolean
}

const OrgContext = createContext<OrgContextValue | undefined>(undefined)

interface MembershipRow {
  org_id: string
  orgs: { name: string } | { name: string }[] | null
}

export function OrgProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [orgId, setOrgId] = useState<string | null>(null)
  const [orgName, setOrgName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadOrg() {
      if (!user) {
        setOrgId(null)
        setOrgName(null)
        setIsLoading(false)
        return
      }
      setIsLoading(true)
      // Every user gets exactly one org today (auto-created on signup by the
      // `handle_new_user` DB trigger). Team invites / org switching land later.
      const { data, error } = await supabase
        .from('memberships')
        .select('org_id, orgs(name)')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle<MembershipRow>()

      if (cancelled) return
      if (error || !data) {
        setOrgId(null)
        setOrgName(null)
      } else {
        setOrgId(data.org_id)
        const org = Array.isArray(data.orgs) ? data.orgs[0] : data.orgs
        setOrgName(org?.name ?? null)
      }
      setIsLoading(false)
    }

    loadOrg()
    return () => {
      cancelled = true
    }
  }, [user])

  return <OrgContext.Provider value={{ orgId, orgName, isLoading }}>{children}</OrgContext.Provider>
}

export function useOrg(): OrgContextValue {
  const ctx = useContext(OrgContext)
  if (!ctx) throw new Error('useOrg must be used within an OrgProvider')
  return ctx
}
