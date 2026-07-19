import { BadgeCheck, Globe2, Lock, Zap } from 'lucide-react'

const badges = [
  { icon: Zap, label: 'Advanced conversational AI' },
  { icon: Lock, label: 'Isolated, private data per account' },
  { icon: Globe2, label: 'Replies in your visitor’s language' },
  { icon: BadgeCheck, label: 'GDPR-ready data export & deletion' },
]

export function LogosBar() {
  return (
    <section className="border-y border-border bg-slate-50 py-10">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {badges.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 text-sm font-medium text-brand-text-secondary">
              <Icon className="size-4 text-violet-600" />
              {label}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
