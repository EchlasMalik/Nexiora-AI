import { Link } from 'react-router-dom'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { faqs } from '@/content/faqs'
import { Reveal, SectionHeading, Accent } from './Reveal'

export function FAQAccordion() {
  return (
    <section id="faq" className="scroll-mt-20 bg-slate-50/70 py-24 sm:py-32">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading
            align="left"
            eyebrow="FAQ"
            title={
              <>
                Questions, <Accent>answered</Accent>
              </>
            }
            description="Everything you need to know before starting your trial."
          />
          <Reveal delay={0.08}>
            <p className="mt-6 text-sm text-brand-text-secondary">
              Still unsure?{' '}
              <Link to="/register" className="font-semibold text-violet-700 underline-offset-4 hover:underline">
                Try it free for 14 days
              </Link>{' '}
              — no card needed.
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.05}>
          <Accordion type="single" collapsible className="w-full border-t border-border/80">
            {faqs.map((faq, i) => (
              <AccordionItem key={faq.question} value={`item-${i}`} className="border-border/80 last:border-b">
                <AccordionTrigger className="py-5 text-left text-base font-semibold text-brand-navy hover:text-violet-700 hover:no-underline sm:text-[17px]">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="pb-5 text-[15px] leading-relaxed text-brand-text-secondary">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  )
}
