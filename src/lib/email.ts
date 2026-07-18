import { supabase } from './supabase'

export async function sendAppointmentConfirmation(appointmentId: string): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('Not signed in')

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-appointment-confirmation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ appointmentId }),
  })

  const data = await response.json().catch(() => ({}) as { error?: string })
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`)
  }
}
