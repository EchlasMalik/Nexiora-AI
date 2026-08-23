import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { isSameDay } from 'date-fns'
import { AlertTriangle, Calendar, Check, CheckCheck, Clock, Plus, X } from 'lucide-react'
import { useOrg } from '@/contexts/OrgContext'
import { AppointmentRepo, type Appointment, type AppointmentStatus } from '@/entities'
import { sendAppointmentConfirmation } from '@/lib/email'
import { CONFLICT_BUFFER_MINUTES, findConflict } from '@/lib/appointmentConflicts'
import { DashboardLayout } from '@/components/DashboardLayout'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { AppointmentCalendar } from '@/components/appointments/AppointmentCalendar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const statusConfig: Record<AppointmentStatus, { label: string; icon: typeof Clock; classes: string }> = {
  pending: { label: 'Pending', icon: Clock, classes: 'bg-amber-50 text-amber-700' },
  confirmed: { label: 'Confirmed', icon: Check, classes: 'bg-emerald-50 text-emerald-700' },
  completed: { label: 'Completed', icon: CheckCheck, classes: 'bg-violet-50 text-violet-700' },
  cancelled: { label: 'Cancelled', icon: X, classes: 'bg-red-50 text-red-700' },
}

function formatDateSquare(scheduledAt: string) {
  if (!scheduledAt) return { month: '—', day: '—' }
  const date = new Date(scheduledAt)
  if (Number.isNaN(date.getTime())) return { month: '—', day: '—' }
  return {
    month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    day: String(date.getDate()),
  }
}

function formatTime(scheduledAt: string) {
  if (!scheduledAt) return 'No time set'
  const date = new Date(scheduledAt)
  if (Number.isNaN(date.getTime())) return 'No time set'
  return date.toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })
}

type AppointmentTab = 'booked' | 'pending' | 'cancelled'

const APPOINTMENT_TABS: { key: AppointmentTab; label: string }[] = [
  { key: 'booked', label: 'Booked' },
  { key: 'pending', label: 'Pending' },
  { key: 'cancelled', label: 'Cancelled' },
]

function matchesTab(appointment: Appointment, tab: AppointmentTab): boolean {
  if (tab === 'booked') return appointment.status === 'confirmed' || appointment.status === 'completed'
  if (tab === 'pending') return appointment.status === 'pending'
  return appointment.status === 'cancelled'
}

export default function Appointments() {
  const { orgId } = useOrg()
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [notes, setNotes] = useState('')
  const [conflict, setConflict] = useState<Appointment | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [activeTab, setActiveTab] = useState<AppointmentTab>('booked')

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['appointments', orgId],
    queryFn: () => AppointmentRepo.list(orgId!),
    enabled: !!orgId,
  })

  const sortedAppointments = useMemo(
    () =>
      [...appointments].sort((a, b) => {
        if (!a.scheduled_at) return 1
        if (!b.scheduled_at) return -1
        return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
      }),
    [appointments]
  )

  const visibleAppointments = useMemo(
    () =>
      sortedAppointments.filter(
        (appt) =>
          matchesTab(appt, activeTab) &&
          (!selectedDate || (appt.scheduled_at && isSameDay(new Date(appt.scheduled_at), selectedDate)))
      ),
    [sortedAppointments, activeTab, selectedDate]
  )

  const createMutation = useMutation({
    mutationFn: () =>
      AppointmentRepo.create(orgId!, {
        chatbot_id: 'manual',
        contact_name: contactName.trim(),
        contact_email: contactEmail.trim(),
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : '',
        notes,
        status: 'confirmed',
        source: 'manual',
      }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['appointments', orgId] })
      setContactName('')
      setContactEmail('')
      setScheduledAt('')
      setNotes('')
      setConflict(null)
      setFormOpen(false)

      if (created.contact_email) {
        sendAppointmentConfirmation(created.id).catch(() => {
          toast.error("Appointment saved, but the confirmation email couldn't be sent.")
        })
      }
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppointmentStatus }) =>
      AppointmentRepo.update(orgId!, id, { status }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['appointments', orgId] })

      // Only appointments created pending (e.g. from the widget) reach this —
      // the manual-create flow above already sends its own email immediately
      // since it's created 'confirmed' from the start.
      if (updated.status === 'confirmed' && updated.contact_email) {
        sendAppointmentConfirmation(updated.id).catch(() => {
          toast.error("Status updated, but the confirmation email couldn't be sent.")
        })
      }
    },
  })

  function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!contactName.trim()) return

    if (scheduledAt) {
      const candidateIso = new Date(scheduledAt).toISOString()
      // First submit surfaces the conflict instead of booking; a second
      // submit (with the same conflict still showing) proceeds anyway —
      // double-booking is sometimes intentional (overlapping quick calls),
      // it just shouldn't happen by accident.
      if (!conflict) {
        const found = findConflict(appointments, candidateIso)
        if (found) {
          setConflict(found)
          return
        }
      }
    }

    createMutation.mutate()
  }

  return (
    <DashboardLayout>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">
            Appointments <span className="text-brand-text-secondary">({appointments.length})</span>
          </h1>
          <p className="mt-1 text-sm text-brand-text-secondary">Bookings scheduled through your chatbots.</p>
        </div>
        <Button onClick={() => setFormOpen((v) => !v)} className="gap-1.5">
          {formOpen ? <X className="size-4" /> : <Plus className="size-4" />}
          {formOpen ? 'Cancel' : 'New appointment'}
        </Button>
      </div>

      {formOpen && (
        <Card className="mb-6">
          <CardContent>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="appt-name">Contact name</Label>
                  <Input
                    id="appt-name"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="e.g. Jordan Blake"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="appt-email">Email</Label>
                  <Input
                    id="appt-email"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="jordan@example.com"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="appt-datetime">Date &amp; time</Label>
                <Input
                  id="appt-datetime"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => {
                    setScheduledAt(e.target.value)
                    setConflict(null)
                  }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="appt-notes">Notes</Label>
                <Textarea
                  id="appt-notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Anything the team should know before this meeting…"
                />
              </div>

              {conflict && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <span>
                    This is within {CONFLICT_BUFFER_MINUTES} minutes of an existing appointment with{' '}
                    <strong>{conflict.contact_name || 'another contact'}</strong> ({formatTime(conflict.scheduled_at)}
                    ). Submit again to book anyway.
                  </span>
                </div>
              )}

              <Button type="submit" disabled={!contactName.trim() || createMutation.isPending} className="self-start">
                {createMutation.isPending ? 'Creating…' : conflict ? 'Book anyway' : 'Create appointment'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-24">
          <LoadingSpinner />
        </div>
      ) : appointments.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-white py-20 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
            <Calendar className="size-6" />
          </div>
          <p className="max-w-sm text-sm text-brand-text-secondary">
            No appointments yet. Bookings from your chatbots will show up here.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[22rem_1fr] lg:items-start">
          <AppointmentCalendar appointments={appointments} selectedDate={selectedDate} onSelectDate={setSelectedDate} />

          <Card className="flex h-112 flex-col overflow-hidden">
            <CardContent className="flex h-full min-h-0 flex-1 flex-col gap-3">
              <div className="flex shrink-0 gap-1 rounded-lg border border-border p-0.5 self-start">
                {APPOINTMENT_TABS.map((t) => (
                  <Button
                    key={t.key}
                    type="button"
                    variant={activeTab === t.key ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveTab(t.key)}
                  >
                    {t.label}
                  </Button>
                ))}
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                {visibleAppointments.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                    <p className="text-sm text-brand-text-secondary">
                      {selectedDate ? 'No matching appointments on this day.' : 'Nothing here yet.'}
                    </p>
                  </div>
                ) : (
                  visibleAppointments.map((appt) => (
                    <AppointmentRow
                      key={appt.id}
                      appointment={appt}
                      onStatusChange={(status) => {
                        if (status === 'confirmed' && appt.scheduled_at) {
                          const found = findConflict(appointments, appt.scheduled_at, appt.id)
                          if (found) {
                            toast.warning(
                              `Heads up — this overlaps with your appointment with ${found.contact_name || 'another contact'} around the same time.`
                            )
                          }
                        }
                        updateStatusMutation.mutate({ id: appt.id, status })
                      }}
                    />
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  )
}

function AppointmentRow({
  appointment,
  onStatusChange,
}: {
  appointment: Appointment
  onStatusChange: (status: AppointmentStatus) => void
}) {
  const { month, day } = formatDateSquare(appointment.scheduled_at)
  const status = statusConfig[appointment.status]
  const StatusIcon = status.icon

  return (
    <Card>
      <CardContent className="flex items-start gap-4">
        <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-xl bg-violet-50 text-violet-700">
          <span className="text-[10px] font-semibold tracking-wide">{month}</span>
          <span className="text-lg leading-none font-bold">{day}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold text-brand-navy">{appointment.contact_name || 'Unknown'}</p>
            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
                status.classes
              )}
            >
              <StatusIcon className="size-3.5" />
              {status.label}
            </span>
          </div>
          <p className="mt-0.5 truncate text-sm text-brand-text-secondary">
            {formatTime(appointment.scheduled_at)}
            {appointment.contact_email && ` · ${appointment.contact_email}`}
          </p>
          {appointment.notes && <p className="mt-1 text-sm text-brand-text-secondary">{appointment.notes}</p>}

          <div className="mt-2 flex gap-4">
            {appointment.status === 'pending' && (
              <button
                onClick={() => onStatusChange('confirmed')}
                className="text-sm font-medium text-violet-600 hover:underline"
              >
                Confirm
              </button>
            )}
            {(appointment.status === 'pending' || appointment.status === 'confirmed') && (
              <button
                onClick={() => onStatusChange('cancelled')}
                className="text-sm font-medium text-brand-text-secondary hover:text-destructive hover:underline"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
