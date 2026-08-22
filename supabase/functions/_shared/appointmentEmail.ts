// Nexiora AI — shared appointment email templates
//
// Used by both send-appointment-confirmation (authenticated — fires on
// manual dashboard bookings, and when an owner confirms a pending one) and
// public-book-appointment (anonymous — widget bookings, always created
// pending), so wording always matches the appointment's real status: a
// widget-sourced booking is only ever "requested" until a human confirms it,
// never auto-confirmed.

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

function formatScheduledLabel(scheduledAt: string | null): string {
  const scheduledDate = scheduledAt ? new Date(scheduledAt) : null
  return scheduledDate
    ? scheduledDate.toLocaleString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      })
    : 'To be confirmed'
}

export interface AppointmentEmailInput {
  contactName: string
  orgName: string
  scheduledAt: string | null
  notes: string
  /** Whether this appointment has actually been confirmed by the business yet. */
  status: 'pending' | 'confirmed'
}

export function buildAppointmentEmail({
  contactName,
  orgName,
  scheduledAt,
  notes,
  status,
}: AppointmentEmailInput): { subject: string; html: string } {
  const scheduledLabel = formatScheduledLabel(scheduledAt)
  const safeName = escapeHtml(contactName || 'there')
  const safeOrgName = escapeHtml(orgName)
  const safeNotes = notes ? escapeHtml(notes) : ''

  const copy =
    status === 'confirmed'
      ? {
          subject: `Your appointment with ${orgName} is confirmed`,
          heading: 'Appointment confirmed',
          intro: `Your appointment with <strong>${safeOrgName}</strong> is confirmed for:`,
        }
      : {
          subject: `Your appointment request with ${orgName} has been received`,
          heading: 'Request received',
          intro: `<strong>${safeOrgName}</strong> received your appointment request for the time below and will confirm it shortly:`,
        }

  return {
    subject: copy.subject,
    html: `
      <div style="font-family: -apple-system, Segoe UI, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1d4ed8;">${copy.heading}</h2>
        <p>Hi ${safeName},</p>
        <p>${copy.intro}</p>
        <p style="font-size: 16px; font-weight: 600; padding: 12px 16px; background: #eff6ff; border-radius: 8px;">
          ${escapeHtml(scheduledLabel)}
        </p>
        ${safeNotes ? `<p><strong>Notes:</strong> ${safeNotes}</p>` : ''}
        <p style="color: #64748b; font-size: 13px; margin-top: 24px;">Sent by ${safeOrgName} via Nexiora AI.</p>
      </div>
    `,
  }
}
