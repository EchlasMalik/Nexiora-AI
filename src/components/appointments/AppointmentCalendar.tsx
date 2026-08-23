import { useMemo, useState } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Appointment } from '@/entities'

interface AppointmentCalendarProps {
  appointments: Appointment[]
  selectedDate: Date | null
  onSelectDate: (date: Date | null) => void
}

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

/** Month grid showing an appointment count per day — click a day to filter the list below it, click again to clear. */
export function AppointmentCalendar({ appointments, selectedDate, onSelectDate }: AppointmentCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => new Date())

  const countsByDay = useMemo(() => {
    const counts = new Map<string, number>()
    for (const appt of appointments) {
      if (!appt.scheduled_at) continue
      const date = new Date(appt.scheduled_at)
      if (Number.isNaN(date.getTime())) continue
      const key = format(date, 'yyyy-MM-dd')
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return counts
  }, [appointments])

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth))
    const end = endOfWeek(endOfMonth(currentMonth))
    return eachDayOfInterval({ start, end })
  }, [currentMonth])

  const selectedKey = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null

  function handleDayClick(day: Date) {
    const key = format(day, 'yyyy-MM-dd')
    onSelectDate(key === selectedKey ? null : day)
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-brand-navy">{format(currentMonth, 'MMMM yyyy')}</p>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>
            Today
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-brand-text-secondary">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="py-1">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const count = countsByDay.get(key) ?? 0
          const inCurrentMonth = isSameMonth(day, currentMonth)
          const isSelected = key === selectedKey

          return (
            <button
              key={key}
              type="button"
              onClick={() => handleDayClick(day)}
              className={cn(
                'flex aspect-square cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg text-sm transition-colors',
                inCurrentMonth ? 'text-brand-navy' : 'text-brand-text-secondary/40',
                isSelected ? 'bg-violet-600 text-white' : 'hover:bg-slate-50',
                isToday(day) && !isSelected && 'font-semibold text-violet-700'
              )}
            >
              <span>{format(day, 'd')}</span>
              {count > 0 && (
                <span
                  className={cn(
                    'flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-medium',
                    isSelected ? 'bg-white/25 text-white' : 'bg-violet-50 text-violet-700'
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
