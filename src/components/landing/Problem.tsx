import { motion } from 'framer-motion'
import { Clock3, MessageCircleOff, UserX, CalendarX2 } from 'lucide-react'

const problems = [
  {
    icon: Clock3,
    title: 'Visitors show up after hours',
    description:
      'Most site traffic doesn’t arrive during business hours — by the time someone gets back to a form submission, the visitor has already moved on to a competitor.',
  },
  {
    icon: MessageCircleOff,
    title: 'Response times are too slow',
    description:
      'A contact form sits in an inbox until someone has time to reply. The visitor who wanted an answer right now is long gone by then.',
  },
  {
    icon: UserX,
    title: 'Sales time goes to unqualified leads',
    description:
      'Without any qualification up front, your team spends time chasing enquiries that were never going to convert, instead of the ones that matter.',
  },
  {
    icon: CalendarX2,
    title: 'Booking a call takes too many steps',
    description:
      'Back-and-forth emails to find a time that works lose momentum — and momentum is what turns an enquiry into a booked appointment.',
  },
]

export function Problem() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl lg:text-5xl">
            Most website visitors leave before you ever talk to them
          </h2>
          <p className="mt-4 text-lg text-brand-text-secondary">
            Every one of these is a lead your business already paid to attract — and lost for reasons that have
            nothing to do with whether they wanted what you sell.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2">
          {problems.map((problem, i) => (
            <motion.div
              key={problem.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="flex gap-4 rounded-2xl border border-border bg-white p-6"
            >
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <problem.icon className="size-5" />
              </div>
              <div>
                <p className="font-semibold text-brand-navy">{problem.title}</p>
                <p className="mt-1.5 text-sm text-brand-text-secondary">{problem.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
