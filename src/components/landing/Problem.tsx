import { ArrowDown, Clock3, MessageCircleOff, UserX, CalendarX2 } from 'lucide-react'
import { Reveal, SectionHeading, Accent } from './Reveal'

const problems = [
  {
    icon: Clock3,
    title: 'Visitors show up after hours',
    description:
      'Most traffic doesn’t arrive 9-to-5. By the time someone reads the form submission, the visitor has already moved on to a competitor.',
  },
  {
    icon: MessageCircleOff,
    title: 'Response times are too slow',
    description:
      'A contact form sits in an inbox until someone has time. The visitor who wanted an answer right now is long gone.',
  },
  {
    icon: UserX,
    title: 'Sales time goes to the wrong leads',
    description:
      'With no qualification up front, your team chases enquiries that were never going to convert instead of the ones that matter.',
  },
  {
    icon: CalendarX2,
    title: 'Booking a call takes too many steps',
    description:
      'Back-and-forth emails to find a time kill momentum — and momentum is what turns an enquiry into a booked appointment.',
  },
]

export function Problem() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading
            align="left"
            eyebrow="The problem"
            title={
              <>
                Most visitors leave before you ever <Accent>talk</Accent> to them
              </>
            }
            description="Every one of them is a lead you already paid to attract — lost for reasons that have nothing to do with whether they wanted what you sell."
          />
          <Reveal delay={0.1}>
            <a
              href="#features"
              className="group mt-8 inline-flex items-center gap-2 text-sm font-semibold text-violet-700"
            >
              See how Nexiora fixes all four
              <ArrowDown className="size-4 transition-transform duration-200 ease-out group-hover:translate-y-0.5" />
            </a>
          </Reveal>
        </div>

        <ol className="divide-y divide-border/80 border-y border-border/80">
          {problems.map((problem, i) => (
            <Reveal as="li" key={problem.title} delay={i * 0.06} className="flex gap-5 py-7">
              <span className="w-6 shrink-0 pt-0.5 font-mono text-xs text-slate-400 tabular-nums">
                0{i + 1}
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2.5">
                  <problem.icon className="size-4.5 text-rose-500" />
                  <h3 className="font-semibold text-brand-navy">{problem.title}</h3>
                </div>
                <p className="mt-2 text-[15px] leading-relaxed text-brand-text-secondary">{problem.description}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  )
}
