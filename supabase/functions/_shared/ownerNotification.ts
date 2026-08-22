// Nexiora AI — owner notification emails
//
// Fires an email to the business (not the visitor) when a new lead or
// appointment comes in through the widget, gated on the org's own
// notify_new_lead / notify_appointment settings. Those settings live on
// `orgs` (added in 0012_owner_notifications_and_leads.sql) — server-readable,
// unlike the Settings page's old localStorage-only toggles that could never
// actually be checked from here.
//
// Recipient resolution: an explicit `notification_email` override if the org
// set one, otherwise the org's owner-role member's login email — looked up
// via the Auth admin API, since that's the only place an email address for
// an arbitrary user id lives.

import { sendEmail } from './email.ts'

// deno-lint-ignore no-explicit-any
type AdminClient = any

export interface NotifyOrgOwnerInput {
  orgId: string
  kind: 'new_lead' | 'new_appointment'
  contactName: string
  /** e.g. "Requested for Tuesday, August 12 at 2:00 PM" or "Message: ..." */
  detailLine: string
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;'
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '"':
        return '&quot;'
      default:
        return '&#39;'
    }
  })
}

async function resolveRecipient(adminClient: AdminClient, orgId: string, notificationEmail: string): Promise<string> {
  if (notificationEmail) return notificationEmail

  const { data: owner } = await adminClient
    .from('memberships')
    .select('user_id')
    .eq('org_id', orgId)
    .eq('role', 'owner')
    .maybeSingle()
  if (!owner) return ''

  const { data } = await adminClient.auth.admin.getUserById(owner.user_id)
  return data?.user?.email ?? ''
}

/** No-ops silently if the relevant notify_* flag is off, or no recipient can be resolved. */
export async function notifyOrgOwner(adminClient: AdminClient, input: NotifyOrgOwnerInput): Promise<void> {
  const { data: org } = await adminClient
    .from('orgs')
    .select('name, notification_email, notify_new_lead, notify_appointment')
    .eq('id', input.orgId)
    .maybeSingle()
  if (!org) return

  const enabled = input.kind === 'new_lead' ? org.notify_new_lead : org.notify_appointment
  if (!enabled) return

  const recipient = await resolveRecipient(adminClient, input.orgId, org.notification_email)
  if (!recipient) return

  const orgName = org.name || 'your workspace'
  const safeContactName = escapeHtml(input.contactName || 'A visitor')
  const safeDetailLine = escapeHtml(input.detailLine)
  const heading = input.kind === 'new_lead' ? 'New lead' : 'New appointment request'
  const subject =
    input.kind === 'new_lead' ? `New lead: ${input.contactName || 'A visitor'}` : `New appointment request: ${input.contactName || 'A visitor'}`

  await sendEmail({
    to: recipient,
    subject,
    html: `
      <div style="font-family: -apple-system, Segoe UI, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1d4ed8;">${heading}</h2>
        <p><strong>${safeContactName}</strong> reached out through your ${escapeHtml(orgName)} chatbot.</p>
        <p style="font-size: 15px; padding: 12px 16px; background: #eff6ff; border-radius: 8px;">
          ${safeDetailLine}
        </p>
        <p style="color: #64748b; font-size: 13px; margin-top: 24px;">Sent by Nexiora AI on behalf of ${escapeHtml(orgName)}.</p>
      </div>
    `,
  })
}
