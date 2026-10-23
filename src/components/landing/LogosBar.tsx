import { BadgeCheck, Clock, Globe2, Lock, MessagesSquare, Zap, CalendarCheck, Code2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const badges = [
  { icon: Zap, label: 'Advanced conversational AI' },
  { icon: Lock, label: 'Isolated, private data per account' },
  { icon: Globe2, label: 'Replies in your visitor’s language' },
  { icon: BadgeCheck, label: 'GDPR-ready export & deletion' },
  { icon: Clock, label: 'Online 24/7, 365 days a year' },
  { icon: CalendarCheck, label: 'Books meetings in-chat' },
  { icon: Code2, label: 'One-line install' },
  { icon: MessagesSquare, label: 'Human handoff with full context' },
]

function Row({ hidden = false }: { hidden?: boolean }) {
  return (
    <ul
      className={cn(
        'flex shrink-0 items-center gap-10 pr-10 motion-reduce:w-full motion-reduce:flex-wrap motion-reduce:justify-center motion-reduce:gap-y-3 motion-reduce:px-6',
        hidden && 'motion-reduce:hidden'
      )}
      aria-hidden={hidden || undefined}
    >
      {badges.map(({ icon: Icon, label }) => (
        <li key={label} className="flex items-center gap-2 text-sm font-medium whitespace-nowrap text-brand-text-secondary">
          <Icon className="size-4 text-violet-600" />
          {label}
        </li>
      ))}
    </ul>
  )
}

export function LogosBar() {
  return (
    <section aria-label="Platform highlights" className="border-y border-border/70 bg-white/60 py-6">
      {/* Two identical rows translated by -50% loop seamlessly. */}
      <div className="mask-fade-x group flex overflow-hidden">
        <div className="animate-marquee flex w-max group-hover:paused motion-reduce:w-full">
          <Row />
          <Row hidden />
        </div>
      </div>
    </section>
  )
}
