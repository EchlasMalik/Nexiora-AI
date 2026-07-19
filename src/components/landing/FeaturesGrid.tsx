import { motion } from 'framer-motion'
import { Clock, UserPlus, CalendarCheck, BookOpen, BarChart3, Users } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

const features = [
  {
    icon: Clock,
    title: '24/7 AI Conversations',
    description: 'Your chatbot never sleeps — answering questions and qualifying leads around the clock.',
  },
  {
    icon: UserPlus,
    title: 'Lead Capture',
    description: 'Automatically collect names, emails, and requirements from every conversation.',
  },
  {
    icon: CalendarCheck,
    title: 'Smart Booking',
    description: "Let visitors book meetings straight from the chat, synced to your team's calendar.",
  },
  {
    icon: BookOpen,
    title: 'Knowledge Base',
    description: 'Train your chatbot on your docs, FAQs, and website content in minutes.',
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    description: 'Track sentiment, lead score, and conversation volume across every chatbot.',
  },
  {
    icon: Users,
    title: 'Human Handoff',
    description: 'Seamlessly hand off tricky conversations to your team without losing context.',
  },
]

export function FeaturesGrid() {
  return (
    <section id="features" className="scroll-mt-20 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl lg:text-5xl">
            Everything your chatbot needs to close deals
          </h2>
          <p className="mt-4 text-lg text-brand-text-secondary">
            One platform to answer, qualify, and convert every visitor who lands on your site.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: (i % 3) * 0.1 }}
            >
              <Card className="h-full">
                <CardHeader>
                  <div className="flex size-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                    <feature.icon className="size-5" />
                  </div>
                  <CardTitle className="mt-2">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
