import { supabase } from './supabase'

/**
 * Server-readable org-level settings — started as just notification
 * toggles (moved here from `src/lib/preferences.ts`'s localStorage-only blob
 * so Edge Functions can actually check them, see `notifyOrgOwner` in
 * supabase/functions/_shared/ownerNotification.ts), and grew to include
 * `average_deal_value` (drives the dashboard's ROI pipeline estimate) since
 * both are simple durable per-org settings. `orgs` isn't one of the
 * `createRepository`-wrapped entities (it has no `org_id` column to filter by
 * — it *is* the tenant root), so this is a small dedicated helper instead.
 */
export interface OrgSettings {
  notification_email: string
  notify_new_lead: boolean
  notify_appointment: boolean
  notify_escalation: boolean
  notify_weekly_summary: boolean
  average_deal_value: number
}

const DEFAULT_ORG_SETTINGS: OrgSettings = {
  notification_email: '',
  notify_new_lead: true,
  notify_appointment: true,
  notify_escalation: true,
  notify_weekly_summary: false,
  average_deal_value: 0,
}

export async function getOrgSettings(orgId: string): Promise<OrgSettings> {
  const { data, error } = await supabase
    .from('orgs')
    .select(
      'notification_email, notify_new_lead, notify_appointment, notify_escalation, notify_weekly_summary, average_deal_value'
    )
    .eq('id', orgId)
    .maybeSingle()
  if (error || !data) return DEFAULT_ORG_SETTINGS
  return data as OrgSettings
}

export async function updateOrgSettings(orgId: string, patch: Partial<OrgSettings>): Promise<void> {
  const { error } = await supabase.from('orgs').update(patch).eq('id', orgId)
  if (error) throw new Error(error.message)
}
