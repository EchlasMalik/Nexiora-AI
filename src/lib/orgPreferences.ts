import { supabase } from './supabase'

/**
 * Server-readable notification settings for an org — moved here from
 * `src/lib/preferences.ts`'s localStorage-only blob so Edge Functions can
 * actually check them (see `notifyOrgOwner` in
 * supabase/functions/_shared/ownerNotification.ts). `orgs` isn't one of the
 * `createRepository`-wrapped entities (it has no `org_id` column to filter by
 * — it *is* the tenant root), so this is a small dedicated helper instead.
 */
export interface OrgNotificationSettings {
  notification_email: string
  notify_new_lead: boolean
  notify_appointment: boolean
  notify_escalation: boolean
  notify_weekly_summary: boolean
}

const DEFAULT_ORG_NOTIFICATION_SETTINGS: OrgNotificationSettings = {
  notification_email: '',
  notify_new_lead: true,
  notify_appointment: true,
  notify_escalation: true,
  notify_weekly_summary: false,
}

export async function getOrgNotificationSettings(orgId: string): Promise<OrgNotificationSettings> {
  const { data, error } = await supabase
    .from('orgs')
    .select('notification_email, notify_new_lead, notify_appointment, notify_escalation, notify_weekly_summary')
    .eq('id', orgId)
    .maybeSingle()
  if (error || !data) return DEFAULT_ORG_NOTIFICATION_SETTINGS
  return data as OrgNotificationSettings
}

export async function updateOrgNotificationSettings(
  orgId: string,
  patch: Partial<OrgNotificationSettings>
): Promise<void> {
  const { error } = await supabase.from('orgs').update(patch).eq('id', orgId)
  if (error) throw new Error(error.message)
}
