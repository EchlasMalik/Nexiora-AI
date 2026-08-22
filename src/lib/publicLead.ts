import { getVisitorSessionId } from './publicAi'

export interface CaptureLeadInput {
  chatbotId: string
  name: string
  email: string
  phone: string
  requirements: string
}

export type CaptureLeadResult = { ok: true } | { ok: false; error: string }

/**
 * Captures a visitor's contact details via the anonymous `public-capture-lead`
 * Edge Function — the widget's native "Leave your details" form, no AI
 * parsing involved. Fails soft with a user-facing message on any error, same
 * convention as `bookAppointment`/`streamPublicChatbotReply`.
 */
export async function captureLead(input: CaptureLeadInput): Promise<CaptureLeadResult> {
  try {
    const functionsUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-capture-lead`
    const response = await fetch(functionsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        chatbotId: input.chatbotId,
        sessionId: getVisitorSessionId(),
        name: input.name,
        email: input.email,
        phone: input.phone,
        requirements: input.requirements,
      }),
    })

    if (response.status === 429) {
      const body = await response.json().catch(() => ({}) as { error?: string })
      return { ok: false, error: body.error || 'Too many attempts — please try again later.' }
    }
    if (!response.ok) {
      const body = await response.json().catch(() => ({}) as { error?: string })
      return { ok: false, error: body.error || "Couldn't send your details — please try again." }
    }
    return { ok: true }
  } catch {
    return { ok: false, error: "Couldn't send your details — please try again." }
  }
}
