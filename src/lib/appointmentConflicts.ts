import type { Appointment } from '@/entities'

// Two appointments within this window of each other are treated as a
// scheduling conflict — a simple, effective guard against double-booking
// without needing structured per-day availability rules yet.
export const CONFLICT_BUFFER_MINUTES = 30

export function findConflict(
  appointments: Appointment[],
  candidateIso: string,
  excludeId?: string
): Appointment | null {
  const candidate = new Date(candidateIso).getTime()
  if (Number.isNaN(candidate)) return null
  const bufferMs = CONFLICT_BUFFER_MINUTES * 60 * 1000

  return (
    appointments.find((appt) => {
      if (appt.id === excludeId) return false
      if (appt.status === 'cancelled' || appt.status === 'completed') return false
      if (!appt.scheduled_at) return false
      const existing = new Date(appt.scheduled_at).getTime()
      if (Number.isNaN(existing)) return false
      return Math.abs(existing - candidate) < bufferMs
    }) ?? null
  )
}
