// Nexiora AI — send-appointment-confirmation Edge Function (Phase: Polish)
//
// Authenticated. Given an appointment id, verifies the caller belongs to the
// org that owns it, then emails the contact a confirmation via Resend.
// Fetching the appointment/org server-side (instead of trusting a
// client-supplied name/time/email) means the email always reflects what was
// actually persisted, not whatever the browser happened to have in state.
//
// Deploy with: npx supabase functions deploy send-appointment-confirmation
// Secret:      npx supabase secrets set RESEND_API_KEY=re_...
//              (optional) RESEND_FROM_EMAIL="Your Brand <noreply@yourdomain.com>"

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { sendEmail } from '../_shared/email.ts'
import { buildAppointmentConfirmationEmail } from '../_shared/appointmentEmail.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonError('Missing authorization', 401)

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const callerClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
      error: authError,
    } = await callerClient.auth.getUser()
    if (authError || !user) return jsonError('Invalid session', 401)

    const { appointmentId } = (await req.json()) as { appointmentId?: string }
    if (!appointmentId) return jsonError('appointmentId is required', 400)

    const { data: membership } = await adminClient
      .from('memberships')
      .select('org_id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (!membership) return jsonError('No workspace found for this account', 404)

    const { data: appointment, error: appointmentError } = await adminClient
      .from('appointments')
      .select('contact_name, contact_email, scheduled_at, notes, org_id')
      .eq('id', appointmentId)
      .eq('org_id', membership.org_id)
      .maybeSingle()
    if (appointmentError || !appointment) return jsonError('Appointment not found', 404)
    if (!appointment.contact_email) return jsonError('This appointment has no contact email on file', 400)

    const { data: org } = await adminClient.from('orgs').select('name').eq('id', membership.org_id).maybeSingle()
    const orgName = org?.name || 'Nexiora AI'

    const { subject, html } = buildAppointmentConfirmationEmail({
      contactName: appointment.contact_name,
      orgName,
      scheduledAt: appointment.scheduled_at,
      notes: appointment.notes,
    })

    await sendEmail({ to: appointment.contact_email, subject, html })

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return jsonError(err instanceof Error ? err.message : 'Internal error', 500)
  }
})
