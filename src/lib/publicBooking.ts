import { getVisitorSessionId } from './publicAi'

export interface BookAppointmentInput {
  chatbotId: string
  contactName: string
  contactEmail: string
  contactPhone: string
  /** ISO timestamp — convert from the datetime-local input value before calling. */
  scheduledAt: string
  timezone: string
  notes: string
}

export type BookAppointmentResult = { ok: true } | { ok: false; error: string }

/**
 * Books an appointment via the anonymous `public-book-appointment` Edge
 * Function — the widget's native booking form, no AI parsing involved.
 * Fails soft with a user-facing message on any error, same convention as
 * `streamPublicChatbotReply`.
 */
export async function bookAppointment(input: BookAppointmentInput): Promise<BookAppointmentResult> {
  try {
    const functionsUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-book-appointment`
    const response = await fetch(functionsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        chatbotId: input.chatbotId,
        sessionId: getVisitorSessionId(),
        contactName: input.contactName,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
        scheduledAt: input.scheduledAt,
        timezone: input.timezone,
        notes: input.notes,
      }),
    })

    if (response.status === 429) {
      const body = await response.json().catch(() => ({}) as { error?: string })
      return { ok: false, error: body.error || 'Too many booking attempts — please try again later.' }
    }
    if (!response.ok) {
      const body = await response.json().catch(() => ({}) as { error?: string })
      return { ok: false, error: body.error || "Couldn't book this appointment — please try again." }
    }
    return { ok: true }
  } catch {
    return { ok: false, error: "Couldn't book this appointment — please try again." }
  }
}
