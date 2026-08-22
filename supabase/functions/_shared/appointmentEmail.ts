// Nexiora AI — shared appointment-confirmation email template
//
// Used by both send-appointment-confirmation (authenticated — dashboard
// manual bookings) and public-book-appointment (anonymous — widget
// bookings), so a confirmation reads identically regardless of which side
// created the appointment.

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

export interface AppointmentConfirmationInput {
  contactName: string
  orgName: string
  scheduledAt: string | null
  notes: string
}

export function buildAppointmentConfirmationEmail({
  contactName,
  orgName,
  scheduledAt,
  notes,
}: AppointmentConfirmationInput): { subject: string; html: string } {
  const scheduledDate = scheduledAt ? new Date(scheduledAt) : null
  const scheduledLabel = scheduledDate
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

  const safeName = escapeHtml(contactName || 'there')
  const safeOrgName = escapeHtml(orgName)
  const safeNotes = notes ? escapeHtml(notes) : ''

  return {
    subject: `Your appointment with ${orgName} is confirmed`,
    html: `
      <div style="font-family: -apple-system, Segoe UI, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1d4ed8;">Appointment confirmed</h2>
        <p>Hi ${safeName},</p>
        <p>Your appointment with <strong>${safeOrgName}</strong> is confirmed for:</p>
        <p style="font-size: 16px; font-weight: 600; padding: 12px 16px; background: #eff6ff; border-radius: 8px;">
          ${escapeHtml(scheduledLabel)}
        </p>
        ${safeNotes ? `<p><strong>Notes:</strong> ${safeNotes}</p>` : ''}
        <p style="color: #64748b; font-size: 13px; margin-top: 24px;">Sent by ${safeOrgName} via Nexiora AI.</p>
      </div>
    `,
  }
}
