import { describe, expect, it } from 'vitest'
import { CONFLICT_BUFFER_MINUTES, findConflict } from './appointmentConflicts'
import type { Appointment } from '@/entities'

function makeAppointment(overrides: Partial<Appointment>): Appointment {
  return {
    id: 'appt-1',
    org_id: 'org-1',
    created_by: null,
    created_date: '2026-01-01T00:00:00.000Z',
    updated_date: '2026-01-01T00:00:00.000Z',
    chatbot_id: 'manual',
    conversation_id: '',
    contact_name: 'Jane Doe',
    contact_email: 'jane@example.com',
    contact_phone: '',
    scheduled_at: '2026-01-10T15:00:00.000Z',
    timezone: '',
    notes: '',
    status: 'confirmed',
    source: 'manual',
    ...overrides,
  }
}

describe('findConflict', () => {
  it('returns null when there are no other appointments', () => {
    expect(findConflict([], '2026-01-10T15:00:00.000Z')).toBeNull()
  })

  it('flags an appointment scheduled inside the buffer window', () => {
    const existing = makeAppointment({ scheduled_at: '2026-01-10T15:00:00.000Z' })
    const candidate = new Date('2026-01-10T15:00:00.000Z')
    candidate.setMinutes(candidate.getMinutes() + CONFLICT_BUFFER_MINUTES - 1)

    expect(findConflict([existing], candidate.toISOString())).toBe(existing)
  })

  it('does not flag an appointment exactly at or beyond the buffer window', () => {
    const existing = makeAppointment({ scheduled_at: '2026-01-10T15:00:00.000Z' })
    const candidate = new Date('2026-01-10T15:00:00.000Z')
    candidate.setMinutes(candidate.getMinutes() + CONFLICT_BUFFER_MINUTES)

    expect(findConflict([existing], candidate.toISOString())).toBeNull()
  })

  it('ignores cancelled and completed appointments', () => {
    const cancelled = makeAppointment({ status: 'cancelled', scheduled_at: '2026-01-10T15:00:00.000Z' })
    const completed = makeAppointment({ id: 'appt-2', status: 'completed', scheduled_at: '2026-01-10T15:05:00.000Z' })

    expect(findConflict([cancelled, completed], '2026-01-10T15:02:00.000Z')).toBeNull()
  })

  it('excludes the appointment being edited via excludeId', () => {
    const existing = makeAppointment({ id: 'appt-self', scheduled_at: '2026-01-10T15:00:00.000Z' })

    expect(findConflict([existing], '2026-01-10T15:05:00.000Z', 'appt-self')).toBeNull()
  })

  it('treats an unparsable candidate date as no conflict', () => {
    const existing = makeAppointment({})
    expect(findConflict([existing], 'not-a-real-date')).toBeNull()
  })

  it('ignores existing appointments with an unset scheduled_at', () => {
    const existing = makeAppointment({ scheduled_at: '' })
    expect(findConflict([existing], '2026-01-10T15:00:00.000Z')).toBeNull()
  })
})
