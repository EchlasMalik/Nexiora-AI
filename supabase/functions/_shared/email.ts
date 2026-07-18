// Nexiora AI — shared Resend email helper
//
// Thin wrapper around the Resend REST API. No npm/jsr SDK — same
// raw-fetch approach used for Stripe, to keep Edge Function cold starts
// small. Requires RESEND_API_KEY as an Edge Function secret; falls back to
// Resend's own unverified test sender if RESEND_FROM_EMAIL isn't set, so
// email works immediately without a custom domain being verified first.

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') ?? 'Nexiora AI <onboarding@resend.dev>'

export interface SendEmailInput {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is not configured — skipping email send to', to)
    return
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: RESEND_FROM_EMAIL, to, subject, html }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Resend request failed (${response.status}): ${body}`)
  }
}
